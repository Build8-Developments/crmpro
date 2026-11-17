import type {
  ExportCustomColumn,
  LeadExportRow,
} from '../entities/export-job.types';
import {
  LEAD_EXPORT_COLUMN_KEYS,
  LEAD_EXPORT_CSV_HEADERS,
} from '../export-jobs.constants';

export interface ExportColumn {
  key: string;
  header: string;
  kind: 'phone' | 'date' | 'text';
}

const CUSTOM_PREFIX = 'cf:';

export function buildExportColumns(
  customColumns: ExportCustomColumn[],
): ExportColumn[] {
  return [
    ...LEAD_EXPORT_COLUMN_KEYS.map((key, index) => ({
      key,
      header: LEAD_EXPORT_CSV_HEADERS[index],
      kind:
        key === 'primaryPhone' || key === 'secondaryPhone'
          ? ('phone' as const)
          : key === 'createdAt'
            ? ('date' as const)
            : ('text' as const),
    })),
    ...customColumns.map((column) => ({
      key: `${CUSTOM_PREFIX}${column.key}`,
      header: column.label,
      kind: 'text' as const,
    })),
  ];
}

export function exportCellValue(row: LeadExportRow, key: string): string {
  if (key.startsWith(CUSTOM_PREFIX)) {
    return row.customFields?.[key.slice(CUSTOM_PREFIX.length)] ?? '';
  }

  const value = row[key as keyof LeadExportRow];
  return typeof value === 'string' ? value : '';
}

/** Stored custom field value → spreadsheet text. */
export function formatCustomFieldValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (Array.isArray(value)) return value.map(String).join(', ');
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  return '';
}
