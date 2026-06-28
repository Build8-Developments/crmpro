import { Test, TestingModule } from '@nestjs/testing';
import { HttpMetricsStore } from '../../../common/logging/http-metrics.store';
import { JobsHealthService } from '../../jobs/jobs-health.service';
import { AutomationMetricsStore } from '../../automation/metrics/automation-metrics.store';
import { NotificationMetricsStore } from '../../notifications/metrics/notification-metrics.store';
import { TaskMetricsStore } from '../../tasks/metrics/task-metrics.store';
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
              automation: { waiting: 0, active: 1, completed: 3, failed: 0 },
              task: { waiting: 0, active: 0, completed: 0, failed: 0 },
            }),
          },
        },
        {
          provide: TaskMetricsStore,
          useValue: {
            getSnapshot: jest.fn().mockReturnValue({
              created: 10,
              completed: 8,
              overdue: 1,
              remindersSent: 5,
              averageCompletionTimeHours: 4.2,
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
          provide: AutomationMetricsStore,
          useValue: {
            getSnapshot: jest.fn().mockReturnValue({
              executions: 5,
              successes: 4,
              failures: 1,
              skipped: 0,
              averageExecutionTimeMs: 84,
              successRate: 80,
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
                automation: 'running',
                taskReminder: 'running',
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
      automation: expect.objectContaining({
        executions: 5,
        successRate: 80,
      }),
      tasks: expect.objectContaining({
        created: 10,
        completed: 8,
      }),
      workers: expect.objectContaining({ taskReminder: 'running' }),
    });
  });
});
