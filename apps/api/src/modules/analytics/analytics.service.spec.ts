import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from '../../common/cache/cache.service';
import { LoggingService } from '../../common/logging/logging.service';
import { ANALYTICS_ENDPOINTS } from './analytics.constants';
import { AnalyticsService } from './analytics.service';
import { AnalyticsExportService } from './services/analytics-export.service';
import { AnalyticsQueryService } from './queries/analytics-query.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let queryService: { getOverview: jest.Mock };
  let cacheService: {
    buildAnalyticsKey: jest.Mock;
    get: jest.Mock;
    set: jest.Mock;
    getAnalyticsTtlSeconds: jest.Mock;
  };
  let loggingService: { info: jest.Mock };
  let exportService: { exportDashboard: jest.Mock };

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
  };

  beforeEach(async () => {
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

    exportService = {
      exportDashboard: jest.fn().mockResolvedValue({
        buffer: Buffer.from('csv'),
        mimeType: 'text/csv',
        filename: 'dashboard.csv',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        { provide: AnalyticsQueryService, useValue: queryService },
        { provide: AnalyticsExportService, useValue: exportService },
        { provide: CacheService, useValue: cacheService },
        { provide: LoggingService, useValue: loggingService },
      ],
    }).compile();

    service = module.get(AnalyticsService);
  });

  it('returns cached overview data on cache hit', async () => {
    cacheService.get.mockResolvedValue(overview);

    const result = await service.getOverview('tenant-1', {});

    expect(result.cacheHit).toBe(true);
    expect(result.data).toEqual(overview);
    expect(queryService.getOverview).not.toHaveBeenCalled();
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

    const result = await service.getOverview('tenant-1', range);

    expect(result.cacheHit).toBe(false);
    expect(result.data).toEqual(overview);
    expect(queryService.getOverview).toHaveBeenCalledWith('tenant-1', range);
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
});
