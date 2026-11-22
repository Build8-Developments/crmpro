import type { LeadExportRow } from '../entities/export-job.types';

/**
 * How a column is written to a spreadsheet:
 * - text: always a string (formula-escaped)
 * - number: a real number in XLSX (budgets); left untouched in CSV
 * - date: a real date in XLSX; ISO-8601 string in CSV
 */
export type ExportColumnType = 'text' | 'number' | 'date';

export interface ExportColumn<Row> {
  header: string;
  type: ExportColumnType;
  /** Raw cell value from the export row ('' when empty). */
  value: (row: Row) => string;
  /**
   * Identifier-like text (phone numbers): must stay text so leading zeros and
   * "+" survive and Excel never shows them in scientific notation.
   */
  identifier?: boolean;
  /** XLSX column width, in characters. */
  width: number;
}

/**
 * Single source of truth for lead export columns (CSV and XLSX).
 * Order here is the column order in the exported file.
 */
export const LEAD_EXPORT_COLUMNS: readonly ExportColumn<LeadExportRow>[] = [
  { header: 'Lead Name', type: 'text', width: 28, value: (r) => r.leadName },
  {
    header: 'Primary Phone',
    type: 'text',
    identifier: true,
    width: 18,
    value: (r) => r.primaryPhone,
  },
  {
    header: 'Secondary Phone',
    type: 'text',
    identifier: true,
    width: 18,
    value: (r) => r.secondaryPhone,
  },
  { header: 'Email', type: 'text', width: 30, value: (r) => r.email },
  {
    header: 'Lead Source',
    type: 'text',
    width: 18,
    value: (r) => r.leadSource,
  },
  { header: 'Pipeline', type: 'text', width: 20, value: (r) => r.pipeline },
  { header: 'Stage', type: 'text', width: 18, value: (r) => r.stage },
  {
    header: 'Assigned User',
    type: 'text',
    width: 22,
    value: (r) => r.assignedUser,
  },
  {
    header: 'Interested Projects',
    type: 'text',
    width: 32,
    value: (r) => r.interestedProjects,
  },
  { header: 'Status', type: 'text', width: 12, value: (r) => r.status },
  { header: 'Created At', type: 'date', width: 18, value: (r) => r.createdAt },
  {
    header: 'Occupation',
    type: 'text',
    width: 20,
    value: (r) => r.occupation ?? '',
  },
  {
    header: 'Residence Area',
    type: 'text',
    width: 20,
    value: (r) => r.residenceArea ?? '',
  },
  {
    header: 'Payment Preference',
    type: 'text',
    width: 20,
    value: (r) => r.paymentPreference ?? '',
  },
  {
    header: 'Contact Channel',
    type: 'text',
    width: 18,
    value: (r) => r.contactChannel ?? '',
  },
  {
    header: 'Contact Time',
    type: 'text',
    width: 16,
    value: (r) => r.contactTime ?? '',
  },
  {
    header: 'Purchase Purpose',
    type: 'text',
    width: 18,
    value: (r) => r.purchasePurpose ?? '',
  },
  {
    header: 'Budget Min',
    type: 'number',
    width: 16,
    value: (r) => r.budgetMin ?? '',
  },
  {
    header: 'Budget Max',
    type: 'number',
    width: 16,
    value: (r) => r.budgetMax ?? '',
  },
  { header: 'Heat', type: 'text', width: 10, value: (r) => r.heat ?? '' },
  {
    header: 'Last Contacted At',
    type: 'date',
    width: 18,
    value: (r) => r.lastContactedAt ?? '',
  },
  {
    header: 'Lost Reason',
    type: 'text',
    width: 22,
    value: (r) => r.lostReason ?? '',
  },
];

// ---------------------------------------------------------------------------
// Formula-injection escaping
// ---------------------------------------------------------------------------

/** Leading characters that make spreadsheet apps treat a cell as a formula. */
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;

/** A phone made only of digits with an optional leading "+". */
const PLAIN_PHONE = /^\+?\d+$/;

const NUMERIC = /^-?\d+(\.\d+)?$/;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

export function needsFormulaEscape(value: string): boolean {
  return FORMULA_TRIGGER.test(value);
}

/**
 * Prefix a single quote when the value starts with = + - @, tab or CR, so
 * Excel / Sheets / LibreOffice show it as text instead of evaluating it.
 */
export function escapeFormula(value: string): string {
  return needsFormulaEscape(value) ? `'${value}` : value;
}

function isNumeric(value: string): boolean {
  return NUMERIC.test(value) && Number.isFinite(Number(value));
}

function parseIsoDate(value: string): Date | null {
  if (!ISO_DATE.test(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Identifier text (phones), with plain phones exempt from the quote. */
function escapeIdentifier(value: string): string {
  return PLAIN_PHONE.test(value) ? value : escapeFormula(value);
}

/**
 * CSV cell text. Numbers and dates pass through untouched (anything in those
 * columns that is not a real number/date is escaped as text). Plain phones keep
 * the existing tab prefix that makes Excel open them as text.
 */
export function toCsvCell<Row>(column: ExportColumn<Row>, row: Row): string {
  const raw = column.value(row);

  if (column.type === 'number') {
    return raw === '' || isNumeric(raw) ? raw : escapeFormula(raw);
  }

  if (column.type === 'date') {
    return raw === '' || parseIsoDate(raw) ? raw : escapeFormula(raw);
  }

  if (column.identifier) {
    const trimmed = raw.trim();
    if (trimmed === '') return '';
    const escaped = escapeIdentifier(trimmed);
    return escaped === trimmed ? `\t${trimmed}` : escaped;
  }

  return escapeFormula(raw);
}

export type XlsxCellValue = string | number | Date | null;

/**
 * XLSX cell value. Text is always written as a string cell (never a formula)
 * and additionally quote-prefixed when it looks like one; plain phones stay as
 * written. Numbers and dates are written as native values.
 */
export function toXlsxCell<Row>(
  column: ExportColumn<Row>,
  row: Row,
): XlsxCellValue {
  const raw = column.value(row);

  if (raw === '') return null;

  if (column.type === 'number') {
    return isNumeric(raw) ? Number(raw) : escapeFormula(raw);
  }

  if (column.type === 'date') {
    return parseIsoDate(raw) ?? escapeFormula(raw);
  }

  if (column.identifier) {
    const trimmed = raw.trim();
    return trimmed === '' ? null : escapeIdentifier(trimmed);
  }

  return escapeFormula(raw);
}
