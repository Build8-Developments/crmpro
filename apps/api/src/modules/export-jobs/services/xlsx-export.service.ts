import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { PassThrough } from 'node:stream';
import { LeadExportRow } from '../entities/export-job.types';
import {
  type ExportColumn,
  LEAD_EXPORT_COLUMNS,
  toXlsxCell,
} from './export-columns';

const SHEET_NAME = 'Leads';
const DATE_FORMAT = 'yyyy-mm-dd hh:mm';
const INTEGER_FORMAT = '#,##0';
const DECIMAL_FORMAT = '#,##0.00';
/** Excel's "Text" number format: the cell is never parsed as a number. */
const TEXT_FORMAT = '@';

function columnNumFmt(column: ExportColumn<LeadExportRow>): string {
  switch (column.type) {
    case 'date':
      return DATE_FORMAT;
    case 'number':
      return INTEGER_FORMAT;
    default:
      return TEXT_FORMAT;
  }
}

@Injectable()
export class XlsxExportService {
  /**
   * Builds the workbook with exceljs' streaming writer: each row is serialized
   * and released as soon as it is committed, so large exports do not keep a
   * full worksheet model in memory.
   */
  async generateXlsx(
    rows: LeadExportRow[],
    columns: readonly ExportColumn<LeadExportRow>[] = LEAD_EXPORT_COLUMNS,
  ): Promise<Buffer> {
    const output = new PassThrough();
    const chunks: Buffer[] = [];
    const done = new Promise<Buffer>((resolve, reject) => {
      output.on('data', (chunk: Buffer) => chunks.push(chunk));
      output.on('end', () => resolve(Buffer.concat(chunks)));
      output.on('error', reject);
    });

    const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
      stream: output,
      useStyles: true,
      useSharedStrings: true,
    });
    workbook.creator = 'CRMPro';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet(SHEET_NAME, {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 1, topLeftCell: 'A2' }],
    });

    sheet.columns = columns.map((column) => ({
      width: column.width,
      style: { numFmt: columnNumFmt(column) },
    }));
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columns.length },
    };

    const header = sheet.addRow(columns.map((column) => column.header));
    header.font = { bold: true };
    header.commit();

    for (const row of rows) {
      const added = sheet.addRow(
        columns.map((column) => toXlsxCell(column, row)),
      );

      added.eachCell((cell) => {
        if (typeof cell.value === 'number' && !Number.isInteger(cell.value)) {
          cell.numFmt = DECIMAL_FORMAT;
        }
      });
      added.commit();
    }

    sheet.commit();
    await workbook.commit();

    return done;
  }
}
