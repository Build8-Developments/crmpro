import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  ContractStatus,
  ContractTerminationMode,
  TenantStatus,
} from '@crmpro/database';
import { PrismaService } from '../prisma/prisma.service';
import {
  TENANT_ACCESS_MESSAGES,
  TENANT_ACCESS_STATE_CACHE_TTL_MS,
} from './tenant-access.constants';
import { TenantInactiveException } from './tenant-access.exception';
import { TenantAccessService } from './tenant-access.service';

describe('TenantAccessService', () => {
  let service: TenantAccessService;
  let prisma: {
    tenant: { findFirst: jest.Mock };
    tenantContract: { findFirst: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      tenant: {
        findFirst: jest.fn(),
      },
      tenantContract: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TenantAccessService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(TenantAccessService);
  });

  function mockActiveTenant(): void {
    prisma.tenant.findFirst.mockResolvedValue({
      id: 'tenant-1',
      status: TenantStatus.ACTIVE,
    });
  }

  it('allows ACTIVE tenants with an in-term active contract', async () => {
    mockActiveTenant();
    prisma.tenantContract.findFirst.mockResolvedValue({
      contractEndAt: new Date('2027-01-01T00:00:00.000Z'),
      gracePeriodDays: 10,
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await expect(
      service.assertTenantAccessible('tenant-1'),
    ).resolves.toBeUndefined();
  });

  it('allows ACTIVE tenants during post-termination grace', async () => {
    mockActiveTenant();
    prisma.tenantContract.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        contractEndAt: new Date('2026-06-01T00:00:00.000Z'),
        gracePeriodDays: 30,
        updatedAt: new Date('2026-06-02T00:00:00.000Z'),
      });

    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-20T12:00:00.000Z'));

    await expect(
      service.assertTenantAccessible('tenant-1'),
    ).resolves.toBeUndefined();

    jest.useRealTimers();
  });

  it('blocks tenants after grace has expired', async () => {
    mockActiveTenant();
    prisma.tenantContract.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        contractEndAt: new Date('2026-05-01T00:00:00.000Z'),
        gracePeriodDays: 7,
        updatedAt: new Date('2026-05-02T00:00:00.000Z'),
      });

    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-01T00:00:00.000Z'));

    await expect(service.assertTenantAccessible('tenant-1')).rejects.toThrow(
      new ForbiddenException(TENANT_ACCESS_MESSAGES.CONTRACT_LAPSED),
    );

    jest.useRealTimers();
  });

  it('blocks SUSPENDED tenants with suspended message', async () => {
    prisma.tenant.findFirst.mockResolvedValue({
      id: 'tenant-1',
      status: TenantStatus.SUSPENDED,
    });

    await expect(service.assertTenantAccessible('tenant-1')).rejects.toThrow(
      new ForbiddenException(TENANT_ACCESS_MESSAGES.SUSPENDED),
    );
    await expect(
      service.assertTenantAccessible('tenant-1'),
    ).rejects.toBeInstanceOf(TenantInactiveException);
  });

  it('blocks CANCELLED tenants with inactive message', async () => {
    prisma.tenant.findFirst.mockResolvedValue({
      id: 'tenant-1',
      status: TenantStatus.CANCELLED,
    });

    await expect(service.assertTenantAccessible('tenant-1')).rejects.toThrow(
      new ForbiddenException(TENANT_ACCESS_MESSAGES.INACTIVE),
    );
  });

  it('blocks missing tenants', async () => {
    prisma.tenant.findFirst.mockResolvedValue(null);

    await expect(service.assertTenantAccessible('tenant-1')).rejects.toThrow(
      new ForbiddenException(TENANT_ACCESS_MESSAGES.INACTIVE),
    );
  });

  it('blocks ACTIVE tenants with an active contract past end + grace', async () => {
    mockActiveTenant();
    prisma.tenantContract.findFirst.mockResolvedValueOnce({
      contractEndAt: new Date('2026-01-01T00:00:00.000Z'),
      gracePeriodDays: 0,
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-02-01T00:00:00.000Z'));

    await expect(service.assertTenantAccessible('tenant-1')).rejects.toThrow(
      TENANT_ACCESS_MESSAGES.CONTRACT_LAPSED,
    );

    jest.useRealTimers();
  });

  it('allows TRIAL tenants that have never had a contract', async () => {
    prisma.tenant.findFirst.mockResolvedValue({
      id: 'tenant-1',
      status: TenantStatus.TRIAL,
    });
    prisma.tenantContract.findFirst.mockResolvedValue(null);

    await expect(
      service.assertTenantAccessible('tenant-1'),
    ).resolves.toBeUndefined();
  });

  it('allows ACTIVE tenants that have never had a contract', async () => {
    mockActiveTenant();
    prisma.tenantContract.findFirst.mockResolvedValue(null);

    await expect(
      service.assertTenantAccessible('tenant-1'),
    ).resolves.toBeUndefined();
  });

  it('blocks TRIAL tenants once a contract has lapsed past grace', async () => {
    prisma.tenant.findFirst.mockResolvedValue({
      id: 'tenant-1',
      status: TenantStatus.TRIAL,
    });
    prisma.tenantContract.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        contractEndAt: new Date('2026-05-01T00:00:00.000Z'),
        gracePeriodDays: 7,
        updatedAt: new Date('2026-05-02T00:00:00.000Z'),
      });

    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-06-01T00:00:00.000Z'));

    await expect(service.assertTenantAccessible('tenant-1')).rejects.toThrow(
      TENANT_ACCESS_MESSAGES.CONTRACT_LAPSED,
    );

    jest.useRealTimers();
  });
  describe('terminated contracts', () => {
    const terminated = (
      mode: ContractTerminationMode,
      accessEndsAt: string,
    ) => ({
      status: ContractStatus.TERMINATED,
      contractEndAt: new Date('2026-12-31T00:00:00.000Z'),
      gracePeriodDays: 10,
      // Old updatedAt: access must come from accessEndsAt, not updatedAt.
      updatedAt: new Date('2025-01-01T00:00:00.000Z'),
      terminationMode: mode,
      accessEndsAt: new Date(accessEndsAt),
    });

    beforeEach(() => {
      mockActiveTenant();
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2027-01-05T12:00:00.000Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('READ_ONLY: accessible but read-only until accessEndsAt', async () => {
      prisma.tenantContract.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(
          terminated(
            ContractTerminationMode.READ_ONLY,
            '2027-01-10T23:59:59.999Z',
          ),
        );

      await expect(service.getTenantAccessState('tenant-1')).resolves.toEqual({
        readOnly: true,
        accessEndsAt: new Date('2027-01-10T23:59:59.999Z'),
      });
    });

    it('FULL_ACCESS: full use until accessEndsAt', async () => {
      prisma.tenantContract.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(
          terminated(
            ContractTerminationMode.FULL_ACCESS,
            '2027-01-10T23:59:59.999Z',
          ),
        );

      await expect(service.getTenantAccessState('tenant-1')).resolves.toEqual({
        readOnly: false,
        accessEndsAt: new Date('2027-01-10T23:59:59.999Z'),
      });
    });

    it('locks the workspace once accessEndsAt has passed', async () => {
      prisma.tenantContract.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(
          terminated(
            ContractTerminationMode.READ_ONLY,
            '2027-01-04T23:59:59.999Z',
          ),
        );

      await expect(service.assertTenantAccessible('tenant-1')).rejects.toThrow(
        TENANT_ACCESS_MESSAGES.CONTRACT_LAPSED,
      );
    });

    it('IMMEDIATE: no access left (accessEndsAt is the termination time)', async () => {
      prisma.tenantContract.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(
          terminated(
            ContractTerminationMode.IMMEDIATE,
            '2027-01-05T11:00:00.000Z',
          ),
        );

      await expect(service.assertTenantAccessible('tenant-1')).rejects.toThrow(
        TENANT_ACCESS_MESSAGES.CONTRACT_LAPSED,
      );
    });

    it('a newer active contract wins over a read-only termination', async () => {
      prisma.tenantContract.findFirst.mockResolvedValueOnce({
        status: ContractStatus.ACTIVE,
        contractEndAt: null,
        gracePeriodDays: null,
        updatedAt: new Date(),
        terminationMode: null,
        accessEndsAt: null,
      });

      await expect(service.getTenantAccessState('tenant-1')).resolves.toEqual({
        readOnly: false,
        accessEndsAt: null,
      });
    });
  });

  describe('getCachedTenantAccessState', () => {
    afterEach(() => {
      jest.useRealTimers();
    });

    it('serves the state from cache within the TTL, then reloads', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2027-01-05T12:00:00.000Z'));
      mockActiveTenant();
      prisma.tenantContract.findFirst.mockResolvedValue(null);

      await service.getCachedTenantAccessState('tenant-1');
      await service.getCachedTenantAccessState('tenant-1');
      expect(prisma.tenant.findFirst).toHaveBeenCalledTimes(1);

      jest.advanceTimersByTime(TENANT_ACCESS_STATE_CACHE_TTL_MS + 1);
      await service.getCachedTenantAccessState('tenant-1');
      expect(prisma.tenant.findFirst).toHaveBeenCalledTimes(2);
    });

    it('does not cache a refusal', async () => {
      prisma.tenant.findFirst.mockResolvedValue({
        id: 'tenant-1',
        status: TenantStatus.SUSPENDED,
      });

      await expect(
        service.getCachedTenantAccessState('tenant-1'),
      ).rejects.toBeInstanceOf(TenantInactiveException);
      await expect(
        service.getCachedTenantAccessState('tenant-1'),
      ).rejects.toBeInstanceOf(TenantInactiveException);
      expect(prisma.tenant.findFirst).toHaveBeenCalledTimes(2);
    });
  });
});
