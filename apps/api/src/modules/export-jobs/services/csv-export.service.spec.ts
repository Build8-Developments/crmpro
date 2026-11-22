import { parse } from 'csv-parse/sync';
import { CsvExportService } from './csv-export.service';
import { LeadExportRow } from '../entities/export-job.types';
import {
  escapeFormula,
  LEAD_EXPORT_COLUMNS,
  toCsvCell,
} from './export-columns';

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
  budgetMin: '1500000',
  budgetMax: '-250.5',
};

function column(header: string) {
  const found = LEAD_EXPORT_COLUMNS.find((c) => c.header === header);
  if (!found) throw new Error(`No column ${header}`);
  return found;
}

function parseCsv(buffer: Buffer): string[][] {
  const rows: string[][] = parse(
    buffer.toString('utf-8').replace(/^\uFEFF/, ''),
  );
  return rows;
}

describe('CsvExportService', () => {
  const service = new CsvExportService();

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

  it('keeps every registry column, in order, as the header row', () => {
    const [header, row] = parseCsv(service.generateCsv([sampleRow]));

    expect(header).toEqual(LEAD_EXPORT_COLUMNS.map((c) => c.header));
    expect(header).toHaveLength(22);
    expect(row).toHaveLength(22);
    expect(row[0]).toBe('Ahmed Hassan');
    expect(row[10]).toBe('2026-06-28T00:00:00.000Z');
  });

  it('escapes formula-looking text cells with a leading quote', () => {
    const [, row] = parseCsv(
      service.generateCsv([
        {
          ...sampleRow,
          leadName: '=HYPERLINK("http://evil.test","x")',
          email: '+cmd|calc',
          leadSource: '-2+3',
          pipeline: '@SUM(A1)',
          stage: '\t=1+1',
          assignedUser: '\r=1+1',
          interestedProjects: 'Mivida, =x',
        },
      ]),
    );

    expect(row[0]).toBe(`'=HYPERLINK("http://evil.test","x")`);
    expect(row[3]).toBe("'+cmd|calc");
    expect(row[4]).toBe("'-2+3");
    expect(row[5]).toBe("'@SUM(A1)");
    expect(row[6]).toBe("'\t=1+1");
    expect(row[7]).toBe("'\r=1+1");
    // Only the first character matters.
    expect(row[8]).toBe('Mivida, =x');
  });

  it('leaves numbers and dates untouched, including negatives', () => {
    const [, row] = parseCsv(service.generateCsv([sampleRow]));

    expect(row[17]).toBe('1500000');
    expect(row[18]).toBe('-250.5');
    expect(row[10]).toBe('2026-06-28T00:00:00.000Z');
  });

  it('escapes non-phone values in phone columns instead of tab-prefixing', () => {
    const [, row] = parseCsv(
      service.generateCsv([
        { ...sampleRow, primaryPhone: '=1+1', secondaryPhone: '0101 234' },
      ]),
    );

    expect(row[1]).toBe("'=1+1");
    expect(row[2]).toBe('\t0101 234');
  });
});

describe('export column escaping', () => {
  it.each([
    ['=1+1', "'=1+1"],
    ['+1', "'+1"],
    ['-1', "'-1"],
    ['@x', "'@x"],
    ['\tx', "'\tx"],
    ['\rx', "'\rx"],
    ['plain', 'plain'],
    ['', ''],
    ["'already", "'already"],
  ])('escapeFormula(%j) → %j', (input, expected) => {
    expect(escapeFormula(input)).toBe(expected);
  });

  it('escapes junk in number and date columns as text', () => {
    const row = { ...sampleRow, budgetMin: '=1+1', createdAt: '@now' };

    expect(toCsvCell(column('Budget Min'), row)).toBe("'=1+1");
    expect(toCsvCell(column('Created At'), row)).toBe("'@now");
  });
});
