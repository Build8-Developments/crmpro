import { BadRequestException } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import * as ExcelJS from 'exceljs';
import { TextDecoder } from 'node:util';

export type ImportFileKind = 'csv' | 'xlsx';

export interface ImportTableRow {
  /** Spreadsheet line (header is line 1) — stable across retries. */
  line: number;
  values: string[];
}

export interface ImportTable {
  headers: string[];
  rows: ImportTableRow[];
}

export const XLSX_MIME_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const CSV_MIME_TYPES = new Set([
  'text/csv',
  'application/csv',
  'text/plain',
  // Windows reports .csv as an Excel type.
  'application/vnd.ms-excel',
]);

export function detectImportFileKind(
  fileName: string,
  mimeType: string,
): ImportFileKind | null {
  const name = fileName.toLowerCase();
  const mime = mimeType.toLowerCase();

  if (name.endsWith('.xlsx') || mime === XLSX_MIME_TYPE) {
    return 'xlsx';
  }

  if (name.endsWith('.csv') || CSV_MIME_TYPES.has(mime)) {
    return 'csv';
  }

  return null;
}

/**
 * UTF-8 first; files saved by Arabic Windows Excel ("CSV" not "CSV UTF-8")
 * are Windows-1256, which would otherwise turn every Arabic name into noise.
 */
export function decodeCsvText(buffer: Buffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('windows-1256').decode(buffer);
  }
}

function isBlank(values: string[]): boolean {
  return values.every((value) => value.length === 0);
}

function formatDate(value: Date): string {
  const iso = value.toISOString();
  return iso.endsWith('T00:00:00.000Z') ? iso.slice(0, 10) : iso;
}

/** Flattens any exceljs cell value to the text a user would see. */
export function cellToString(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) ? value.toFixed(0) : String(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (value instanceof Date) {
    return formatDate(value);
  }

  if ('richText' in value && Array.isArray(value.richText)) {
    return value.richText
      .map((part) => part.text)
      .join('')
      .trim();
  }

  if ('hyperlink' in value && 'text' in value) {
    return cellToString(value.text);
  }

  if ('result' in value) {
    return cellToString(value.result);
  }

  if ('error' in value) {
    return '';
  }

  return '';
}

function toTable(records: ImportTableRow[], maxRows: number): ImportTable {
  const [headerRow, ...dataRows] = records;

  if (!headerRow || isBlank(headerRow.values)) {
    throw new BadRequestException('The file is missing a header row');
  }

  const headers = headerRow.values.map((header) => header.trim());

  // Trailing empty header cells are just formatting.
  while (headers.length > 0 && headers[headers.length - 1] === '') {
    headers.pop();
  }

  const rows = dataRows
    .map((row) => ({
      line: row.line,
      values: headers.map((_, index) => (row.values[index] ?? '').trim()),
    }))
    .filter((row) => !isBlank(row.values));

  if (rows.length > maxRows) {
    throw new BadRequestException(
      `The file has ${rows.length} rows; the limit is ${maxRows} per import`,
    );
  }

  return { headers, rows };
}

function readCsv(buffer: Buffer, maxRows: number): ImportTable {
  const content = decodeCsvText(buffer);

  if (content.replace(/^\uFEFF/, '').trim().length === 0) {
    throw new BadRequestException('The file is empty');
  }

  const lines: number[] = [];
  const records = parse(content, {
    bom: true,
    trim: true,
    relax_column_count: true,
    skip_empty_lines: true,
    on_record: (record: string[], context) => {
      lines.push(context.lines);
      return record;
    },
  });

  return toTable(
    records.map((values, index) => ({
      line: lines[index],
      values: values.map((value) => String(value ?? '')),
    })),
    maxRows,
  );
}

async function readXlsx(buffer: Buffer, maxRows: number): Promise<ImportTable> {
  // In-memory load: the exceljs 4.4 streaming reader fails on some valid
  // files, and MAX_IMPORT_ROWS keeps workbooks small.
  const workbook = new ExcelJS.Workbook();

  try {
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  } catch {
    throw new BadRequestException(
      'Could not read the Excel file. Save it as .xlsx and try again.',
    );
  }

  // Only the first worksheet is imported.
  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.actualRowCount === 0) {
    throw new BadRequestException('The file is empty');
  }

  if (worksheet.actualRowCount > maxRows + 1) {
    throw new BadRequestException(
      `The file has ${worksheet.actualRowCount - 1} rows; the limit is ${maxRows} per import`,
    );
  }

  const records: ImportTableRow[] = [];
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    const raw = Array.isArray(row.values) ? row.values : [];
    // exceljs rows are 1-based and sparse.
    const values: string[] = [];
    for (let index = 1; index < raw.length; index += 1) {
      values.push(cellToString(raw[index]));
    }
    records.push({ line: row.number, values });
  });

  return toTable(records, maxRows);
}

export async function readImportTable(
  buffer: Buffer,
  kind: ImportFileKind,
  options: { maxRows: number },
): Promise<ImportTable> {
  return kind === 'xlsx'
    ? readXlsx(buffer, options.maxRows)
    : readCsv(buffer, options.maxRows);
}
