import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PipelineAnalyticsService } from './pipeline-analytics.service';

type SqlFragment = { sql: string; values: unknown[] };

const isSqlFragment = (value: unknown): value is SqlFragment =>
  typeof value === 'object' &&
  value !== null &&
  'sql' in value &&
  'values' in value;

/** Prisma.Sql fragments interpolated into the first $queryRaw call. */
function sqlFragments(queryRaw: jest.Mock): SqlFragment[] {
  return (queryRaw.mock.calls[0] as unknown[]).slice(1).filter(isSqlFragment);
}

describe('PipelineAnalyticsService', () => {
  let service: PipelineAnalyticsService;
  let prisma: {
    pipeline: { findFirst: jest.Mock };
    lead: { groupBy: jest.Mock };
    $queryRaw: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      pipeline: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'pipe-1',
          name: 'Default Pipeline',
          stages: [
            { id: 'stage-1', name: 'New Lead', sortOrder: 1 },
            { id: 'stage-2', name: 'Qualified', sortOrder: 2 },
          ],
        }),
      },
      lead: {
        groupBy: jest.fn().mockResolvedValue([
          { pipelineStageId: 'stage-1', _count: { _all: 18 } },
          { pipelineStageId: 'stage-2', _count: { _all: 6 } },
        ]),
      },
      $queryRaw: jest.fn().mockResolvedValue([
        { stage_id: 'stage-1', avg_days: 3.2 },
        { stage_id: 'stage-2', avg_days: 5.5 },
      ]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PipelineAnalyticsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(PipelineAnalyticsService);
  });

  it('returns pipeline funnel stage shape', async () => {
    const result = await service.getPipeline('tenant-1', {
      kind: 'all',
      actorUserId: 'user-1',
    });

    expect(result).toEqual({
      pipelineId: 'pipe-1',
      pipelineName: 'Default Pipeline',
      stages: [
        {
          stageId: 'stage-1',
          name: 'New Lead',
          count: 18,
          avgDaysInStage: 3.2,
        },
        {
          stageId: 'stage-2',
          name: 'Qualified',
          count: 6,
          avgDaysInStage: 5.5,
        },
      ],
    });
  });

  it('adds no assignee filter for an unrestricted scope', async () => {
    await service.getPipeline('tenant-1', { kind: 'all', actorUserId: null });

    expect(prisma.lead.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: 'tenant-1', deletedAt: null, pipelineId: 'pipe-1' },
      }),
    );
    const fragments = sqlFragments(prisma.$queryRaw).map((f) => f.sql);
    expect(fragments).toContain('TRUE');
    expect(fragments.join(' ')).not.toContain('assignedUserId');
  });

  it('restricts counts and stage ages to the team scope', async () => {
    await service.getPipeline('tenant-1', {
      kind: 'team',
      actorUserId: 'lead-1',
      userIds: ['lead-1', 'agent-2'],
    });

    expect(prisma.lead.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId: 'tenant-1',
          deletedAt: null,
          pipelineId: 'pipe-1',
          AND: [
            {
              OR: [
                { assignedUserId: { in: ['lead-1', 'agent-2'] } },
                { assignedUserId: null },
              ],
            },
          ],
        },
      }),
    );
    const fragment = sqlFragments(prisma.$queryRaw).find((f) =>
      f.sql.includes('assignedUserId'),
    );
    expect(fragment?.sql).toContain('l."assignedUserId" IS NULL');
    expect(fragment?.values).toEqual([['lead-1', 'agent-2']]);
  });
});
