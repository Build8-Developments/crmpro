import { Injectable } from '@nestjs/common';
import { stringify } from 'csv-stringify/sync';
import { LeadExportRow } from '../entities/export-job.types';
import {
  type ExportColumn,
  LEAD_EXPORT_COLUMNS,
  toCsvCell,
} from './export-columns';

@Injectable()
export class CsvExportService {
  generateCsv(
    rows: LeadExportRow[],
    columns: readonly ExportColumn<LeadExportRow>[] = LEAD_EXPORT_COLUMNS,
  ): Buffer {
    const content = stringify([
      columns.map((column) => column.header),
      ...rows.map((row) => columns.map((column) => toCsvCell(column, row))),
    ]);

    // BOM so Excel detects UTF-8 (Arabic names).
    return Buffer.from(`\uFEFF${content}`, 'utf-8');
  }
}
