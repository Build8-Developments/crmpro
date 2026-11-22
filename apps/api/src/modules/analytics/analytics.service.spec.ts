import { Test, TestingModule } from '@nestjs/testing';
import type { LeadScope } from '../../common/auth/lead-scope/lead-scope.types';
import { CacheService } from '../../common/cache/cache.service';
import { LoggingService } from '../../common/logging/logging.service';
import { ANALYTICS_ENDPOINTS } from './analytics.constants';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryService } from './queries/analytics-query.service';
import { OverviewAnalyticsService } from './services/overview-analytics.service';
import { PipelineAnalyticsService } from './services/pipeline-analytics.service';
import { TrendAnalyticsService } from './services/trend-analytics.service';
import { TeamAnalyticsService } from './services/team-analytics.service';
import { ActivityAnalyticsService } from './services/activity-analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let overviewService: { getOverview: jest.Mock };
  let queryService: { getOverview: jest.Mock };
  let cacheService: {
    buildAnalyticsKey: jest.Mock;
    get: jest.Mock;
    set: jest.Mock;
    getAnalyticsTtlSeconds: jest.Mock;
  };
  let loggingService: { info: jest.Mock };

  const allScope: LeadScope = { kind: 'all', actorUserId: 'owner-1' };

  const overview = {
    totalLeads: 10,
    openLeads: 5,
    wonLeads: 3,
    lostLeads: 1,
    newToday: 1,
    newThisWeek: 2,
    newThisMonth: 4,
    conversionRate: 75,
    avgResponseTimeHours: 3.2,
    avgLeadAgeDays: 8.5,
    activePipelines: 1,
    activeProjects: 2,
    developers: 3,
    importsToday: 0,
    exportsToday: 0,
    staleLeads: 0,
    unassignedLeads: 0,
  };

  beforeEach(async () => {
    overviewService = {
      getOverview: jest.fn().mockResolvedValue(overview),
    };
    queryService = {
      getOverview: jest.fn().mockResolvedValue(overview),
    };

    cacheService = {
      buildAnalyticsKey: jest
        .fn()
        .mockReturnValue('analytics:tenant-1:overview:all:all'),
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
      getAnalyticsTtlSeconds: jest.fn().mockReturnValue(300),
    };

    loggingService = {
      info: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: AnalyticsQueryService, useValue: queryService },
        { provide: OverviewAnalyticsService, useValue: overviewService },
        {
          provide: PipelineAnalyticsService,
          useValue: { getPipeline: jest.fn() },
        },
        {
          provide: TrendAnalyticsService,
          useValue: { getTrends: jest.fn() },
        },
        {
          provide: TeamAnalyticsService,
          useValue: { getTeam: jest.fn() },
        },
        {
          provide: ActivityAnalyticsService,
          useValue: { getActivity: jest.fn() },
        },
        { provide: CacheService, useValue: cacheService },
        { provide: LoggingService, useValue: loggingService },
      ],
    }).compile();

    service = module.get(AnalyticsService);
  });

  it('returns cached overview data on cache hit', async () => {
    cacheService.get.mockResolvedValue(overview);

    const result = await service.getOverview('tenant-1', {}, allScope);

    expect(result.cacheHit).toBe(true);
    expect(result.data).toEqual(overview);
    expect(queryService.getOverview).not.toHaveBeenCalled();
    expect(overviewService.getOverview).not.toHaveBeenCalled();
    expect(loggingService.info).toHaveBeenCalledWith(
      expect.objectContaining({
        module: 'Analytics',
        operation: ANALYTICS_ENDPOINTS.overview,
        status: 'cache_hit',
      }),
    );
  });

  it('queries and caches overview data on cache miss', async () => {
    const range = {
      from: new Date('2026-01-01T00:00:00.000Z'),
      to: new Date('2026-06-30T23:59:59.999Z'),
    };

    const result = await service.getOverview('tenant-1', range, allScope);

    expect(result.cacheHit).toBe(false);
    expect(result.data).toEqual(overview);
    expect(overviewService.getOverview).toHaveBeenCalledWith(
      'tenant-1',
      range,
      allScope,
    );
    expect(queryService.getOverview).not.toHaveBeenCalled();
    expect(cacheService.set).toHaveBeenCalledWith(
      'analytics:tenant-1:overview:all:all',
      overview,
      300,
    );
    expect(loggingService.info).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'cache_miss',
      }),
    );
  });

  describe('scope-aware cache keys', () => {
    beforeEach(() => {
      // Use the real key builder so the assertions cover the final key.
      cacheService.buildAnalyticsKey.mockImplementation(
        (...args: Parameters<CacheService['buildAnalyticsKey']>) =>
          CacheService.prototype.buildAnalyticsKey.apply(cacheService, args),
      );
    });

    const keyFor = async (scope: LeadScope): Promise<string> => {
      cacheService.get.mockClear();
      await service.getOverview('tenant-1', {}, scope);
      return cacheService.get.mock.calls[0][0] as string;
    };

    it('includes the lead scope in the cache key', async () => {
      await expect(keyFor(allScope)).resolves.toBe(
        'analytics:tenant-1:overview:all:all:scope:all',
      );
      await expect(
        keyFor({ kind: 'own', actorUserId: 'agent-1' }),
      ).resolves.toBe('analytics:tenant-1:overview:all:all:scope:own:agent-1');
    });

    it('never shares an entry between scopes', async () => {
      const scopes: LeadScope[] = [
        allScope,
        { kind: 'own', actorUserId: 'agent-1' },
        { kind: 'own', actorUserId: 'agent-2' },
        { kind: 'team', actorUserId: 'lead-1', userIds: ['lead-1', 'a'] },
        { kind: 'team', actorUserId: 'lead-1', userIds: ['lead-1', 'b'] },
      ];
      const keys: string[] = [];
      for (const scope of scopes) {
        keys.push(await keyFor(scope));
      }

      expect(new Set(keys).size).toBe(keys.length);
    });

    it('keeps endpoint-specific extras after the scope fragment', async () => {
      await service.getActivityFeed('tenant-1', true, {
        kind: 'own',
        actorUserId: 'agent-1',
      });

      expect(cacheService.buildAnalyticsKey).toHaveBeenLastCalledWith(
        'tenant-1',
        ANALYTICS_ENDPOINTS.activity,
        undefined,
        undefined,
        'scope:own:agent-1:audit',
      );
    });
  });
});
