import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TENANT_ROLE_NAMES } from '@crmpro/shared/bootstrap';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UserGuardService } from './services/user-guard.service';

describe('UserGuardService last owner protection', () => {
  let service: UserGuardService;
  let prisma: {
    user: {
      findFirst: jest.Mock;
      count: jest.Mock;
    };
  };

  const ownerUser = {
    id: 'owner-1',
    tenantId: 'tenant-1',
    name: 'Owner User',
    email: 'owner@example.com',
    isActive: true,
    role: {
      id: 'role-owner',
      name: TENANT_ROLE_NAMES.owner,
      tenantId: 'tenant-1',
      deletedAt: null,
    },
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserGuardService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(UserGuardService);
  });

  it('rejects deactivating the last active owner', async () => {
    prisma.user.findFirst.mockResolvedValue(ownerUser);
    prisma.user.count.mockResolvedValue(0);

    await expect(
      service.assertNotLastOwner('tenant-1', 'owner-1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('rejects demoting the last active owner', async () => {
    prisma.user.findFirst.mockResolvedValue(ownerUser);
    prisma.user.count.mockResolvedValue(0);

    await expect(
      service.assertOwnerRoleChangeAllowed(
        'tenant-1',
        'owner-1',
        TENANT_ROLE_NAMES.manager,
      ),
    ).rejects.toThrow(BadRequestException);
  });
});
