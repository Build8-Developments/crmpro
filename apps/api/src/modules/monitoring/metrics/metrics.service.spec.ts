import { Test, TestingModule } from '@nestjs/testing';
import { HttpMetricsStore } from '../../../common/logging/http-metrics.store';
import { JobsHealthService } from '../../jobs/jobs-health.service';
import { MetricsService } from './metrics.service';
import { QueueMetricsService } from './queue-metrics.service';

describe('MetricsService', () => {
  it('combines http and queue metrics', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetricsService,
        {
          provide: HttpMetricsStore,
          useValue: {
            getSnapshot: jest.fn().mockReturnValue({
              totalRequests: 5,
              averageResponseTimeMs: 12,
              p95ResponseTimeMs: 20,
              errorRate: 0,
            }),
          },
        },
        {
          provide: QueueMetricsService,
          useValue: {
            getQueueMetrics: jest.fn().mockResolvedValue({
              import: { waiting: 0, active: 0, completed: 1, failed: 0 },
              export: { waiting: 0, active: 0, completed: 1, failed: 0 },
              cleanup: { waiting: 0, active: 0, completed: 1, failed: 0 },
            }),
          },
        },
        {
          provide: JobsHealthService,
          useValue: {
            getHealth: jest.fn().mockResolvedValue({
              workers: {
                import: 'running',
                export: 'running',
                cleanup: 'running',
              },
            }),
          },
        },
      ],
    }).compile();

    const service = module.get(MetricsService);
    await expect(service.getMetrics()).resolves.toEqual({
      http: expect.objectContaining({ totalRequests: 5 }),
      queues: expect.any(Object),
      workers: expect.objectContaining({ import: 'running' }),
    });
  });
});
