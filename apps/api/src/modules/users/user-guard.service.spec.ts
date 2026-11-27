import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PERMISSIONS } from '@crmpro/shared/auth';
import { TENANT_ROLE_NAMES } from '@crmpro/shared/bootstrap';
import { PermissionsService } from '../../common/auth/services/permissions.service';
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
        {
          provide: PermissionsService,
          useValue: {
            getPermissionKeysForUser: jest.fn(),
            getPermissionKeysForRole: jest.fn(),
          },
        },
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

describe('UserGuardService role assignment escalation protection', () => {
  let service: UserGuardService;
  let permissionsService: {
    getPermissionKeysForUser: jest.Mock;
    getPermissionKeysForRole: jest.Mock;
  };
  let prisma: {
    role: { findFirst: jest.Mock };
  };

  beforeEach(async () => {
    permissionsService = {
      getPermissionKeysForUser: jest.fn(),
      getPermissionKeysForRole: jest.fn(),
    };
    prisma = {
      role: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'role-owner',
          name: TENANT_ROLE_NAMES.owner,
          isSystem: true,
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserGuardService,
        { provide: PrismaService, useValue: prisma },
        { provide: PermissionsService, useValue: permissionsService },
      ],
    }).compile();

    service = module.get(UserGuardService);
  });

  it('rejects assigning a role with permissions the actor does not have', async () => {
    permissionsService.getPermissionKeysForUser.mockResolvedValue(
      new Set([PERMISSIONS.USER_CREATE, PERMISSIONS.USER_UPDATE]),
    );
    permissionsService.getPermissionKeysForRole.mockResolvedValue([
      PERMISSIONS.USER_CREATE,
      PERMISSIONS.USER_UPDATE,
      PERMISSIONS.BILLING_MANAGE,
    ]);

    await expect(
      service.assertActorCanAssignRole('tenant-1', 'manager-1', 'role-owner'),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows assigning a role whose permissions are a subset of the actor', async () => {
    permissionsService.getPermissionKeysForUser.mockResolvedValue(
      new Set([
        PERMISSIONS.USER_CREATE,
        PERMISSIONS.USER_UPDATE,
        PERMISSIONS.USER_READ,
      ]),
    );
    permissionsService.getPermissionKeysForRole.mockResolvedValue([
      PERMISSIONS.USER_CREATE,
      PERMISSIONS.USER_READ,
    ]);

    await expect(
      service.assertActorCanAssignRole('tenant-1', 'manager-1', 'role-agent'),
    ).resolves.toEqual({
      id: 'role-owner',
      name: TENANT_ROLE_NAMES.owner,
      isSystem: true,
    });
  });
});

describe('UserGuardService actor-versus-target protection', () => {
  let service: UserGuardService;
  let permissionsService: {
    getPermissionKeysForUser: jest.Mock;
    getPermissionKeysForRole: jest.Mock;
  };
  let prisma: { user: { findFirst: jest.Mock } };

  const userWithRole = (id: string, roleName: string) => ({
    id,
    tenantId: 'tenant-1',
    name: id,
    email: `${id}@example.com`,
    isActive: true,
    role: {
      id: `role-${roleName}`,
      name: roleName,
      tenantId: 'tenant-1',
      deletedAt: null,
    },
  });

  const target = (roleName: string) => userWithRole('target-1', roleName);

  beforeEach(async () => {
    permissionsService = {
      getPermissionKeysForUser: jest.fn(),
      getPermissionKeysForRole: jest.fn(),
    };
    prisma = { user: { findFirst: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserGuardService,
        { provide: PrismaService, useValue: prisma },
        { provide: PermissionsService, useValue: permissionsService },
      ],
    }).compile();

    service = module.get(UserGuardService);
  });

  it('rejects a non-Owner acting on an Owner even with every permission', async () => {
    prisma.user.findFirst.mockResolvedValue(
      userWithRole('admin-1', 'Workspace admin'),
    );
    permissionsService.getPermissionKeysForUser.mockResolvedValue(
      new Set(Object.values(PERMISSIONS)),
    );
    permissionsService.getPermissionKeysForRole.mockResolvedValue([
      PERMISSIONS.USER_MANAGE,
    ]);

    await expect(
      service.assertActorCanManageUser(
        'tenant-1',
        'admin-1',
        target(TENANT_ROLE_NAMES.owner),
      ),
    ).rejects.toThrow('Only an Owner can manage another Owner');
  });

  it('rejects acting on a user who holds permissions the actor lacks', async () => {
    prisma.user.findFirst.mockResolvedValue(
      userWithRole('manager-1', TENANT_ROLE_NAMES.manager),
    );
    permissionsService.getPermissionKeysForUser.mockResolvedValue(
      new Set([PERMISSIONS.USER_UPDATE, PERMISSIONS.LEAD_READ]),
    );
    permissionsService.getPermissionKeysForRole.mockResolvedValue([
      PERMISSIONS.LEAD_READ,
      PERMISSIONS.BILLING_MANAGE,
    ]);

    await expect(
      service.assertActorCanManageUser(
        'tenant-1',
        'manager-1',
        target('Finance'),
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows acting on a user whose permissions the actor holds', async () => {
    prisma.user.findFirst.mockResolvedValue(
      userWithRole('manager-1', TENANT_ROLE_NAMES.manager),
    );
    permissionsService.getPermissionKeysForUser.mockResolvedValue(
      new Set([PERMISSIONS.USER_UPDATE, PERMISSIONS.LEAD_READ]),
    );
    permissionsService.getPermissionKeysForRole.mockResolvedValue([
      PERMISSIONS.LEAD_READ,
    ]);

    await expect(
      service.assertActorCanManageUser(
        'tenant-1',
        'manager-1',
        target(TENANT_ROLE_NAMES.agent),
      ),
    ).resolves.toBeUndefined();
  });

  it('lets an Owner act on another Owner', async () => {
    prisma.user.findFirst.mockResolvedValue(
      userWithRole('owner-1', TENANT_ROLE_NAMES.owner),
    );
    permissionsService.getPermissionKeysForUser.mockResolvedValue(
      new Set(Object.values(PERMISSIONS)),
    );
    permissionsService.getPermissionKeysForRole.mockResolvedValue(
      Object.values(PERMISSIONS),
    );

    await expect(
      service.assertActorCanManageUser(
        'tenant-1',
        'owner-1',
        target(TENANT_ROLE_NAMES.owner),
      ),
    ).resolves.toBeUndefined();
  });

  it('leaves self-service actions to the endpoint rules', async () => {
    await expect(
      service.assertActorCanManageUser(
        'tenant-1',
        'target-1',
        target(TENANT_ROLE_NAMES.owner),
      ),
    ).resolves.toBeUndefined();
    expect(prisma.user.findFirst).not.toHaveBeenCalled();
  });
});
