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

describe('CsvExportService custom columns', () => {
  const service = new CsvExportService();

  it('appends custom field columns after the fixed ones', () => {
    const csv = service
      .generateCsv(
        [
          {
            leadName: 'Mona',
            primaryPhone: '+201011111111',
            secondaryPhone: '',
            email: '',
            leadSource: '',
            pipeline: 'Sales',
            stage: 'New',
            assignedUser: '',
            interestedProjects: '',
            status: 'OPEN',
            createdAt: '2026-11-17T00:00:00.000Z',
            budgetMin: '1500000',
            customFields: { unit_type: 'Villa' },
          },
        ],
        [{ key: 'unit_type', label: 'Unit type' }],
      )
      .toString('utf-8');

    const [header, row] = csv.replace('﻿', '').trim().split('\n');
    expect(header.endsWith('Budget From,Budget To,Unit type')).toBe(true);
    expect(row.endsWith('1500000,,Villa')).toBe(true);
  });
});
