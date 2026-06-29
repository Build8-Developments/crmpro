import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { TenantStatus } from '@crmpro/database';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { TENANT_ACCESS_MESSAGES } from '../../../common/tenant-access/tenant-access.constants';
import { TenantAccessService } from '../../../common/tenant-access/tenant-access.service';
import { UsersService } from '../../users/users.service';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy tenant suspension enforcement', () => {
  let strategy: JwtStrategy;
  let usersService: { findById: jest.Mock };
  let prisma: { userSession: { findUnique: jest.Mock } };
  let tenantAccessService: { assertTenantAccessible: jest.Mock };

  const activeUser = {
    id: 'user-1',
    tenantId: 'tenant-1',
    roleId: 'role-1',
    deletedAt: null,
    isActive: true,
    role: { id: 'role-1', name: 'Owner' },
    tenant: {
      id: 'tenant-1',
      deletedAt: null,
      status: TenantStatus.ACTIVE,
    },
  };

  const payload = {
    sub: 'user-1',
    tenantId: 'tenant-1',
    roleId: 'role-1',
    sessionId: 'session-1',
  };

  beforeEach(async () => {
    usersService = {
      findById: jest.fn().mockResolvedValue(activeUser),
    };
    prisma = {
      userSession: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'session-1',
          userId: 'user-1',
          revokedAt: null,
          expiresAt: new Date('2099-01-01'),
        }),
      },
    };
    tenantAccessService = {
      assertTenantAccessible: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: jest.fn().mockReturnValue('test-secret'),
          },
        },
        { provide: UsersService, useValue: usersService },
        { provide: PrismaService, useValue: prisma },
        { provide: TenantAccessService, useValue: tenantAccessService },
      ],
    }).compile();

    strategy = module.get(JwtStrategy);
  });

  it('blocks protected access when tenant becomes suspended after login', async () => {
    tenantAccessService.assertTenantAccessible.mockRejectedValue(
      new ForbiddenException(TENANT_ACCESS_MESSAGES.SUSPENDED),
    );

    await expect(strategy.validate(payload)).rejects.toThrow(
      ForbiddenException,
    );

    expect(tenantAccessService.assertTenantAccessible).toHaveBeenCalledWith(
      'tenant-1',
    );
    expect(prisma.userSession.findUnique).not.toHaveBeenCalled();
  });

  it('allows protected access for active tenants', async () => {
    await expect(strategy.validate(payload)).resolves.toEqual({
      id: 'user-1',
      tenantId: 'tenant-1',
      roleId: 'role-1',
      sessionId: 'session-1',
    });
  });

  it('rejects invalid sessions before tenant access check', async () => {
    prisma.userSession.findUnique.mockResolvedValue({
      id: 'session-1',
      userId: 'user-1',
      revokedAt: new Date(),
      expiresAt: new Date('2099-01-01'),
    });

    await expect(strategy.validate(payload)).rejects.toThrow(
      UnauthorizedException,
    );
  });
});
