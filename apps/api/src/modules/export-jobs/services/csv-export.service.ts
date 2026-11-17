import { Injectable } from '@nestjs/common';
import { stringify } from 'csv-stringify/sync';
import type {
  ExportCustomColumn,
  LeadExportRow,
} from '../entities/export-job.types';
import { buildExportColumns, exportCellValue } from './export-columns';

/** Prefix cell values so Excel opens them as text, not scientific notation. */
function formatExcelTextCell(value: string): string {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return '';
  }

  return `\t${trimmed}`;
}

@Injectable()
export class CsvExportService {
  generateCsv(
    rows: LeadExportRow[],
    customColumns: ExportCustomColumn[] = [],
  ): Buffer {
    const columns = buildExportColumns(customColumns);

    const records = rows.map((row) =>
      columns.map((column) => {
        const value = exportCellValue(row, column.key);
        return column.kind === 'phone' ? formatExcelTextCell(value) : value;
      }),
    );

    const content = stringify([
      columns.map((column) => column.header),
      ...records,
    ]);

    return Buffer.from(`\uFEFF${content}`, 'utf-8');
  }
}
