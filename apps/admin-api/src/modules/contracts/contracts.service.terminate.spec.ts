import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ContractStatus,
  ContractTerminationMode,
  TenantStatus,
} from '@crmpro/database';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ContractsAuditService } from './services/contracts-audit.service';
import { ContractEntitlementSyncService } from './services/contract-entitlement-sync.service';
import { ContractsService } from './contracts.service';

describe('ContractsService terminateContract', () => {
  let service: ContractsService;

  const NOW = new Date('2026-11-23T10:00:00.000Z');

  const metadata = {
    ipAddress: '127.0.0.1',
    userAgent: 'jest',
    fingerprint: 'fp',
    deviceName: null,
    country: null,
    city: null,
  };

  let prisma: {
    tenantContract: { findFirst: jest.Mock; update: jest.Mock };
    tenant: { update: jest.Mock };
    userSession: { updateMany: jest.Mock };
    $transaction: jest.Mock;
  };

  let auditService: {
    logContractTerminated: jest.Mock;
    logTenantSuspendedByTermination: jest.Mock;
  };

  const plan = {
    id: 'plan-1',
    name: 'Growth',
    isActive: true,
    maxUsers: 20,
    maxLeads: 10000,
    maxProjects: 100,
    maxStorageBytes: 1000n,
    featureFlags: { analytics: true },
  };

  const baseContract = {
    id: 'contract-1',
    status: ContractStatus.ACTIVE as ContractStatus,
    tenantId: 'tenant-1' as string | null,
    contractEndAt: new Date('2026-12-31T00:00:00.000Z') as Date | null,
    gracePeriodDays: 14 as number | null,
    deletedAt: null,
    planId: 'plan-1',
    plan,
    planSnapshot: null,
    terminatedAt: null,
    terminationMode: null,
    accessEndsAt: null,
    createdByAdmin: { id: 'admin-1', fullName: 'Admin', email: 'a@x.com' },
    contractStartAt: new Date('2026-01-01'),
    contractName: 'Deal',
    agreedPrice: { toNumber: () => 1000 },
    currency: 'EGP',
    paymentMethod: 'BANK_TRANSFER',
    paymentFrequency: 'MONTHLY',
    discountPercent: null,
    autoRenew: false,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdByAdminId: 'admin-1',
  };

  async function setup(contract = baseContract) {
    auditService = {
      logContractTerminated: jest.fn().mockResolvedValue(undefined),
      logTenantSuspendedByTermination: jest.fn().mockResolvedValue(undefined),
    };

    prisma = {
      tenantContract: {
        findFirst: jest.fn().mockResolvedValue(contract),
        update: jest
          .fn()
          .mockImplementation(({ data }) =>
            Promise.resolve({ ...contract, ...data }),
          ),
      },
      tenant: { update: jest.fn().mockResolvedValue({}) },
      userSession: { updateMany: jest.fn().mockResolvedValue({ count: 3 }) },
      $transaction: jest.fn(),
    };
    // Interactive transaction: run the callback against the same mock client.
    prisma.$transaction.mockImplementation(
      (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContractsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ContractsAuditService, useValue: auditService },
        { provide: ContractEntitlementSyncService, useValue: {} },
      ],
    }).compile();

    service = module.get(ContractsService);
  }

  beforeEach(async () => {
    jest.useFakeTimers({ now: NOW });
    await setup();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('FULL_ACCESS keeps the tenant active until contract end + grace', async () => {
    const result = await service.terminateContract(
      'contract-1',
      { mode: ContractTerminationMode.FULL_ACCESS, reason: ' Churned ' },
      'admin-1',
      metadata,
    );

    expect(prisma.tenantContract.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          status: ContractStatus.TERMINATED,
          terminatedAt: NOW,
          terminationMode: ContractTerminationMode.FULL_ACCESS,
          accessEndsAt: new Date('2027-01-14T23:59:59.999Z'),
        },
      }),
    );
    expect(prisma.tenant.update).not.toHaveBeenCalled();
    expect(prisma.userSession.updateMany).not.toHaveBeenCalled();
    expect(auditService.logTenantSuspendedByTermination).not.toHaveBeenCalled();

    expect(auditService.logContractTerminated).toHaveBeenCalledWith(
      'admin-1',
      'contract-1',
      metadata,
      expect.objectContaining({
        tenantId: 'tenant-1',
        mode: ContractTerminationMode.FULL_ACCESS,
        reason: 'Churned',
        gracePeriodDays: 14,
        accessEndsAt: '2027-01-14T23:59:59.999Z',
        tenantSuspended: false,
        revokedSessions: 0,
      }),
      // Written inside the termination transaction.
      prisma,
    );
    expect(result.termination).toEqual({
      terminatedAt: NOW,
      mode: ContractTerminationMode.FULL_ACCESS,
      accessEndsAt: new Date('2027-01-14T23:59:59.999Z'),
    });
  });

  it('READ_ONLY on an open-ended contract ends access at now + grace', async () => {
    await setup({ ...baseContract, contractEndAt: null, gracePeriodDays: 7 });

    await service.terminateContract(
      'contract-1',
      { mode: ContractTerminationMode.READ_ONLY },
      'admin-1',
      metadata,
    );

    expect(prisma.tenantContract.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          terminationMode: ContractTerminationMode.READ_ONLY,
          accessEndsAt: new Date('2026-11-30T23:59:59.999Z'),
        }),
      }),
    );
    expect(prisma.tenant.update).not.toHaveBeenCalled();
    expect(prisma.userSession.updateMany).not.toHaveBeenCalled();
    expect(auditService.logContractTerminated).toHaveBeenCalledWith(
      'admin-1',
      'contract-1',
      metadata,
      expect.objectContaining({
        mode: ContractTerminationMode.READ_ONLY,
        reason: null,
        accessEndsAt: '2026-11-30T23:59:59.999Z',
      }),
      prisma,
    );
  });

  it('IMMEDIATE suspends the tenant and revokes all its sessions, ignoring grace', async () => {
    await service.terminateContract(
      'contract-1',
      { mode: ContractTerminationMode.IMMEDIATE },
      'admin-1',
      metadata,
    );

    expect(prisma.tenantContract.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          terminationMode: ContractTerminationMode.IMMEDIATE,
          terminatedAt: NOW,
          accessEndsAt: NOW,
        }),
      }),
    );
    expect(prisma.tenant.update).toHaveBeenCalledWith({
      where: { id: 'tenant-1' },
      data: { status: TenantStatus.SUSPENDED },
    });
    expect(prisma.userSession.updateMany).toHaveBeenCalledWith({
      where: { revokedAt: null, user: { tenantId: 'tenant-1' } },
      data: { revokedAt: NOW },
    });
    expect(auditService.logTenantSuspendedByTermination).toHaveBeenCalledWith(
      'admin-1',
      'tenant-1',
      metadata,
      { contractId: 'contract-1', revokedSessions: 3 },
      prisma,
    );
    expect(auditService.logContractTerminated).toHaveBeenCalledWith(
      'admin-1',
      'contract-1',
      metadata,
      expect.objectContaining({
        mode: ContractTerminationMode.IMMEDIATE,
        accessEndsAt: NOW.toISOString(),
        tenantSuspended: true,
        revokedSessions: 3,
      }),
      prisma,
    );
  });

  it('IMMEDIATE on an unlinked contract only ends the contract', async () => {
    await setup({ ...baseContract, tenantId: null });

    await service.terminateContract(
      'contract-1',
      { mode: ContractTerminationMode.IMMEDIATE },
      'admin-1',
      metadata,
    );

    expect(prisma.tenant.update).not.toHaveBeenCalled();
    expect(prisma.userSession.updateMany).not.toHaveBeenCalled();
  });

  it('fails the whole termination when the audit write fails', async () => {
    auditService.logContractTerminated.mockRejectedValue(new Error('db down'));

    await expect(
      service.terminateContract(
        'contract-1',
        { mode: ContractTerminationMode.IMMEDIATE },
        'admin-1',
        metadata,
      ),
    ).rejects.toThrow('db down');
  });

  it('refuses an already terminated contract', async () => {
    await setup({ ...baseContract, status: ContractStatus.TERMINATED });

    await expect(
      service.terminateContract(
        'contract-1',
        { mode: ContractTerminationMode.FULL_ACCESS },
        'admin-1',
        metadata,
      ),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
