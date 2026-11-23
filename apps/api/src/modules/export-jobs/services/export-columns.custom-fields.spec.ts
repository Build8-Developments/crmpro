import { CustomFieldType } from '@crmpro/database';
import type { LeadExportRow } from '../entities/export-job.types';
import { CsvExportService } from './csv-export.service';
import {
  buildLeadExportColumns,
  LEAD_EXPORT_COLUMNS,
  toCsvCell,
  toXlsxCell,
} from './export-columns';

const row = (customFields: Record<string, unknown>): LeadExportRow => ({
  leadName: 'Jane',
  primaryPhone: '01001112233',
  secondaryPhone: '',
  email: '',
  leadSource: '',
  pipeline: 'Sales',
  stage: 'New',
  assignedUser: '',
  interestedProjects: '',
  status: 'OPEN',
  createdAt: '2026-11-01T10:00:00.000Z',
  customFields,
});

describe('custom field export columns', () => {
  const columns = buildLeadExportColumns([
    { key: 'unit_type', label: 'Unit type', type: CustomFieldType.SELECT },
    { key: 'bedrooms', label: 'Bedrooms', type: CustomFieldType.NUMBER },
    { key: 'cash', label: 'Cash buyer', type: CustomFieldType.BOOLEAN },
    {
      key: 'amenities',
      label: 'Amenities',
      type: CustomFieldType.MULTI_SELECT,
    },
    { key: 'move_in', label: 'Move-in', type: CustomFieldType.DATE },
    { key: 'stage_note', label: 'Stage', type: CustomFieldType.TEXT },
  ]);
  const custom = columns.slice(LEAD_EXPORT_COLUMNS.length);

  it('adds one column per field after the built-in ones', () => {
    expect(custom.map((column) => column.header)).toEqual([
      'Unit type',
      'Bedrooms',
      'Cash buyer',
      'Amenities',
      'Move-in',
      // Clashes with the built-in "Stage" column.
      'Stage (stage_note)',
    ]);
  });

  it('renders stored values as cells', () => {
    const lead = row({
      unit_type: 'Villa',
      bedrooms: 3,
      cash: true,
      amenities: ['Pool', 'Gym'],
      move_in: '2027-01-15',
    });

    expect(custom.map((column) => toCsvCell(column, lead))).toEqual([
      'Villa',
      '3',
      'Yes',
      'Pool, Gym',
      '2027-01-15',
      '',
    ]);
    expect(custom.map((column) => toXlsxCell(column, lead))).toEqual([
      'Villa',
      3,
      'Yes',
      'Pool, Gym',
      '2027-01-15',
      null,
    ]);
  });

  it('formula-escapes custom text in CSV and XLSX', () => {
    const lead = row({ unit_type: '=HYPERLINK("http://evil")' });
    const [unitType] = custom;

    expect(toCsvCell(unitType, lead)).toBe(`'=HYPERLINK("http://evil")`);
    expect(toXlsxCell(unitType, lead)).toBe(`'=HYPERLINK("http://evil")`);
  });

  it('writes the custom headers into the CSV', () => {
    const csv = new CsvExportService()
      .generateCsv([row({ bedrooms: 2 })], columns)
      .toString('utf-8');

    expect(csv.split('\n')[0]).toContain('Unit type,Bedrooms,Cash buyer');
  });
});
