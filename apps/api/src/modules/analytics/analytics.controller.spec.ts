import { CanActivate, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { PermissionsGuard } from '../../common/auth/guards/permissions.guard';
import { PlanEntitlementGuard } from '../../common/entitlements/guards/plan-entitlement.guard';
import { PlanEntitlementService } from '../../common/entitlements/plan-entitlement.service';
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
  let planEntitlementService: { assertFeatureEnabled: jest.Mock };

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
    planEntitlementService = {
      assertFeatureEnabled: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        { provide: AnalyticsService, useValue: analyticsService },
        {
          provide: PlanEntitlementService,
          useValue: planEntitlementService,
        },
        PlanEntitlementGuard,
      ],
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

describe('AnalyticsController plan entitlements', () => {
  let guard: PlanEntitlementGuard;
  let planEntitlementService: { assertFeatureEnabled: jest.Mock };

  beforeEach(async () => {
    planEntitlementService = {
      assertFeatureEnabled: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanEntitlementGuard,
        {
          provide: PlanEntitlementService,
          useValue: planEntitlementService,
        },
        Reflector,
      ],
    }).compile();

    guard = module.get(PlanEntitlementGuard);
  });

  it('blocks overview when analytics feature is disabled', async () => {
    planEntitlementService.assertFeatureEnabled.mockRejectedValue(
      new ForbiddenException('Feature unavailable in current subscription plan.'),
    );

    const context = {
      getHandler: () => AnalyticsController.prototype.getOverview,
      getClass: () => AnalyticsController,
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'user-1', tenantId: 'tenant-1' },
        }),
      }),
    } as never;

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });
});
