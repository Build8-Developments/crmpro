import { normalizeLeadExportFilters } from './lead-export-filters.util';

const U1 = '11111111-1111-4111-8111-111111111111';
const U2 = '22222222-2222-4222-8222-222222222222';

describe('normalizeLeadExportFilters', () => {
  it('keeps every leads-list filter, typed as the list reads them', () => {
    // As stored on the job (JSON): dates are strings.
    expect(
      normalizeLeadExportFilters({
        search: '  ahmed ',
        stageIds: [U1, U2],
        assignees: ['unassigned', U1],
        heat: ['HOT'],
        lastContact: 'over_2d',
        slaBreached: 'today',
        stuck: true,
        stageStale: true,
        assignedOnly: true,
        openOnly: true,
        unansweredMin: 2,
        lostReasonId: U2,
        createdFrom: '2026-11-01T00:00:00.000Z',
        createdTo: '2026-11-22T21:59:59.999Z',
        budgetMax: 5_000_000,
        paymentPreferences: ['CASH'],
        residenceArea: 'Maadi',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
    ).toEqual({
      search: 'ahmed',
      stageIds: [U1, U2],
      assignees: ['unassigned', U1],
      heat: ['HOT'],
      lastContact: 'over_2d',
      slaBreached: 'today',
      stuck: true,
      stageStale: true,
      assignedOnly: true,
      openOnly: true,
      unansweredMin: 2,
      lostReasonId: U2,
      createdFrom: new Date('2026-11-01T00:00:00.000Z'),
      createdTo: new Date('2026-11-22T21:59:59.999Z'),
      budgetMax: 5_000_000,
      paymentPreferences: ['CASH'],
      residenceArea: 'Maadi',
    });
  });

  it('reads jobs stored before every filter was supported', () => {
    expect(
      normalizeLeadExportFilters({
        pipelineId: U1,
        status: 'OPEN',
        search: 'mona',
        sortOrder: 'desc',
      }),
    ).toEqual({ pipelineId: U1, status: 'OPEN', search: 'mona' });
  });

  it('drops unknown keys, invalid values and empty values', () => {
    expect(
      normalizeLeadExportFilters({
        tenantId: U1,
        stageId: 'not-a-uuid',
        heat: [],
        lastContact: 'over_9d',
        sourceId: U2,
        occupation: '',
      }),
    ).toEqual({ sourceId: U2 });
    expect(normalizeLeadExportFilters(null)).toEqual({});
    expect(normalizeLeadExportFilters(['x'])).toEqual({});
  });
});
