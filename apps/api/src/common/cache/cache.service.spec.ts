import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ANALYTICS_CACHE_PREFIX } from './cache.constants';
import { CacheService } from './cache.service';

describe('CacheService', () => {
  let service: CacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'redis.url') {
                return undefined;
              }
              if (key === 'redis.host') {
                return '127.0.0.1';
              }
              if (key === 'redis.port') {
                return 6379;
              }
              if (key === 'analytics.cacheTtlSeconds') {
                return 300;
              }
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get(CacheService);
    service.onModuleInit();
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  it('builds analytics cache keys from tenant, endpoint, and date range', () => {
    expect(
      service.buildAnalyticsKey(
        'tenant-1',
        'overview',
        '2026-01-01T00:00:00.000Z',
        '2026-06-30T23:59:59.999Z',
      ),
    ).toBe(
      `${ANALYTICS_CACHE_PREFIX}:tenant-1:overview:2026-01-01T00:00:00.000Z:2026-06-30T23:59:59.999Z`,
    );
  });

  it('uses all sentinel values when date range is omitted', () => {
    expect(service.buildAnalyticsKey('tenant-1', 'trends')).toBe(
      `${ANALYTICS_CACHE_PREFIX}:tenant-1:trends:all:all`,
    );
  });

  it('returns analytics ttl from config', () => {
    expect(service.getAnalyticsTtlSeconds()).toBe(300);
  });
});
