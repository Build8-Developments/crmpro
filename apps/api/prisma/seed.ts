import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, TenantStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const GB = 1024n ** 3n;

const PLAN_IDS = {
  starter: '11111111-1111-4111-8111-111111111101',
  growth: '11111111-1111-4111-8111-111111111102',
  enterprise: '11111111-1111-4111-8111-111111111103',
} as const;

const TENANT_ID = '22222222-2222-4222-8222-222222222201';

const ROLE_IDS = {
  owner: '33333333-3333-4333-8333-333333333301',
  manager: '33333333-3333-4333-8333-333333333302',
  agent: '33333333-3333-4333-8333-333333333303',
} as const;

const SUBSCRIPTION_PLANS = [
  {
    id: PLAN_IDS.starter,
    name: 'Starter',
    description: 'For small agencies getting started with CRMPro.',
    maxUsers: 5,
    maxStorageBytes: 5n * GB,
    maxLeads: 500,
    maxProjects: 20,
    featureFlags: { exportsEnabled: false, aiEnabled: false },
  },
  {
    id: PLAN_IDS.growth,
    name: 'Growth',
    description: 'For growing agencies that need more capacity and exports.',
    maxUsers: 25,
    maxStorageBytes: 50n * GB,
    maxLeads: 5000,
    maxProjects: 200,
    featureFlags: { exportsEnabled: true, aiEnabled: false },
  },
  {
    id: PLAN_IDS.enterprise,
    name: 'Enterprise',
    description: 'For large agencies with advanced needs and higher limits.',
    maxUsers: 1000,
    maxStorageBytes: 500n * GB,
    maxLeads: 100_000,
    maxProjects: 10_000,
    featureFlags: { exportsEnabled: true, aiEnabled: true },
  },
] as const;

const PERMISSIONS = [
  { key: 'lead.create', description: 'Create new leads' },
  { key: 'lead.read', description: 'View leads' },
  { key: 'lead.update', description: 'Update lead details' },
  { key: 'lead.delete', description: 'Delete leads' },
  { key: 'lead.assign', description: 'Assign leads to team members' },
  { key: 'project.create', description: 'Create projects' },
  { key: 'project.read', description: 'View projects' },
  { key: 'project.update', description: 'Update projects' },
  { key: 'project.delete', description: 'Delete projects' },
  { key: 'user.create', description: 'Create users' },
  { key: 'user.read', description: 'View users' },
  { key: 'user.update', description: 'Update users' },
  { key: 'user.delete', description: 'Delete users' },
  { key: 'role.create', description: 'Create custom roles' },
  { key: 'role.read', description: 'View roles' },
  { key: 'role.update', description: 'Update roles' },
  { key: 'role.delete', description: 'Delete roles' },
  { key: 'file.upload', description: 'Upload files' },
  { key: 'file.read', description: 'View and download files' },
  { key: 'file.delete', description: 'Delete files' },
  { key: 'tenant.manage', description: 'Manage tenant settings' },
  { key: 'billing.manage', description: 'Manage billing and subscription' },
] as const;

const TENANT_ROLES = [
  {
    id: ROLE_IDS.owner,
    name: 'Owner',
    description: 'Full access to all tenant features and settings.',
  },
  {
    id: ROLE_IDS.manager,
    name: 'Manager',
    description: 'Manages team operations without billing access.',
  },
  {
    id: ROLE_IDS.agent,
    name: 'Agent',
    description: 'Day-to-day sales work on leads and projects.',
  },
] as const;

const AGENT_PERMISSION_KEYS = [
  'lead.read',
  'lead.update',
  'lead.assign',
  'project.read',
  'file.upload',
  'file.read',
] as const;

const SAMPLE_USERS = [
  {
    name: 'Seif Admin',
    email: 'owner@primeestates.com',
    phone: '+201001234567',
    roleId: ROLE_IDS.owner,
  },
  {
    name: 'Sales Manager',
    email: 'manager@primeestates.com',
    phone: '+201009876543',
    roleId: ROLE_IDS.manager,
  },
  {
    name: 'Senior Agent',
    email: 'agent@primeestates.com',
    roleId: ROLE_IDS.agent,
  },
] as const;

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  }),
});

async function seedSubscriptionPlans(): Promise<void> {
  for (const plan of SUBSCRIPTION_PLANS) {
    await prisma.subscriptionPlan.upsert({
      where: { id: plan.id },
      create: plan,
      update: {
        name: plan.name,
        description: plan.description,
        maxUsers: plan.maxUsers,
        maxStorageBytes: plan.maxStorageBytes,
        maxLeads: plan.maxLeads,
        maxProjects: plan.maxProjects,
        featureFlags: plan.featureFlags,
      },
    });
  }
}

async function seedPermissions(): Promise<Map<string, string>> {
  const permissionIds = new Map<string, string>();

  for (const permission of PERMISSIONS) {
    const record = await prisma.permission.upsert({
      where: { key: permission.key },
      create: permission,
      update: { description: permission.description },
    });
    permissionIds.set(permission.key, record.id);
  }

  return permissionIds;
}

async function seedTenant(): Promise<void> {
  await prisma.tenant.upsert({
    where: { slug: 'prime-estates' },
    create: {
      id: TENANT_ID,
      name: 'Prime Estates',
      slug: 'prime-estates',
      status: TenantStatus.ACTIVE,
      subscriptionPlanId: PLAN_IDS.growth,
      storageUsedBytes: 0n,
    },
    update: {
      name: 'Prime Estates',
      status: TenantStatus.ACTIVE,
      subscriptionPlanId: PLAN_IDS.growth,
    },
  });
}

async function seedRoles(): Promise<void> {
  for (const role of TENANT_ROLES) {
    await prisma.role.upsert({
      where: { id: role.id },
      create: {
        id: role.id,
        tenantId: TENANT_ID,
        name: role.name,
        description: role.description,
        isSystem: true,
      },
      update: {
        name: role.name,
        description: role.description,
        isSystem: true,
        tenantId: TENANT_ID,
      },
    });
  }
}

async function syncRolePermissions(
  roleId: string,
  permissionKeys: string[],
  permissionIds: Map<string, string>,
): Promise<void> {
  const allowedPermissionIds = permissionKeys.map((key) => {
    const id = permissionIds.get(key);
    if (!id) {
      throw new Error(`Unknown permission key: ${key}`);
    }
    return id;
  });

  for (const permissionId of allowedPermissionIds) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId, permissionId },
      },
      create: { roleId, permissionId },
      update: {},
    });
  }

  await prisma.rolePermission.deleteMany({
    where: {
      roleId,
      permissionId: { notIn: allowedPermissionIds },
    },
  });
}

async function seedRolePermissions(
  permissionIds: Map<string, string>,
): Promise<void> {
  const allPermissionKeys = PERMISSIONS.map((permission) => permission.key);
  const managerPermissionKeys = allPermissionKeys.filter(
    (key) => key !== 'billing.manage',
  );

  await syncRolePermissions(ROLE_IDS.owner, allPermissionKeys, permissionIds);
  await syncRolePermissions(
    ROLE_IDS.manager,
    managerPermissionKeys,
    permissionIds,
  );
  await syncRolePermissions(
    ROLE_IDS.agent,
    [...AGENT_PERMISSION_KEYS],
    permissionIds,
  );
}

async function seedUsers(passwordHash: string): Promise<void> {
  for (const user of SAMPLE_USERS) {
    await prisma.user.upsert({
      where: {
        tenantId_email: {
          tenantId: TENANT_ID,
          email: user.email,
        },
      },
      create: {
        tenantId: TENANT_ID,
        roleId: user.roleId,
        name: user.name,
        email: user.email,
        phone: 'phone' in user ? user.phone : undefined,
        passwordHash,
        isActive: true,
      },
      update: {
        name: user.name,
        roleId: user.roleId,
        phone: 'phone' in user ? user.phone : null,
        passwordHash,
        isActive: true,
      },
    });
  }
}

async function main(): Promise<void> {
  console.log('Seeding Phase 1 foundation data...\n');

  const passwordHash = await argon2.hash('Password123!');

  await seedSubscriptionPlans();
  console.log('✓ Seeded subscription plans');

  const permissionIds = await seedPermissions();
  console.log('✓ Seeded permissions');

  await seedTenant();
  console.log('✓ Seeded tenant (Prime Estates)');

  await seedRoles();
  console.log('✓ Seeded roles');

  await seedRolePermissions(permissionIds);
  console.log('✓ Seeded role permissions');

  await seedUsers(passwordHash);
  console.log('✓ Seeded users');

  console.log('\nSeed complete.');
  console.log('Sample login password for all users: Password123!');
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
