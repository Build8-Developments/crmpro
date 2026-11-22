import { Injectable } from '@nestjs/common';
import { stringify } from 'csv-stringify/sync';
import { LeadExportRow } from '../entities/export-job.types';
import { LEAD_EXPORT_COLUMNS, toCsvCell } from './export-columns';

@Injectable()
export class CsvExportService {
  generateCsv(rows: LeadExportRow[]): Buffer {
    const content = stringify([
      LEAD_EXPORT_COLUMNS.map((column) => column.header),
      ...rows.map((row) =>
        LEAD_EXPORT_COLUMNS.map((column) => toCsvCell(column, row)),
      ),
    ]);

    // BOM so Excel detects UTF-8 (Arabic names).
    return Buffer.from(`\uFEFF${content}`, 'utf-8');
  }
}
