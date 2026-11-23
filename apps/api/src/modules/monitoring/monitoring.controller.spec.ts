import { CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsGuard } from '../../common/auth/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InternalMonitoringGuard } from './guards/internal-monitoring.guard';
import { MonitoringController } from './monitoring.controller';
import { MonitoringService } from './monitoring.service';

const mockGuard: CanActivate = { canActivate: jest.fn().mockReturnValue(true) };

describe('MonitoringController', () => {
  let controller: MonitoringController;
  let monitoringService: {
    getGlobalHealth: jest.Mock;
    getJobsHealth: jest.Mock;
    getMetrics: jest.Mock;
  };

  beforeEach(async () => {
    monitoringService = {
      getGlobalHealth: jest.fn().mockResolvedValue({
        api: 'up',
        database: 'up',
        redis: 'up',
        storage: 'up',
        queues: 'healthy',
        cleanupScheduler: 'up',
        version: '1.0.0',
        environment: 'test',
        uptimeSeconds: 10,
      }),
      getJobsHealth: jest.fn().mockResolvedValue({
        redis: 'up',
        queues: 'healthy',
        workers: {
          import: 'running',
          export: 'running',
          cleanup: 'running',
        },
        cleanup: { lastRun: null, status: 'healthy' },
      }),
      getMetrics: jest.fn().mockResolvedValue({
        http: {
          totalRequests: 10,
          averageResponseTimeMs: 20,
          p95ResponseTimeMs: 40,
          errorRate: 0,
        },
        queues: {
          import: { waiting: 0, active: 0, completed: 1, failed: 0 },
          export: { waiting: 0, active: 0, completed: 1, failed: 0 },
          cleanup: { waiting: 0, active: 0, completed: 1, failed: 0 },
        },
        workers: {
          import: 'running',
          export: 'running',
          cleanup: 'running',
        },
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MonitoringController],
      providers: [{ provide: MonitoringService, useValue: monitoringService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionsGuard)
      .useValue(mockGuard)
      .overrideGuard(InternalMonitoringGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get(MonitoringController);
  });

  it('returns global health', async () => {
    await expect(controller.getHealth()).resolves.toEqual({
      success: true,
      data: expect.objectContaining({ api: 'up', database: 'up' }),
    });
  });

  it('returns jobs health', async () => {
    await expect(controller.getJobsHealth()).resolves.toEqual({
      success: true,
      data: expect.objectContaining({
        workers: expect.objectContaining({ import: 'running' }),
      }),
    });
  });

  it('returns metrics', async () => {
    await expect(controller.getMetrics()).resolves.toEqual({
      success: true,
      data: expect.objectContaining({
        http: expect.objectContaining({ totalRequests: 10 }),
      }),
    });
  });

  it.each(['getJobsHealth', 'getMetrics'] as const)(
    '%s is only reachable with the internal monitoring key',
    (handler) => {
      const guards = Reflect.getMetadata(
        '__guards__',
        MonitoringController.prototype[handler],
      ) as unknown[];
      expect(guards).toEqual([InternalMonitoringGuard]);
    },
  );
});
