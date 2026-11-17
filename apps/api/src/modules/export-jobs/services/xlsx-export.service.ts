import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import type {
  ExportCustomColumn,
  LeadExportRow,
} from '../entities/export-job.types';
import { buildExportColumns, exportCellValue } from './export-columns';

@Injectable()
export class XlsxExportService {
  async generateXlsx(
    rows: LeadExportRow[],
    customColumns: ExportCustomColumn[] = [],
  ): Promise<Buffer> {
    const columns = buildExportColumns(customColumns);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'CRM Pro';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Leads', {
      views: [{ state: 'frozen', ySplit: 1 }],
    });

    sheet.columns = columns.map((column) => ({
      header: column.header,
      key: column.key,
      width: Math.min(40, Math.max(14, column.header.length + 4)),
      // Phones stay text so Excel keeps leading zeros and "+".
      style:
        column.kind === 'date'
          ? { numFmt: 'yyyy-mm-dd hh:mm' }
          : column.kind === 'phone'
            ? { numFmt: '@' }
            : {},
    }));
    sheet.getRow(1).font = { bold: true };

    for (const row of rows) {
      sheet.addRow(
        Object.fromEntries(
          columns.map((column) => {
            const value = exportCellValue(row, column.key);
            if (column.kind === 'date' && value) {
              const date = new Date(value);
              return [column.key, Number.isNaN(date.getTime()) ? value : date];
            }
            return [column.key, value];
          }),
        ),
      );
    }

    if (rows.length > 0) {
      sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: columns.length },
      };
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
