import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ContractStatus, Prisma } from '@crmpro/database';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ContractsAuditService } from './services/contracts-audit.service';
import { ContractEntitlementSyncService } from './services/contract-entitlement-sync.service';
import { ContractsService } from './contracts.service';

describe('ContractsService', () => {
  let service: ContractsService;
  let tx: {
    tenantContract: { update: jest.Mock; create: jest.Mock };
    subscriptionPlan: { findUnique: jest.Mock };
  };
  let prisma: {
    tenantContract: { findFirst: jest.Mock; update: jest.Mock };
    subscriptionPlan: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let entitlementSyncService: {
    syncTenantPlanFromContract: jest.Mock;
    assertTenantContractPlanConsistency: jest.Mock;
  };

  const metadata = {
    ipAddress: '127.0.0.1',
    userAgent: 'jest',
    fingerprint: 'fp',
    deviceName: null,
    country: null,
    city: null,
  };

  const enterprisePlan = {
    id: 'plan-enterprise',
    name: 'Enterprise',
    isActive: true,
    maxUsers: 50,
    maxLeads: null,
    maxProjects: 200,
    maxStorageBytes: 107374182400n,
    featureFlags: { analytics: true, importExport: true, apiAccess: false },
  };

  function contractRecord(overrides: Record<string, unknown> = {}) {
    return {
      id: 'contract-1',
      status: ContractStatus.DRAFT,
      planId: 'plan-enterprise',
      tenantId: 'tenant-1',
      plan: enterprisePlan,
      deletedAt: null,
      contractStartAt: new Date('2026-01-01'),
      contractEndAt: null,
      contractName: null,
      agreedPrice: new Prisma.Decimal('1000.00'),
      currency: 'EGP',
      paymentMethod: 'BANK_TRANSFER',
      paymentFrequency: 'MONTHLY',
      discountPercent: null,
      gracePeriodDays: null,
      autoRenew: false,
      notes: null,
      planSnapshot: null,
      terminatedAt: null,
      terminationMode: null,
      accessEndsAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdByAdminId: 'admin-1',
      createdByAdmin: { id: 'admin-1', fullName: 'Admin', email: 'a@x.com' },
      ...overrides,
    };
  }

  /** What Prisma returns after a write: prices come back as Decimals. */
  function asStored(data: Record<string, unknown>) {
    const { agreedPrice, ...rest } = data;
    return contractRecord({
      ...rest,
      ...(agreedPrice !== undefined
        ? { agreedPrice: new Prisma.Decimal(agreedPrice as number) }
        : {}),
    });
  }

  beforeEach(async () => {
    entitlementSyncService = {
      syncTenantPlanFromContract: jest.fn().mockResolvedValue(undefined),
      assertTenantContractPlanConsistency: jest
        .fn()
        .mockResolvedValue(undefined),
    };

    tx = {
      tenantContract: {
        update: jest
          .fn()
          .mockImplementation(({ data }) => Promise.resolve(asStored(data))),
        create: jest
          .fn()
          .mockImplementation(({ data }) => Promise.resolve(asStored(data))),
      },
      subscriptionPlan: {
        findUnique: jest.fn().mockResolvedValue(enterprisePlan),
      },
    };

    prisma = {
      tenantContract: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      subscriptionPlan: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'plan-enterprise', isActive: true }),
      },
      $transaction: jest.fn(async (callback) => callback(tx)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ContractsAuditService,
          useValue: {
            logContractCreated: jest.fn(),
            logContractActivated: jest.fn(),
            logContractUpdated: jest.fn(),
          },
        },
        {
          provide: ContractEntitlementSyncService,
          useValue: entitlementSyncService,
        },
      ],
    }).compile();

    service = module.get(ContractsService);
  });

  describe('activateContract', () => {
    beforeEach(() => {
      prisma.tenantContract.findFirst
        .mockResolvedValueOnce(contractRecord())
        // assertTenantHasNoActiveContract
        .mockResolvedValueOnce(null);
    });

    it('syncs tenant plan when activating a linked contract', async () => {
      await service.activateContract('contract-1', 'admin-1', metadata);

      expect(
        entitlementSyncService.syncTenantPlanFromContract,
      ).toHaveBeenCalledWith(tx, 'tenant-1', 'plan-enterprise');
      expect(
        entitlementSyncService.assertTenantContractPlanConsistency,
      ).toHaveBeenCalledWith('tenant-1', tx);
    });

    it('freezes the plan and the agreed price at signing', async () => {
      const result = await service.activateContract(
        'contract-1',
        'admin-1',
        metadata,
      );

      expect(tx.subscriptionPlan.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'plan-enterprise' } }),
      );
      expect(tx.tenantContract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            status: ContractStatus.ACTIVE,
            planSnapshot: expect.objectContaining({
              version: 1,
              planId: 'plan-enterprise',
              name: 'Enterprise',
              price: 1000,
              currency: 'EGP',
              quotas: {
                maxUsers: 50,
                maxLeads: null,
                maxProjects: 200,
                maxStorageBytes: '107374182400',
              },
              featureFlags: {
                analytics: true,
                importExport: true,
                apiAccess: false,
              },
              capturedAt: expect.any(String),
            }),
          },
        }),
      );
      expect(result.planSnapshot?.quotas.maxUsers).toBe(50);
    });
  });

  describe('createContract', () => {
    it('stores a preview snapshot on the draft', async () => {
      await service.createContract(
        {
          planId: 'plan-enterprise',
          agreedPrice: 900,
          currency: 'USD',
          paymentMethod: 'BANK_TRANSFER',
          paymentFrequency: 'MONTHLY',
          contractStartAt: '2026-01-01T00:00:00.000Z',
        } as never,
        'admin-1',
        metadata,
      );

      expect(tx.tenantContract.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: ContractStatus.DRAFT,
            planSnapshot: expect.objectContaining({
              price: 900,
              currency: 'USD',
              planId: 'plan-enterprise',
            }),
          }),
        }),
      );
    });
  });

  describe('updateContract', () => {
    it('re-captures the snapshot when a draft changes plan or price', async () => {
      prisma.tenantContract.findFirst.mockResolvedValue(contractRecord());

      await service.updateContract(
        'contract-1',
        { agreedPrice: 1200 },
        'admin-1',
        metadata,
      );

      expect(tx.tenantContract.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            agreedPrice: 1200,
            planSnapshot: expect.objectContaining({ price: 1200 }),
          }),
        }),
      );
    });

    it('leaves the snapshot alone when other draft fields change', async () => {
      prisma.tenantContract.findFirst.mockResolvedValue(contractRecord());

      await service.updateContract(
        'contract-1',
        { notes: 'Called the owner', agreedPrice: 1000 },
        'admin-1',
        metadata,
      );

      const { data } = tx.tenantContract.update.mock.calls[0][0];
      expect(data).not.toHaveProperty('planSnapshot');
    });

    it('refuses to change plan, price or currency once signed', async () => {
      prisma.tenantContract.findFirst.mockResolvedValue(
        contractRecord({ status: ContractStatus.ACTIVE }),
      );

      await expect(
        service.updateContract(
          'contract-1',
          { planId: '6a1f7f5e-0000-4000-8000-000000000000' },
          'admin-1',
          metadata,
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.updateContract(
          'contract-1',
          { currency: 'USD' },
          'admin-1',
          metadata,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('lets a signed contract change non-commercial fields without touching the snapshot', async () => {
      prisma.tenantContract.findFirst.mockResolvedValue(
        contractRecord({ status: ContractStatus.ACTIVE }),
      );

      await service.updateContract(
        'contract-1',
        { notes: 'Renewal call in May' },
        'admin-1',
        metadata,
      );

      const { data } = tx.tenantContract.update.mock.calls[0][0];
      expect(data).toEqual({ notes: 'Renewal call in May' });
    });
  });
});
