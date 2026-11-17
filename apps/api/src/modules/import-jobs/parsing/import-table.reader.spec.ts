import * as ExcelJS from 'exceljs';
import {
  decodeCsvText,
  detectImportFileKind,
  readImportTable,
} from './import-table.reader';

async function buildXlsx(rows: unknown[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Leads');
  rows.forEach((row) => sheet.addRow(row));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe('import table reader', () => {
  it('detects file kinds by extension and mime type', () => {
    expect(detectImportFileKind('leads.xlsx', '')).toBe('xlsx');
    expect(detectImportFileKind('leads.csv', 'application/vnd.ms-excel')).toBe(
      'csv',
    );
    expect(detectImportFileKind('leads.pdf', 'application/pdf')).toBeNull();
  });

  it('reads CSV with a BOM, keeps spreadsheet line numbers, drops blank rows', async () => {
    const table = await readImportTable(
      Buffer.from('﻿الاسم,رقم الموبايل\nأحمد,0100\n,\nمنى,0111\n'),
      'csv',
      { maxRows: 10 },
    );

    expect(table.headers).toEqual(['الاسم', 'رقم الموبايل']);
    expect(table.rows).toEqual([
      { line: 2, values: ['أحمد', '0100'] },
      { line: 4, values: ['منى', '0111'] },
    ]);
  });

  it('decodes Windows-1256 CSV files from Arabic Excel', () => {
    // "اسم" in Windows-1256.
    const buffer = Buffer.from([0xc7, 0xd3, 0xe3]);
    expect(decodeCsvText(buffer)).toBe('اسم');
  });

  it('reads the first worksheet of an XLSX file', async () => {
    const buffer = await buildXlsx([
      ['الاسم', 'الموبايل', 'تاريخ الزيارة'],
      ['سارة', 1012345678, new Date(Date.UTC(2026, 10, 17))],
      [{ richText: [{ text: 'Omar ' }, { text: 'Ali' }] }, '+201234', null],
    ]);

    const table = await readImportTable(buffer, 'xlsx', { maxRows: 10 });

    expect(table.headers).toEqual(['الاسم', 'الموبايل', 'تاريخ الزيارة']);
    expect(table.rows).toEqual([
      { line: 2, values: ['سارة', '1012345678', '2026-11-17'] },
      { line: 3, values: ['Omar Ali', '+201234', ''] },
    ]);
  });

  it('rejects files over the row limit', async () => {
    await expect(
      readImportTable(Buffer.from('name,phone\na,1\nb,2\nc,3'), 'csv', {
        maxRows: 2,
      }),
    ).rejects.toThrow('the limit is 2');
  });
});
