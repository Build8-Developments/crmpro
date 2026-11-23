import { CanActivate, ForbiddenException } from '@nestjs/common';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { PERMISSIONS } from '@crmpro/shared/auth';
import {
  LeadScopeService,
  ResolveLeadScopePipe,
  type LeadScope,
} from '../../common/auth/lead-scope';
import { PermissionsGuard } from '../../common/auth/guards/permissions.guard';
import { PermissionsService } from '../../common/auth/services/permissions.service';
import { PlanEntitlementGuard } from '../../common/entitlements/guards/plan-entitlement.guard';
import { PlanEntitlementService } from '../../common/entitlements/plan-entitlement.service';
import { TenantAccessService } from '../../common/tenant-access/tenant-access.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { AnalyticsAggregatorService } from './analytics-aggregator.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

const mockGuard: CanActivate = { canActivate: jest.fn().mockReturnValue(true) };

describe('AnalyticsController', () => {
  let controller: AnalyticsController;
  let analyticsService: {
    getOverview: jest.Mock;
    getRecentActivity: jest.Mock;
    getTrendAnalytics: jest.Mock;
    getTeamAnalytics: jest.Mock;
    getActivityFeed: jest.Mock;
  };
  let aggregatorService: { getDashboard: jest.Mock };
  let permissionsService: { getPermissionKeysForUser: jest.Mock };
  let planEntitlementService: { assertFeatureEnabled: jest.Mock };

  const user = {
    id: 'user-1',
    tenantId: 'tenant-1',
  } as AuthenticatedUser;
  const scope: LeadScope = { kind: 'own', actorUserId: 'user-1' };

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
      getTrendAnalytics: jest.fn().mockResolvedValue({
        data: {
          leadCreation: [],
          leadClosing: [],
        },
        cacheHit: false,
      }),
      getTeamAnalytics: jest.fn().mockResolvedValue({
        data: { topPerformers: [] },
        cacheHit: false,
      }),
      getActivityFeed: jest.fn().mockResolvedValue({
        data: [],
        cacheHit: false,
      }),
    };
    aggregatorService = {
      getDashboard: jest.fn().mockResolvedValue({
        overview: { totalLeads: 5 },
        pipeline: { stages: [] },
      }),
    };
    permissionsService = {
      getPermissionKeysForUser: jest
        .fn()
        .mockResolvedValue(new Set([PERMISSIONS.LEAD_READ])),
    };
    planEntitlementService = {
      assertFeatureEnabled: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        { provide: AnalyticsService, useValue: analyticsService },
        { provide: AnalyticsAggregatorService, useValue: aggregatorService },
        { provide: PermissionsService, useValue: permissionsService },
        { provide: LeadScopeService, useValue: { resolve: jest.fn() } },
        {
          provide: PlanEntitlementService,
          useValue: planEntitlementService,
        },
        PlanEntitlementGuard,
        {
          provide: TenantAccessService,
          useValue: {
            getCachedTenantAccessState: jest
              .fn()
              .mockResolvedValue({ readOnly: false, accessEndsAt: null }),
          },
        },
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
      controller.getOverview(user, scope, {
        from: '2026-01-01',
        to: '2026-06-30',
      }),
    ).resolves.toEqual({
      success: true,
      data: { totalLeads: 5 },
    });

    expect(analyticsService.getOverview).toHaveBeenCalledWith(
      'tenant-1',
      { from: expect.any(Date), to: expect.any(Date) },
      scope,
    );
  });

  it('returns permission-aware dashboard payload', async () => {
    await expect(
      controller.getDashboard(user, scope, { range: '30d' }),
    ).resolves.toEqual({
      success: true,
      data: {
        overview: { totalLeads: 5 },
        pipeline: { stages: [] },
      },
    });

    expect(aggregatorService.getDashboard).toHaveBeenCalledWith(
      'user-1',
      'tenant-1',
      '30d',
      scope,
    );
  });

  it('passes pagination params for recent activity', async () => {
    await expect(
      controller.getRecentActivity(user, scope, {
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
      scope,
    );
  });

  it('validates trends range via analytics service', async () => {
    await controller.getTrends(user, scope, { range: '7d' });

    expect(analyticsService.getTrendAnalytics).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({
        from: expect.any(Date),
        to: expect.any(Date),
      }),
      scope,
    );
  });

  it('returns team analytics for authorized users', async () => {
    await expect(controller.getTeam(user, scope)).resolves.toEqual({
      success: true,
      data: { topPerformers: [] },
    });

    expect(analyticsService.getTeamAnalytics).toHaveBeenCalledWith(
      'tenant-1',
      scope,
    );
  });

  it('blocks activity endpoint without audit.read or lead.read', async () => {
    permissionsService.getPermissionKeysForUser.mockResolvedValue(
      new Set([PERMISSIONS.USER_READ]),
    );

    await expect(controller.getActivity(user, scope, {})).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('returns activity feed when lead.read is granted', async () => {
    await expect(controller.getActivity(user, scope, {})).resolves.toEqual({
      success: true,
      data: [],
    });

    expect(analyticsService.getActivityFeed).toHaveBeenCalledWith(
      'tenant-1',
      false,
      scope,
    );
  });
});

describe('AnalyticsController lead scope wiring', () => {
  const handlers = Object.getOwnPropertyNames(
    AnalyticsController.prototype,
  ).filter(
    (name) =>
      name.startsWith('get') &&
      Reflect.getMetadata(
        'path',
        AnalyticsController.prototype[name as keyof AnalyticsController],
      ) !== undefined,
  );

  it('covers every analytics endpoint', () => {
    expect(handlers.sort()).toEqual(
      [
        'getActivity',
        'getAgents',
        'getDashboard',
        'getDevelopers',
        'getOverview',
        'getPipeline',
        'getProjects',
        'getRecentActivity',
        'getSources',
        'getStatus',
        'getTeam',
        'getTrends',
      ].sort(),
    );
  });

  it.each(handlers)('%s resolves the caller lead scope', (handler) => {
    const args = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      AnalyticsController,
      handler,
    ) as Record<string, { pipes?: unknown[] }>;

    const pipes = Object.values(args).flatMap((arg) => arg.pipes ?? []);
    expect(pipes).toContain(ResolveLeadScopePipe);
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
          provide: TenantAccessService,
          useValue: {
            getCachedTenantAccessState: jest
              .fn()
              .mockResolvedValue({ readOnly: false, accessEndsAt: null }),
          },
        },
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
      new ForbiddenException(
        'Feature unavailable in current subscription plan.',
      ),
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

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
