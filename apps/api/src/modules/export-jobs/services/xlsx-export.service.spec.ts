import * as ExcelJS from 'exceljs';
import { LeadExportRow } from '../entities/export-job.types';
import { LEAD_EXPORT_COLUMNS } from './export-columns';
import { XlsxExportService } from './xlsx-export.service';

const baseRow: LeadExportRow = {
  leadName: 'أحمد حسن',
  primaryPhone: '01012345678',
  secondaryPhone: '+201098765432',
  email: 'ahmed@example.com',
  leadSource: 'Facebook',
  pipeline: 'Sales',
  stage: 'New',
  assignedUser: 'Agent One',
  interestedProjects: 'Mivida',
  status: 'OPEN',
  createdAt: '2026-11-17T10:00:00.000Z',
  budgetMin: '1500000',
  budgetMax: '2500000.5',
  lastContactedAt: '',
};

const col = (header: string) =>
  LEAD_EXPORT_COLUMNS.findIndex((c) => c.header === header) + 1;

async function load(buffer: Buffer): Promise<ExcelJS.Worksheet> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = workbook.getWorksheet('Leads');
  if (!sheet) throw new Error('Leads sheet missing');
  return sheet;
}

describe('XlsxExportService', () => {
  const service = new XlsxExportService();

  it('writes a bold, frozen, filterable header with every column', async () => {
    const sheet = await load(await service.generateXlsx([baseRow]));
    const header = sheet.getRow(1);

    expect(LEAD_EXPORT_COLUMNS).toHaveLength(22);
    LEAD_EXPORT_COLUMNS.forEach((column, index) => {
      expect(header.getCell(index + 1).value).toBe(column.header);
      expect(header.getCell(index + 1).font?.bold).toBe(true);
    });

    expect(sheet.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 });
    expect(sheet.autoFilter).toBeDefined();
    expect(sheet.getColumn(col('Email')).width).toBe(30);
  });

  it('keeps phones as text with leading zero and plus', async () => {
    const sheet = await load(await service.generateXlsx([baseRow]));
    const primary = sheet.getRow(2).getCell(col('Primary Phone'));
    const secondary = sheet.getRow(2).getCell(col('Secondary Phone'));

    expect(primary.value).toBe('01012345678');
    expect(primary.type).toBe(ExcelJS.ValueType.String);
    expect(primary.numFmt).toBe('@');
    expect(secondary.value).toBe('+201098765432');
    expect(secondary.type).toBe(ExcelJS.ValueType.String);
  });

  it('writes budgets as numbers and timestamps as dates', async () => {
    const sheet = await load(await service.generateXlsx([baseRow]));
    const row = sheet.getRow(2);

    expect(row.getCell(col('Budget Min')).value).toBe(1500000);
    expect(row.getCell(col('Budget Max')).value).toBe(2500000.5);
    const createdAt = row.getCell(col('Created At')).value;
    expect(createdAt).toBeInstanceOf(Date);
    expect((createdAt as Date).toISOString()).toBe('2026-11-17T10:00:00.000Z');
    expect(row.getCell(col('Last Contacted At')).value).toBeNull();
    expect(row.getCell(col('Lead Name')).value).toBe('أحمد حسن');
  });

  it('never writes formulas and quote-prefixes formula-looking text', async () => {
    const sheet = await load(
      await service.generateXlsx([
        {
          ...baseRow,
          leadName: '=HYPERLINK("http://evil.test","x")',
          email: '@SUM(A1)',
          leadSource: '-2+3',
          pipeline: '+cmd|calc',
          primaryPhone: '=1+1',
        },
      ]),
    );
    const row = sheet.getRow(2);

    expect(row.getCell(col('Lead Name')).value).toBe(
      `'=HYPERLINK("http://evil.test","x")`,
    );
    expect(row.getCell(col('Email')).value).toBe("'@SUM(A1)");
    expect(row.getCell(col('Lead Source')).value).toBe("'-2+3");
    expect(row.getCell(col('Pipeline')).value).toBe("'+cmd|calc");
    expect(row.getCell(col('Primary Phone')).value).toBe("'=1+1");

    row.eachCell((cell) => {
      expect(cell.type).not.toBe(ExcelJS.ValueType.Formula);
    });
  });

  it('produces a valid workbook with only the header for zero rows', async () => {
    const sheet = await load(await service.generateXlsx([]));

    expect(sheet.rowCount).toBe(1);
    expect(sheet.getRow(1).getCell(1).value).toBe('Lead Name');
  });
});
