import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { PipelineAnalyticsService } from './pipeline-analytics.service';

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
      actorUserId: null,
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
});
