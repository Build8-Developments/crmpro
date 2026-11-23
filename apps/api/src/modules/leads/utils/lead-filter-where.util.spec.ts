import { loadLeadFilterContext } from './lead-filter-where.util';

describe('loadLeadFilterContext', () => {
  const NOW = new Date('2026-11-23T10:00:00.000Z');
  let prisma: {
    tenantSettings: { findUnique: jest.Mock };
    pipelineStage: { findMany: jest.Mock };
  };

  beforeEach(() => {
    prisma = {
      tenantSettings: {
        findUnique: jest.fn().mockResolvedValue({ timezone: 'Africa/Cairo' }),
      },
      pipelineStage: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'stage-1',
            name: 'New',
            pipelineId: 'p-1',
            stuckAfterDays: 5,
            staleAfterDays: null,
            pipeline: { name: 'Sales' },
          },
        ]),
      },
    };
  });

  it('loads nothing when no filter needs it', async () => {
    await expect(
      loadLeadFilterContext(prisma as never, 't', { nextStep: 'overdue' }, NOW),
    ).resolves.toEqual({ todayBounds: undefined, stageThresholds: undefined });
    expect(prisma.tenantSettings.findUnique).not.toHaveBeenCalled();
    expect(prisma.pipelineStage.findMany).not.toHaveBeenCalled();
  });

  it("uses the tenant's day for SLA / due-today filters", async () => {
    const context = await loadLeadFilterContext(
      prisma as never,
      't',
      { slaBreached: 'today' },
      NOW,
    );
    expect(prisma.tenantSettings.findUnique).toHaveBeenCalledWith({
      where: { tenantId: 't' },
      select: { timezone: true },
    });
    // Cairo is UTC+2 in November: the local day starts at 22:00 UTC.
    expect(context.todayBounds).toEqual({
      start: new Date('2026-11-22T22:00:00.000Z'),
      end: new Date('2026-11-23T22:00:00.000Z'),
    });
  });

  it('loads stage thresholds for stuck / stage-stale filters', async () => {
    const context = await loadLeadFilterContext(
      prisma as never,
      't',
      { stuck: true },
      NOW,
    );
    expect(prisma.pipelineStage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 't', isClosed: false }),
      }),
    );
    expect(context.stageThresholds).toEqual({
      stuck: [{ id: 'stage-1', days: 5 }],
      stale: [],
    });
  });
});
