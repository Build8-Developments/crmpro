import * as ExcelJS from 'exceljs';
import {
  decodeCsvText,
  detectImportFileType,
  readImportTable,
} from './import-table.reader';
import { assertSafeXlsxArchive } from './xlsx-archive.guard';

const LIMITS = { maxRows: 100, maxColumns: 50 };

/** "أحمد" in Windows-1256. */
const AHMED_CP1256 = [0xc3, 0xcd, 0xe3, 0xcf];

async function workbookBuffer(
  build: (sheet: ExcelJS.Worksheet) => void,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  build(workbook.addWorksheet('Leads'));
  workbook.addWorksheet('Ignored').addRow(['not', 'read']);
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

describe('detectImportFileType', () => {
  it('uses the extension, then the MIME type', () => {
    expect(detectImportFileType('leads.xlsx', '')).toBe('xlsx');
    expect(detectImportFileType('leads.csv', 'application/vnd.ms-excel')).toBe(
      'csv',
    );
    expect(detectImportFileType('leads', 'text/csv')).toBe('csv');
    expect(detectImportFileType('leads.xls', 'application/vnd.ms-excel')).toBe(
      null,
    );
  });
});

describe('CSV reading', () => {
  it('strips the UTF-8 BOM and keeps spreadsheet line numbers', async () => {
    const table = await readImportTable(
      Buffer.from(
        '\uFEFFالاسم,رقم الموبايل\n\nأحمد,01012345678\n,\nSara,01098765432\n',
        'utf-8',
      ),
      'csv',
      LIMITS,
    );

    expect(table.fileType).toBe('csv');
    expect(table.headers).toEqual(['الاسم', 'رقم الموبايل']);
    expect(table.rows).toEqual([
      { line: 3, values: ['أحمد', '01012345678'] },
      { line: 5, values: ['Sara', '01098765432'] },
    ]);
  });

  it('falls back to Windows-1256 when the bytes are not valid UTF-8', async () => {
    const buffer = Buffer.concat([
      Buffer.from('name,phone\n', 'ascii'),
      Buffer.from(AHMED_CP1256),
      Buffer.from(',01012345678\n', 'ascii'),
    ]);

    expect(decodeCsvText(buffer)).toContain('أحمد');
    const table = await readImportTable(buffer, 'csv', LIMITS);
    expect(table.rows[0].values).toEqual(['أحمد', '01012345678']);
  });

  it('detects semicolon-delimited files', async () => {
    const table = await readImportTable(
      Buffer.from('name;phone\n"Doe; Jane";01012345678\n'),
      'csv',
      LIMITS,
    );
    expect(table.rows[0].values).toEqual(['Doe; Jane', '01012345678']);
  });

  it('names blank headers and de-duplicates repeated ones', async () => {
    const table = await readImportTable(
      Buffer.from('Phone,,Phone\n1,2,3\n'),
      'csv',
      LIMITS,
    );
    expect(table.headers).toEqual(['Phone', 'Column 2', 'Phone (2)']);
  });

  it('rejects files over the row limit while parsing', async () => {
    const lines = ['name,phone'];
    for (let index = 0; index < 5; index++)
      lines.push(`n${index},0100000000${index}`);

    await expect(
      readImportTable(Buffer.from(lines.join('\n')), 'csv', {
        maxRows: 3,
        maxColumns: 10,
      }),
    ).rejects.toThrow(/more than 3 rows/);
  });

  it('rejects empty files', async () => {
    await expect(
      readImportTable(Buffer.from('\uFEFF  \n'), 'csv', LIMITS),
    ).rejects.toThrow(/empty/);
  });
});

describe('XLSX reading', () => {
  it('reads the first sheet from its first non-empty row', async () => {
    const buffer = await workbookBuffer((sheet) => {
      sheet.addRow([]);
      sheet.addRow(['الاسم', 'رقم الموبايل', 'الميزانية', 'Total', 'Date']);
      sheet.addRow([
        'أحمد',
        1012345678,
        '2.5M',
        { formula: 'B3*2', result: 42 } as ExcelJS.CellFormulaValue,
        new Date(Date.UTC(2026, 0, 5)),
      ]);
      sheet.addRow([]);
      sheet.addRow([
        { richText: [{ text: 'Sa' }, { text: 'ra' }] },
        '01098765432',
        3000000,
        { formula: 'NOW()' } as ExcelJS.CellFormulaValue,
      ]);
    });

    const table = await readImportTable(buffer, 'xlsx', LIMITS);

    expect(table.fileType).toBe('xlsx');
    expect(table.headers).toEqual([
      'الاسم',
      'رقم الموبايل',
      'الميزانية',
      'Total',
      'Date',
    ]);
    expect(table.rows).toEqual([
      {
        line: 3,
        // Formula → cached result, never evaluated.
        values: ['أحمد', '1012345678', '2.5M', '42', '2026-01-05'],
      },
      { line: 5, values: ['Sara', '01098765432', '3000000', '', ''] },
    ]);
  });

  it('sniffs a workbook uploaded with a .csv name', async () => {
    const buffer = await workbookBuffer((sheet) => {
      sheet.addRow(['name', 'phone']);
      sheet.addRow(['Jane', '01012345678']);
    });

    const table = await readImportTable(buffer, 'csv', LIMITS);
    expect(table.fileType).toBe('xlsx');
    expect(table.rows).toHaveLength(1);
  });

  it('stops parsing sheets over the row limit', async () => {
    const buffer = await workbookBuffer((sheet) => {
      sheet.addRow(['name', 'phone']);
      for (let index = 0; index < 20; index++) {
        sheet.addRow([`n${index}`, `0100000000${index}`]);
      }
    });

    await expect(
      readImportTable(buffer, 'xlsx', { maxRows: 5, maxColumns: 10 }),
    ).rejects.toThrow(/more than 5 rows/);
  });

  it('aborts inside exceljs once a sheet has far too many rows', async () => {
    // Past the empty-row slack exceljs itself stops parsing the sheet.
    const buffer = await workbookBuffer((sheet) => {
      for (let index = 0; index < 1_010; index++) sheet.addRow([`n${index}`]);
    });

    await expect(
      readImportTable(buffer, 'xlsx', { maxRows: 5, maxColumns: 10 }),
    ).rejects.toThrow(/more than 5 rows/);
  });

  it('rejects corrupt workbooks and legacy .xls files', async () => {
    await expect(
      readImportTable(Buffer.from('not a zip'), 'xlsx', LIMITS),
    ).rejects.toThrow(/Could not read the Excel file/);

    const xls = Buffer.from([
      0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0,
    ]);
    await expect(readImportTable(xls, 'csv', LIMITS)).rejects.toThrow(
      /\.xls files are not supported/,
    );
  });
});

describe('assertSafeXlsxArchive', () => {
  it('accepts a normal workbook', async () => {
    const buffer = await workbookBuffer((sheet) => sheet.addRow(['a']));
    expect(() => assertSafeXlsxArchive(buffer)).not.toThrow();
  });

  it('rejects archives whose declared size is absurd', async () => {
    const buffer = await workbookBuffer((sheet) => sheet.addRow(['a']));
    expect(() =>
      assertSafeXlsxArchive(buffer, { maxUncompressedBytes: 100 }),
    ).toThrow(/expands to too much data/);
    expect(() => assertSafeXlsxArchive(buffer, { maxEntries: 2 })).toThrow(
      /too large/,
    );
  });

  it('rejects an entry declaring a ZIP64 size', async () => {
    const buffer = await workbookBuffer((sheet) => sheet.addRow(['a']));
    const directory = buffer.indexOf(Buffer.from([0x50, 0x4b, 0x01, 0x02]));
    buffer.writeUInt32LE(0xffffffff, directory + 24);
    expect(() => assertSafeXlsxArchive(buffer)).toThrow(/too large/);
  });
});
