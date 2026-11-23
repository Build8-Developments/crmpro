import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import {
  PLAN_FEATURES,
  FEATURE_UNAVAILABLE_MESSAGE,
} from './entitlement.constants';
import { PlanEntitlementService } from './plan-entitlement.service';

describe('PlanEntitlementService', () => {
  let service: PlanEntitlementService;
  let prisma: {
    tenant: { findFirst: jest.Mock };
    tenantContract: { findFirst: jest.Mock };
  };

  const livePlan = (featureFlags: unknown) => ({
    subscriptionPlan: {
      maxUsers: null,
      maxLeads: null,
      maxProjects: null,
      maxStorageBytes: null,
      featureFlags,
    },
  });

  const snapshot = (featureFlags: unknown) => ({
    id: 'contract-1',
    planSnapshot: {
      version: 1,
      planId: 'plan-growth',
      name: 'Growth',
      price: 7000,
      currency: 'EGP',
      quotas: {
        maxUsers: 20,
        maxLeads: 10000,
        maxProjects: 100,
        maxStorageBytes: '53687091200',
      },
      featureFlags,
      capturedAt: '2026-01-01T00:00:00.000Z',
    },
  });

  beforeEach(async () => {
    prisma = {
      tenant: { findFirst: jest.fn() },
      // No contract by default (legacy / never contracted).
      tenantContract: { findFirst: jest.fn().mockResolvedValue(null) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanEntitlementService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(PlanEntitlementService);
  });

  describe('without a snapshot (live plan)', () => {
    it('blocks analytics for Starter plan', async () => {
      prisma.tenant.findFirst.mockResolvedValue(
        livePlan({ analytics: false, importExport: false }),
      );

      await expect(
        service.assertFeatureEnabled('tenant-1', PLAN_FEATURES.ANALYTICS),
      ).rejects.toThrow(new ForbiddenException(FEATURE_UNAVAILABLE_MESSAGE));
    });

    it('allows analytics for Growth plan', async () => {
      prisma.tenant.findFirst.mockResolvedValue(
        livePlan({ analytics: true, importExport: true }),
      );

      await expect(
        service.assertFeatureEnabled('tenant-1', PLAN_FEATURES.ANALYTICS),
      ).resolves.toBeUndefined();
    });

    it('blocks import/export for Starter plan', async () => {
      prisma.tenant.findFirst.mockResolvedValue(
        livePlan({ analytics: false, importExport: false }),
      );

      await expect(
        service.assertFeatureEnabled('tenant-1', PLAN_FEATURES.IMPORT_EXPORT),
      ).rejects.toThrow(ForbiddenException);
    });

    it('ignores non-boolean flag values', async () => {
      prisma.tenant.findFirst.mockResolvedValue(livePlan({ analytics: 'yes' }));

      await expect(
        service.assertFeatureEnabled('tenant-1', PLAN_FEATURES.ANALYTICS),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws when the tenant is missing', async () => {
      prisma.tenant.findFirst.mockResolvedValue(null);

      await expect(service.getFeatureFlags('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('with a contract snapshot', () => {
    it('keeps the signed flags when the plan is edited after signing', async () => {
      // The plan dropped analytics and gained importExport after signing.
      prisma.tenant.findFirst.mockResolvedValue(
        livePlan({ analytics: false, importExport: true }),
      );
      prisma.tenantContract.findFirst.mockResolvedValueOnce(
        snapshot({ analytics: true, importExport: false }),
      );

      await expect(service.getFeatureFlags('tenant-1')).resolves.toEqual({
        analytics: true,
        importExport: false,
      });
    });

    it('lets a flag added to the plan later reach the tenant', async () => {
      prisma.tenant.findFirst.mockResolvedValue(
        livePlan({ analytics: false, apiAccess: true }),
      );
      prisma.tenantContract.findFirst.mockResolvedValueOnce(
        snapshot({ analytics: true, importExport: true }),
      );

      const flags = await service.getFeatureFlags('tenant-1');

      expect(flags).toEqual({
        analytics: true,
        importExport: true,
        apiAccess: true,
      });
      await expect(
        service.assertFeatureEnabled('tenant-1', PLAN_FEATURES.API_ACCESS),
      ).resolves.toBeUndefined();
    });

    it('a malformed flags object freezes nothing: flags come from the live plan', async () => {
      prisma.tenant.findFirst.mockResolvedValue(
        livePlan({ analytics: false, importExport: true }),
      );
      prisma.tenantContract.findFirst.mockResolvedValueOnce(
        snapshot(['analytics']),
      );

      await expect(service.getFeatureFlags('tenant-1')).resolves.toEqual({
        analytics: false,
        importExport: true,
      });
    });

    it('a malformed snapshot never grants a flag the live plan lacks', async () => {
      prisma.tenant.findFirst.mockResolvedValue(livePlan({}));
      prisma.tenantContract.findFirst.mockResolvedValueOnce({
        id: 'contract-1',
        planSnapshot: 'garbage',
      });

      await expect(
        service.assertFeatureEnabled('tenant-1', PLAN_FEATURES.ANALYTICS),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
