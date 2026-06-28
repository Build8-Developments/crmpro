import { Test, TestingModule } from '@nestjs/testing';
import { HttpMetricsStore } from '../../../common/logging/http-metrics.store';
import { JobsHealthService } from '../../jobs/jobs-health.service';
import { NotificationMetricsStore } from '../../notifications/metrics/notification-metrics.store';
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
              notification: { waiting: 1, active: 0, completed: 2, failed: 0 },
            }),
          },
        },
        {
          provide: NotificationMetricsStore,
          useValue: {
            getSnapshot: jest.fn().mockReturnValue({
              created: 3,
              deliveryFailures: 0,
              averageDeliveryTimeMs: 15,
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
                notification: 'running',
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
      notifications: expect.objectContaining({
        created: 3,
        unreadCount: 1,
      }),
      workers: expect.objectContaining({ notification: 'running' }),
    });
  });
});
