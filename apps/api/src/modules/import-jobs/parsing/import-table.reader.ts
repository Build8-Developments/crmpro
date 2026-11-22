import { BadRequestException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import * as ExcelJS from 'exceljs';
import { TextDecoder } from 'node:util';
import { assertSafeXlsxArchive } from './xlsx-archive.guard';

export type ImportFileType = 'csv' | 'xlsx';

export interface ImportTableRow {
  /** Spreadsheet line (1-based, header included) — stable across retries. */
  line: number;
  values: string[];
}

export interface ImportTable {
  /** Unique, non-empty header names (blank → "Column N", repeats → "X (2)"). */
  headers: string[];
  rows: ImportTableRow[];
}

export interface ImportTableLimits {
  /** Data rows accepted; more fails the whole file. */
  maxRows: number;
  /** Columns accepted in the header row. */
  maxColumns: number;
}

/** Formatted-but-empty <row> elements tolerated beyond the row limit. */
const XLSX_EMPTY_ROW_SLACK = 1000;
/** Cells (styled or not) one <row> may hold before parsing aborts. */
const XLSX_MAX_CELLS_PER_ROW = 2000;

export const XLSX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const CSV_MIME_TYPES = new Set([
  'text/csv',
  'application/csv',
  'text/plain',
  // Windows reports .csv as an Excel type.
  'application/vnd.ms-excel',
]);

/** Spreadsheet/document formats we recognise but cannot import. */
const UNSUPPORTED_EXTENSIONS = /\.(xls|xlsm|xlsb|ods|numbers|pdf|docx?|json)$/;

/**
 * From the stored name/MIME type; null for formats we cannot import.
 * Anything unrecognised is read as CSV (the bytes are sniffed on read).
 */
export function detectImportFileType(
  fileName: string,
  mimeType: string,
): ImportFileType | null {
  const name = fileName.trim().toLowerCase();
  const mime = mimeType.toLowerCase();

  if (name.endsWith('.xlsx') || mime === XLSX_MIME_TYPE) return 'xlsx';
  if (UNSUPPORTED_EXTENSIONS.test(name)) return null;
  if (name.endsWith('.csv') || CSV_MIME_TYPES.has(mime)) return 'csv';
  return 'csv';
}

/** The bytes win over the name: "leads.csv" that is really a workbook, etc. */
function sniffFileType(
  buffer: Buffer,
  declared: ImportFileType,
): ImportFileType {
  if (buffer.length >= 4 && buffer.readUInt32LE(0) === 0x04034b50) {
    return 'xlsx'; // "PK\x03\x04"
  }
  if (
    buffer.length >= 8 &&
    buffer.readUInt32BE(0) === 0xd0cf11e0 &&
    buffer.readUInt32BE(4) === 0xa1b11ae1
  ) {
    throw new BadRequestException(
      'Old .xls files are not supported. Save the file as .xlsx or CSV and try again.',
    );
  }
  if (declared === 'xlsx') {
    throw new BadRequestException(
      'Could not read the Excel file. Save it as .xlsx and try again.',
    );
  }
  return 'csv';
}

/**
 * UTF-8 first; files saved by Arabic Windows Excel ("CSV" rather than
 * "CSV UTF-8") are Windows-1256, which would otherwise turn every Arabic name
 * into noise.
 */
export function decodeCsvText(buffer: Buffer): string {
  let text: string;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    text = new TextDecoder('windows-1256').decode(buffer);
  }
  return text.replace(/^\uFEFF/, '');
}

/** Comma, semicolon (European/Arabic Excel locales) or tab. */
function detectDelimiter(text: string): string {
  const firstLine =
    text.split(/\r?\n/).find((line) => line.trim().length > 0) ?? '';
  const unquoted = firstLine.replace(/"[^"]*"/g, '');
  const counts = [',', ';', '\t'].map((delimiter) => ({
    delimiter,
    count: unquoted.split(delimiter).length - 1,
  }));
  const best = counts.sort((a, b) => b.count - a.count)[0];
  return best.count > 0 ? best.delimiter : ',';
}

function isBlank(values: string[]): boolean {
  return values.every((value) => value.length === 0);
}

function tooManyRows(maxRows: number): BadRequestException {
  return new BadRequestException(
    `The file has more than ${maxRows.toLocaleString('en-US')} rows. Split it into smaller files.`,
  );
}

function uniqueHeaders(raw: string[], maxColumns: number): string[] {
  const headers = raw.map((header) => header.replace(/\s+/g, ' ').trim());

  // Trailing empty header cells are just formatting.
  while (headers.length > 0 && headers[headers.length - 1] === '') {
    headers.pop();
  }

  if (headers.length === 0) {
    throw new BadRequestException('The file is missing a header row');
  }
  if (headers.length > maxColumns) {
    throw new BadRequestException(
      `The file has more than ${maxColumns} columns`,
    );
  }

  const seen = new Map<string, number>();
  return headers.map((header, index) => {
    const base = header.length > 0 ? header : `Column ${index + 1}`;
    const count = (seen.get(base.toLowerCase()) ?? 0) + 1;
    seen.set(base.toLowerCase(), count);
    return count === 1 ? base : `${base} (${count})`;
  });
}

/** First non-empty record is the header; blank data rows are dropped. */
function toTable(records: ImportTableRow[], limits: ImportTableLimits) {
  const [headerRow, ...dataRows] = records;
  if (!headerRow) {
    throw new BadRequestException('The file is empty');
  }

  const headers = uniqueHeaders(headerRow.values, limits.maxColumns);
  const rows = dataRows
    .map((row) => ({
      line: row.line,
      values: headers.map((_, index) => (row.values[index] ?? '').trim()),
    }))
    .filter((row) => !isBlank(row.values));

  if (rows.length > limits.maxRows) throw tooManyRows(limits.maxRows);

  return { headers, rows };
}

function readCsv(buffer: Buffer, limits: ImportTableLimits): ImportTable {
  const content = decodeCsvText(buffer);
  if (content.trim().length === 0) {
    throw new BadRequestException('The file is empty');
  }

  const records: ImportTableRow[] = [];
  let overLimit = false;

  try {
    parse(content, {
      delimiter: detectDelimiter(content),
      bom: true,
      trim: true,
      relax_column_count: true,
      relax_quotes: true,
      skip_empty_lines: true,
      on_record: (record: string[], context) => {
        const values = record.map((value) => String(value ?? '').trim());
        if (isBlank(values)) return null;
        // Header + maxRows data rows; stop parsing as soon as there are more.
        if (records.length > limits.maxRows) {
          overLimit = true;
          throw new Error('row limit');
        }
        records.push({ line: context.lines, values });
        return null;
      },
    });
  } catch (error) {
    if (overLimit) throw tooManyRows(limits.maxRows);
    throw new BadRequestException(
      `Could not read the CSV file: ${error instanceof Error ? error.message : 'invalid format'}`,
    );
  }

  return toTable(records, limits);
}

function formatDate(value: Date): string {
  const iso = value.toISOString();
  return iso.endsWith('T00:00:00.000Z') ? iso.slice(0, 10) : iso;
}

/**
 * Any exceljs cell value → the text a user would see. Formula cells use the
 * cached result saved with the workbook; formulas are never evaluated.
 */
export function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') {
    // Phones stored as numbers must not turn into "1.012345678e+9".
    return Number.isInteger(value) ? value.toFixed(0) : String(value);
  }
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value instanceof Date) return formatDate(value);
  if (typeof value !== 'object') return '';

  if ('richText' in value && Array.isArray(value.richText)) {
    return value.richText
      .map((part) => part.text)
      .join('')
      .trim();
  }
  if ('formula' in value || 'sharedFormula' in value) {
    return 'result' in value ? cellToString(value.result) : '';
  }
  if ('hyperlink' in value && 'text' in value) {
    return cellToString(value.text);
  }
  return '';
}

async function readXlsx(
  buffer: Buffer,
  limits: ImportTableLimits,
): Promise<ImportTable> {
  assertSafeXlsxArchive(buffer);

  // In-memory load: the exceljs 4.4 streaming reader cannot read workbooks
  // whose sheets precede workbook.xml in the archive (exceljs writes those).
  // exceljs' own maxRows/maxCols abort the sheet parser as soon as a sheet
  // has more <row>/<c> elements than that, so a huge sheet is never fully
  // materialized; the slack covers formatted-but-empty rows.
  const workbook = new ExcelJS.Workbook();
  const readOptions = {
    ignoreNodes: [
      'dataValidations',
      'conditionalFormatting',
      'drawing',
      'legacyDrawing',
      'mergeCells',
      'hyperlinks',
      'picture',
      'tableParts',
    ],
    maxRows: limits.maxRows + 1 + XLSX_EMPTY_ROW_SLACK,
    maxCols: XLSX_MAX_CELLS_PER_ROW,
  };
  try {
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer, readOptions);
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (/^Max row count/.test(message)) throw tooManyRows(limits.maxRows);
    if (/^Max column count/.test(message)) {
      throw new BadRequestException(
        `The file has more than ${limits.maxColumns} columns`,
      );
    }
    throw new BadRequestException(
      'Could not read the Excel file. Save it as .xlsx and try again.',
    );
  }

  // Only the first worksheet is imported.
  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.actualRowCount === 0) {
    throw new BadRequestException('The file is empty');
  }
  // Header + maxRows; cheap early exit before touching any row.
  if (worksheet.actualRowCount > limits.maxRows + 1) {
    throw tooManyRows(limits.maxRows);
  }

  const records: ImportTableRow[] = [];
  for (let line = 1; line <= worksheet.rowCount; line++) {
    const row = worksheet.findRow(line);
    if (!row || !row.hasValues) continue;

    const raw = Array.isArray(row.values) ? row.values : [];
    // exceljs rows are 1-based and sparse.
    const width = Math.min(raw.length, limits.maxColumns + 2);
    const values: string[] = [];
    for (let index = 1; index < width; index++) {
      values.push(cellToString(raw[index]));
    }
    if (isBlank(values)) continue;

    if (records.length > limits.maxRows) throw tooManyRows(limits.maxRows);
    records.push({ line, values });
  }

  if (records.length === 0) {
    throw new BadRequestException('The file is empty');
  }

  return toTable(records, limits);
}

/**
 * Reads the first sheet of a CSV/XLSX import into headers + rows. Callers
 * must enforce the byte size limit before downloading/calling this.
 */
export async function readImportTable(
  buffer: Buffer,
  declaredType: ImportFileType,
  limits: ImportTableLimits,
): Promise<ImportTable & { fileType: ImportFileType }> {
  const fileType = sniffFileType(buffer, declaredType);
  const table =
    fileType === 'xlsx'
      ? await readXlsx(buffer, limits)
      : readCsv(buffer, limits);
  return { ...table, fileType };
}
