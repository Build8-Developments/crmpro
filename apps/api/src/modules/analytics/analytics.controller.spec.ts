import { CanActivate } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsGuard } from '../../common/auth/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

const mockGuard: CanActivate = { canActivate: jest.fn().mockReturnValue(true) };

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let analyticsService: {
    getOverview: jest.Mock;
    getRecentActivity: jest.Mock;
  };

  const user = {
    id: 'user-1',
    tenantId: 'tenant-1',
  } as AuthenticatedUser;

  beforeEach(async () => {
    analyticsService = {
      getOverview: jest.fn().mockResolvedValue({
        data: { totalLeads: 5 },
        cacheHit: false,
      }),
      getRecentActivity: jest.fn().mockResolvedValue({
        data: {
          items: [],
          page: 1,
          limit: 20,
          totalItems: 0,
          totalPages: 1,
        },
        cacheHit: true,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [{ provide: AnalyticsService, useValue: analyticsService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(PermissionsGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get(AnalyticsController);
  });

  it('returns overview wrapped in success response', async () => {
    await expect(
      controller.getOverview(user, { from: '2026-01-01', to: '2026-06-30' }),
    ).resolves.toEqual({
      success: true,
      data: { totalLeads: 5 },
    });

    expect(analyticsService.getOverview).toHaveBeenCalledWith('tenant-1', {
      from: expect.any(Date),
      to: expect.any(Date),
    });
  });

  it('passes pagination params for recent activity', async () => {
    await expect(
      controller.getRecentActivity(user, {
        page: 2,
        limit: 10,
      }),
    ).resolves.toEqual({
      success: true,
      data: expect.objectContaining({ page: 1, limit: 20 }),
    });

    expect(analyticsService.getRecentActivity).toHaveBeenCalledWith(
      'tenant-1',
      { from: undefined, to: undefined },
      2,
      10,
    );
  });
});
