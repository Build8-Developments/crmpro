import * as ExcelJS from 'exceljs';
import { XlsxExportService } from './xlsx-export.service';

describe('XlsxExportService', () => {
  it('writes a sheet with text phones and custom columns', async () => {
    const buffer = await new XlsxExportService().generateXlsx(
      [
        {
          leadName: 'أحمد حسن',
          primaryPhone: '01012345678',
          secondaryPhone: '',
          email: 'a@example.com',
          leadSource: 'Facebook',
          pipeline: 'Sales',
          stage: 'New',
          assignedUser: 'Agent',
          interestedProjects: 'Mivida',
          status: 'OPEN',
          createdAt: '2026-11-17T10:00:00.000Z',
          customFields: { unit_type: 'Villa' },
        },
      ],
      [{ key: 'unit_type', label: 'Unit type' }],
    );

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    const sheet = workbook.getWorksheet('Leads')!;

    expect(sheet.getRow(1).getCell(1).value).toBe('Lead Name');
    expect(sheet.getRow(1).getCell(14).value).toBe('Unit type');
    expect(sheet.getRow(2).getCell(1).value).toBe('أحمد حسن');
    // Leading zero survives because the phone is written as text.
    expect(sheet.getRow(2).getCell(2).value).toBe('01012345678');
    expect(sheet.getRow(2).getCell(11).value).toBeInstanceOf(Date);
    expect(sheet.getRow(2).getCell(14).value).toBe('Villa');
  });
});
