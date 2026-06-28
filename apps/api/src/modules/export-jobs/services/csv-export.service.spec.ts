import { CsvExportService } from './csv-export.service';
import { LeadExportRow } from '../entities/export-job.types';

describe('CsvExportService', () => {
  const service = new CsvExportService();

  const sampleRow: LeadExportRow = {
    leadName: 'Ahmed Hassan',
    primaryPhone: '+201012345678',
    secondaryPhone: '+201098765432',
    email: 'ahmed@example.com',
    leadSource: 'Meta Ads',
    pipeline: 'Residential Sales',
    stage: 'New Lead',
    assignedUser: 'Agent One',
    interestedProjects: 'Palm Hills New Cairo',
    status: 'OPEN',
    createdAt: '2026-06-28T00:00:00.000Z',
  };

  it('prefixes phone columns with tab for Excel text formatting', () => {
    const csv = service.generateCsv([sampleRow]).toString('utf-8');

    expect(csv).toContain('\t+201012345678');
    expect(csv).toContain('\t+201098765432');
    expect(csv.startsWith('\uFEFF')).toBe(true);
  });

  it('leaves empty secondary phone blank', () => {
    const csv = service
      .generateCsv([{ ...sampleRow, secondaryPhone: '' }])
      .toString('utf-8');

    expect(csv).toContain('\t+201012345678');
    expect(csv).not.toContain('\t\t');
  });
});
