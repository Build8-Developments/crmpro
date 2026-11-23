import { Test, TestingModule } from '@nestjs/testing';
import { JobStatus, LeadStatus, PipelineCloseType } from '@crmpro/database';
import type { LeadScope } from '../../../common/auth/lead-scope/lead-scope.types';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AnalyticsQueryService } from './analytics-query.service';

const ALL: LeadScope = { kind: 'all', actorUserId: 'owner-1' };
const OWN: LeadScope = { kind: 'own', actorUserId: 'agent-1' };
const OWN_FILTER = {
  OR: [{ assignedUserId: { in: ['agent-1'] } }, { assignedUserId: null }],
};

describe('AnalyticsQueryService', () => {
  let service: AnalyticsQueryService;
  let prisma: {
    lead: {
      count: jest.Mock;
      groupBy: jest.Mock;
    };
    pipeline: {
      count: jest.Mock;
      findMany: jest.Mock;
    };
    project: { count: jest.Mock; findMany: jest.Mock };
    developer: { count: jest.Mock; findMany: jest.Mock };
    importJob: { count: jest.Mock; findMany: jest.Mock };
    exportJob: { count: jest.Mock; findMany: jest.Mock };
    leadSource: { findMany: jest.Mock };
    user: { findMany: jest.Mock };
    leadProjectInterest: { groupBy: jest.Mock };
    leadActivity: { findMany: jest.Mock };
    $queryRaw: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      lead: {
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn().mockResolvedValue([]),
      },
      pipeline: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([]),
      },
      project: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
      developer: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
      importJob: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
      exportJob: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
      leadSource: { findMany: jest.fn().mockResolvedValue([]) },
      user: { findMany: jest.fn().mockResolvedValue([]) },
      leadProjectInterest: { groupBy: jest.fn().mockResolvedValue([]) },
      leadActivity: { findMany: jest.fn().mockResolvedValue([]) },
      $queryRaw: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsQueryService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(AnalyticsQueryService);
  });

  it('scopes overview lead counts to the tenant', async () => {
    prisma.lead.count
      .mockResolvedValueOnce(100)
      .mockResolvedValueOnce(50)
      .mockResolvedValueOnce(30)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(1)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    prisma.$queryRaw
      .mockResolvedValueOnce([{ avg_hours: 4.5 }])
      .mockResolvedValueOnce([{ avg_days: 12.3 }]);

    const result = await service.getOverview('tenant-a', {}, ALL);

    expect(result.avgResponseTimeHours).toBe(4.5);
    expect(result.avgLeadAgeDays).toBe(12.3);
    expect(prisma.lead.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 'tenant-a',
          deletedAt: null,
        }),
      }),
    );
  });

  it('orders pipeline funnel stages by sortOrder', async () => {
    prisma.pipeline.findMany.mockResolvedValue([
      {
        id: 'pipeline-1',
        name: 'Residential',
        stages: [
          { id: 'stage-1', name: 'New Lead', sortOrder: 1 },
          { id: 'stage-2', name: 'Qualified', sortOrder: 2 },
        ],
      },
    ]);
    prisma.lead.groupBy.mockResolvedValue([
      {
        pipelineId: 'pipeline-1',
        pipelineStageId: 'stage-1',
        _count: { _all: 52 },
      },
    ]);

    const result = await service.getPipelineFunnel('tenant-a', {}, ALL);

    expect(result[0].stages.map((stage) => stage.stageName)).toEqual([
      'New Lead',
      'Qualified',
    ]);
    expect(result[0].stages[0]).toEqual(
      expect.objectContaining({
        stageName: 'New Lead',
        count: 52,
        percentage: 100,
        dropOffFromPrevious: null,
      }),
    );
    expect(result[0].stages[1]).toEqual(
      expect.objectContaining({
        stageName: 'Qualified',
        count: 0,
        dropOffFromPrevious: 100,
      }),
    );
  });

  it('sorts lead sources descending by count', async () => {
    prisma.lead.groupBy
      .mockResolvedValueOnce([
        { sourceId: 'source-1', _count: { _all: 50 } },
        { sourceId: 'source-2', _count: { _all: 180 } },
      ])
      .mockResolvedValueOnce([{ sourceId: 'source-2', _count: { _all: 52 } }]);
    prisma.leadSource.findMany.mockResolvedValue([
      { id: 'source-1', name: 'Website' },
      { id: 'source-2', name: 'Facebook' },
    ]);

    const result = await service.getLeadSources('tenant-a', {}, ALL);

    expect(result.map((item) => item.sourceName)).toEqual([
      'Facebook',
      'Website',
    ]);
    expect(result[0]).toEqual(
      expect.objectContaining({
        sourceName: 'Facebook',
        count: 180,
        won: 52,
        conversionRate: 28.9,
      }),
    );
  });

  it('calculates agent conversion from won and lost counts', async () => {
    prisma.lead.groupBy
      .mockResolvedValueOnce([
        { assignedUserId: 'user-1', _count: { _all: 152 } },
      ])
      .mockResolvedValueOnce([
        { assignedUserId: 'user-1', _count: { _all: 40 } },
      ])
      .mockResolvedValueOnce([
        { assignedUserId: 'user-1', _count: { _all: 12 } },
      ]);
    prisma.user.findMany.mockResolvedValue([{ id: 'user-1', name: 'Ahmed' }]);
    prisma.$queryRaw.mockResolvedValue([
      {
        user_id: 'user-1',
        avg_response_hours: 2.5,
        avg_closing_days: 14.2,
      },
    ]);

    const result = await service.getAgentPerformance('tenant-a', {}, ALL);

    expect(result[0]).toEqual({
      userId: 'user-1',
      name: 'Ahmed',
      assignedLeads: 152,
      won: 40,
      lost: 12,
      conversionRate: 76.92,
      avgResponseTimeHours: 2.5,
      avgClosingTimeDays: 14.2,
    });
  });

  it('uses tenant-scoped filters for status distribution', async () => {
    prisma.lead.count
      .mockResolvedValueOnce(210)
      .mockResolvedValueOnce(81)
      .mockResolvedValueOnce(25)
      .mockResolvedValueOnce(9);

    const result = await service.getStatusDistribution('tenant-a', {}, ALL);

    expect(result).toEqual({ open: 210, won: 81, lost: 25, archived: 9 });
    expect(prisma.lead.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        tenantId: 'tenant-a',
        status: LeadStatus.OPEN,
        pipelineStage: { isClosed: false },
      }),
    });
    expect(prisma.lead.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        tenantId: 'tenant-a',
        pipelineStage: { closeType: PipelineCloseType.WON },
      }),
    });
  });

  it('queries monthly trends with tenant id in raw SQL', async () => {
    prisma.$queryRaw.mockResolvedValue([
      { month: '2026-01', new_leads: 120n, won: 20n, lost: 11n },
    ]);

    const result = await service.getLeadTrends('tenant-a', {}, ALL);

    expect(prisma.$queryRaw).toHaveBeenCalled();
    expect(result).toEqual([
      { month: '2026-01', newLeads: 120, won: 20, lost: 11 },
    ]);
  });

  it('scopes recent activity queries to the tenant', async () => {
    prisma.leadActivity.findMany.mockResolvedValue([]);
    prisma.importJob.findMany.mockResolvedValue([]);
    prisma.exportJob.findMany.mockResolvedValue([]);

    await service.getRecentActivity('tenant-a', {}, 1, 20, ALL);

    expect(prisma.leadActivity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: 'tenant-a' }),
      }),
    );
    expect(prisma.importJob.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 'tenant-a',
          status: JobStatus.COMPLETED,
        }),
      }),
    );
  });

  describe('lead scope', () => {
    const leadWheres = (mock: jest.Mock) =>
      mock.mock.calls.map(
        ([args]: [{ where: Record<string, unknown> }]) => args.where,
      );

    it('adds no scope filter for an unrestricted scope', async () => {
      await service.getStatusDistribution('tenant-a', {}, ALL);

      for (const where of leadWheres(prisma.lead.count)) {
        expect(where).not.toHaveProperty('AND');
        expect(where).not.toHaveProperty('OR');
      }
    });

    it('adds the assignee filter for an own scope', async () => {
      await service.getStatusDistribution('tenant-a', {}, OWN);

      expect(prisma.lead.count).toHaveBeenCalledTimes(4);
      for (const where of leadWheres(prisma.lead.count)) {
        expect(where).toEqual(
          expect.objectContaining({ tenantId: 'tenant-a', AND: [OWN_FILTER] }),
        );
      }
    });

    it('scopes every overview lead count and raw query', async () => {
      prisma.$queryRaw.mockResolvedValue([{}]);

      await service.getOverview('tenant-a', {}, OWN);

      const wheres = leadWheres(prisma.lead.count);
      expect(wheres).toHaveLength(7);
      for (const where of wheres) {
        expect(where).toEqual(expect.objectContaining({ AND: [OWN_FILTER] }));
      }
      for (const call of prisma.$queryRaw.mock.calls as unknown[][]) {
        expect(JSON.stringify(call.slice(1))).toContain('agent-1');
      }
    });

    it('limits agent performance to users inside the scope', async () => {
      await service.getAgentPerformance(
        'tenant-a',
        {},
        {
          kind: 'team',
          actorUserId: 'lead-1',
          userIds: ['lead-1', 'agent-2'],
        },
      );

      for (const where of leadWheres(prisma.lead.groupBy)) {
        expect(where).toEqual(
          expect.objectContaining({
            assignedUserId: { in: ['lead-1', 'agent-2'] },
          }),
        );
      }
    });

    it('keeps all assignees for an unrestricted agent performance', async () => {
      await service.getAgentPerformance('tenant-a', {}, ALL);

      for (const where of leadWheres(prisma.lead.groupBy)) {
        expect(where).toEqual(
          expect.objectContaining({ assignedUserId: { not: null } }),
        );
      }
    });

    it('counts project interest only for in-scope leads', async () => {
      await service.getProjectPerformance('tenant-a', {}, OWN);
      await service.getProjectPerformance('tenant-a', {}, ALL);

      const [scoped, unscoped] = leadWheres(prisma.leadProjectInterest.groupBy);
      expect(scoped).toEqual(expect.objectContaining({ lead: OWN_FILTER }));
      expect(unscoped).not.toHaveProperty('lead');
    });

    it('limits recent lead activity to in-scope leads', async () => {
      await service.getRecentActivity('tenant-a', {}, 1, 20, OWN);

      expect(prisma.leadActivity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ lead: OWN_FILTER }),
        }),
      );
    });

    it('limits job counts and job feed items to the actor for scoped callers', async () => {
      prisma.$queryRaw.mockResolvedValue([{}]);
      await service.getOverview('tenant-a', {}, OWN);
      await service.getRecentActivity('tenant-a', {}, 1, 20, OWN);

      for (const mock of [
        prisma.importJob.count,
        prisma.exportJob.count,
        prisma.importJob.findMany,
        prisma.exportJob.findMany,
      ]) {
        expect(mock).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              tenantId: 'tenant-a',
              createdByUserId: 'agent-1',
            }),
          }),
        );
      }
    });

    it('does not filter jobs by creator for an unrestricted scope', async () => {
      prisma.$queryRaw.mockResolvedValue([{}]);
      await service.getOverview('tenant-a', {}, ALL);
      await service.getRecentActivity('tenant-a', {}, 1, 20, ALL);

      for (const mock of [
        prisma.importJob.count,
        prisma.exportJob.count,
        prisma.importJob.findMany,
        prisma.exportJob.findMany,
      ]) {
        expect(leadWheres(mock)[0]).not.toHaveProperty('createdByUserId');
      }
    });
  });
});
