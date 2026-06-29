import 'dotenv/config';
import { faker } from '@faker-js/faker';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  AuditActorType,
  FileAssetCategory,
  InterestLevel,
  JobStatus,
  LeadActivityEventType,
  LeadStatus,
  PipelineCloseType,
  Prisma,
  PrismaClient,
  TenantStatus,
  NotificationType,
  NotificationPriority,
  NotificationStatus,
  NotificationPreferenceCategory,
  ContractStatus,
  PaymentMethod,
  PaymentFrequency,
  AdminActorType,
  AdminSecurityEventType,
  SecuritySeverity,
} from '@prisma/client';
import * as argon2 from 'argon2';
import {
  AGENT_PERMISSION_KEYS,
  DEFAULT_LEAD_SOURCES,
  DEFAULT_PIPELINE,
  DEFAULT_PIPELINE_STAGES,
  DEFAULT_TENANT_ROLES,
  MANAGER_PERMISSION_KEYS,
  OWNER_PERMISSION_KEYS,
} from '@crmpro/shared/bootstrap';

const GB = 1024n ** 3n;
const MB = 1024n ** 2n;

const PLAN_IDS = {
  starter: '11111111-1111-4111-8111-111111111101',
  growth: '11111111-1111-4111-8111-111111111102',
  enterprise: '11111111-1111-4111-8111-111111111103',
  custom: '11111111-1111-4111-8111-111111111104',
} as const;

const TENANT_ID = '22222222-2222-4222-8222-222222222201';
const SECOND_TENANT_ID = '22222222-2222-4222-8222-222222222202';

const ROLE_IDS = {
  owner: '33333333-3333-4333-8333-333333333301',
  manager: '33333333-3333-4333-8333-333333333302',
  agent: '33333333-3333-4333-8333-333333333303',
} as const;

const DEFAULT_PIPELINE_ID = '44444444-4444-4444-8444-444444444401';
const COMMERCIAL_PIPELINE_ID = '44444444-4444-4444-8444-444444444402';

const DEVELOPER_IDS = {
  palmHills: '66666666-6666-4666-8666-666666666601',
  emaar: '66666666-6666-4666-8666-666666666602',
  tmg: '66666666-6666-4666-8666-666666666603',
  mountainView: '66666666-6666-4666-8666-666666666604',
  sodic: '66666666-6666-4666-8666-666666666605',
  hydePark: '66666666-6666-4666-8666-666666666606',
} as const;

const PROJECT_IDS = {
  palmHillsNewCairo: '77777777-7777-4777-8777-777777777701',
  palmHillsOctober: '77777777-7777-4777-8777-777777777702',
  badya: '77777777-7777-4777-8777-777777777703',
  uptownCairo: '77777777-7777-4777-8777-777777777704',
  mivida: '77777777-7777-4777-8777-777777777705',
  madinaty: '77777777-7777-4777-8777-777777777706',
  alRehab: '77777777-7777-4777-8777-777777777707',
  sarai: '77777777-7777-4777-8777-777777777708',
  mountainViewICity: '77777777-7777-4777-8777-777777777709',
  ilBosco: '77777777-7777-4777-8777-777777777710',
  theWaterway: '77777777-7777-4777-8777-777777777711',
  vyeKarnak: '77777777-7777-4777-8777-777777777712',
  hydeParkNewCairo: '77777777-7777-4777-8777-777777777713',
  eastown: '77777777-7777-4777-8777-777777777714',
} as const;

const SUBSCRIPTION_PLANS = [
  {
    id: PLAN_IDS.starter,
    name: 'Starter',
    description: 'For small agencies getting started with CRMPro.',
    isActive: true,
    defaultPrice: 3000,
    currency: 'EGP',
    maxUsers: 5,
    maxStorageBytes: 5n * GB,
    maxLeads: 1000,
    maxProjects: 10,
    featureFlags: {
      analytics: false,
      importExport: false,
      apiAccess: false,
      customBranding: false,
      prioritySupport: false,
    },
  },
  {
    id: PLAN_IDS.growth,
    name: 'Growth',
    description: 'For growing agencies that need more capacity and exports.',
    isActive: true,
    defaultPrice: 8000,
    currency: 'EGP',
    maxUsers: 20,
    maxStorageBytes: 50n * GB,
    maxLeads: 10_000,
    maxProjects: 100,
    featureFlags: {
      analytics: true,
      importExport: true,
      apiAccess: false,
      customBranding: false,
      prioritySupport: false,
    },
  },
  {
    id: PLAN_IDS.enterprise,
    name: 'Enterprise',
    description: 'For large agencies with advanced needs and higher limits.',
    isActive: true,
    defaultPrice: 25_000,
    currency: 'EGP',
    maxUsers: null,
    maxStorageBytes: 500n * GB,
    maxLeads: null,
    maxProjects: null,
    featureFlags: {
      analytics: true,
      importExport: true,
      apiAccess: true,
      customBranding: true,
      prioritySupport: true,
    },
  },
  {
    id: PLAN_IDS.custom,
    name: 'Custom',
    description: 'Manually negotiated plan with custom limits and pricing.',
    isActive: true,
    defaultPrice: null,
    currency: null,
    maxUsers: null,
    maxStorageBytes: null,
    maxLeads: null,
    maxProjects: null,
    featureFlags: {
      analytics: true,
      importExport: true,
      apiAccess: true,
      customBranding: true,
      prioritySupport: true,
    },
  },
] as const;

const PERMISSIONS = [
  { key: 'lead.create', description: 'Create new leads' },
  { key: 'lead.read', description: 'View leads' },
  { key: 'lead.update', description: 'Update lead details' },
  { key: 'lead.delete', description: 'Delete leads' },
  { key: 'lead.assign', description: 'Assign leads to team members' },
  { key: 'lead-note.create', description: 'Create lead notes' },
  { key: 'lead-note.read', description: 'View lead notes' },
  { key: 'lead-note.update', description: 'Update lead notes' },
  { key: 'lead-note.delete', description: 'Delete lead notes' },
  { key: 'lead-source.create', description: 'Create lead sources' },
  { key: 'lead-source.read', description: 'View lead sources' },
  { key: 'lead-source.update', description: 'Update lead sources' },
  { key: 'lead-source.delete', description: 'Delete lead sources' },
  { key: 'developer.create', description: 'Create developers' },
  { key: 'developer.read', description: 'View developers' },
  { key: 'developer.update', description: 'Update developers' },
  { key: 'developer.delete', description: 'Delete developers' },
  { key: 'project.create', description: 'Create projects' },
  { key: 'project.read', description: 'View projects' },
  { key: 'project.update', description: 'Update projects' },
  { key: 'project.delete', description: 'Delete projects' },
  { key: 'pipeline.create', description: 'Create pipelines' },
  { key: 'pipeline.read', description: 'View pipelines' },
  { key: 'pipeline.update', description: 'Update pipelines and stages' },
  { key: 'pipeline.delete', description: 'Delete pipelines' },
  { key: 'user.create', description: 'Create users' },
  { key: 'user.read', description: 'View users' },
  { key: 'user.update', description: 'Update users' },
  { key: 'user.delete', description: 'Delete users' },
  { key: 'user.manage', description: 'Reset passwords and revoke user sessions' },
  { key: 'role.create', description: 'Create custom roles' },
  { key: 'role.read', description: 'View roles' },
  { key: 'role.update', description: 'Update roles' },
  { key: 'role.delete', description: 'Delete roles' },
  { key: 'role.manage', description: 'Manage custom roles and permissions' },
  { key: 'file.upload', description: 'Upload files' },
  { key: 'file.read', description: 'View and download files' },
  { key: 'file.delete', description: 'Delete files' },
  { key: 'import-job.create', description: 'Create import jobs' },
  { key: 'import-job.read', description: 'View import jobs' },
  { key: 'export-job.create', description: 'Create export jobs' },
  { key: 'export-job.read', description: 'View export jobs' },
  { key: 'analytics.read', description: 'View analytics dashboard' },
  { key: 'notification.read', description: 'View notifications' },
  { key: 'notification.update', description: 'Mark notifications as read' },
  { key: 'notification.delete', description: 'Delete notifications' },
  { key: 'audit.read', description: 'View business audit logs' },
  { key: 'tenant.manage', description: 'Manage tenant settings' },
  { key: 'billing.manage', description: 'Manage billing and subscription' },
] as const;

const ADMIN_ROLE_IDS = {
  superAdmin: '88888888-8888-4888-8888-888888888801',
  support: '88888888-8888-4888-8888-888888888802',
  billing: '88888888-8888-4888-8888-888888888803',
  readonly: '88888888-8888-4888-8888-888888888804',
} as const;

const INITIAL_PLATFORM_ADMIN_ID = '99999999-9999-4999-8999-999999999901';

const ADMIN_AUDIT_IDS = {
  tenantCreated: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb001',
  contractCreated: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb002',
  login: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbb003',
} as const;

const ADMIN_SECURITY_EVENT_IDS = {
  loginSuccess: 'cccccccc-cccc-4ccc-8ccc-cccccccccc01',
  loginFailed: 'cccccccc-cccc-4ccc-8ccc-cccccccccc02',
  tokenRefresh: 'cccccccc-cccc-4ccc-8ccc-cccccccccc03',
} as const;

const CONTRACT_IDS = {
  primeEstatesGrowth: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01',
  vipEnterprise: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa02',
} as const;

const ADMIN_PERMISSIONS = [
  { key: 'admin.manage', description: 'Manage platform administrators' },
  { key: 'tenant.read', description: 'View tenants' },
  { key: 'tenant.create', description: 'Create tenants' },
  { key: 'tenant.update', description: 'Update tenants' },
  { key: 'tenant.suspend', description: 'Suspend tenants' },
  { key: 'plan.read', description: 'View subscription plans' },
  { key: 'plan.create', description: 'Create subscription plans' },
  { key: 'plan.update', description: 'Update subscription plans' },
  { key: 'plan.delete', description: 'Delete subscription plans' },
  { key: 'contract.read', description: 'View tenant contracts' },
  { key: 'contract.create', description: 'Create tenant contracts' },
  { key: 'contract.update', description: 'Update tenant contracts' },
  { key: 'contract.terminate', description: 'Terminate tenant contracts' },
  {
    key: 'platform-analytics.read',
    description: 'View platform analytics',
  },
  { key: 'audit.read', description: 'View admin audit logs' },
  { key: 'support.access', description: 'Access support tools' },
] as const;

const ADMIN_ROLES = [
  { id: ADMIN_ROLE_IDS.superAdmin, name: 'SUPER_ADMIN' },
  { id: ADMIN_ROLE_IDS.support, name: 'SUPPORT' },
  { id: ADMIN_ROLE_IDS.billing, name: 'BILLING' },
  { id: ADMIN_ROLE_IDS.readonly, name: 'READONLY' },
] as const;

const SUPPORT_ADMIN_PERMISSION_KEYS = [
  'tenant.read',
  'plan.read',
  'contract.read',
  'audit.read',
  'platform-analytics.read',
  'support.access',
] as const;

const BILLING_ADMIN_PERMISSION_KEYS = [
  'plan.read',
  'plan.update',
  'tenant.read',
  'contract.read',
  'contract.create',
  'contract.update',
  'contract.terminate',
] as const;

const READONLY_ADMIN_PERMISSION_KEYS = [
  'tenant.read',
  'plan.read',
  'contract.read',
  'audit.read',
  'platform-analytics.read',
] as const;

const TENANT_ROLES = [
  { id: ROLE_IDS.owner, ...DEFAULT_TENANT_ROLES[0] },
  { id: ROLE_IDS.manager, ...DEFAULT_TENANT_ROLES[1] },
  { id: ROLE_IDS.agent, ...DEFAULT_TENANT_ROLES[2] },
] as const;

/** Demo-only lead sources beyond bootstrap defaults (not used for provisioning). */
const DEMO_EXTRA_LEAD_SOURCE_NAMES = [
  'WhatsApp',
  'Call Center',
  'Walk-in',
] as const;

const SAMPLE_USERS = [
  {
    id: '55555555-5555-4555-8555-555555555501',
    name: 'Seif Admin',
    email: 'owner@primeestates.com',
    phone: '+201001234567',
    roleId: ROLE_IDS.owner,
  },
  {
    id: '55555555-5555-4555-8555-555555555502',
    name: 'Sales Manager',
    email: 'manager@primeestates.com',
    phone: '+201009876543',
    roleId: ROLE_IDS.manager,
  },
  {
    id: '55555555-5555-4555-8555-555555555503',
    name: 'Senior Agent',
    email: 'agent@primeestates.com',
    roleId: ROLE_IDS.agent,
  },
] as const;

const SAMPLE_DEVELOPERS = [
  { id: DEVELOPER_IDS.palmHills, name: 'Palm Hills Developments' },
  { id: DEVELOPER_IDS.emaar, name: 'Emaar Misr' },
  { id: DEVELOPER_IDS.tmg, name: 'Talaat Moustafa Group' },
  { id: DEVELOPER_IDS.mountainView, name: 'Mountain View' },
  { id: DEVELOPER_IDS.sodic, name: 'SODIC' },
  { id: DEVELOPER_IDS.hydePark, name: 'Hyde Park' },
] as const;

const SAMPLE_PROJECTS = [
  {
    id: PROJECT_IDS.palmHillsNewCairo,
    developerId: DEVELOPER_IDS.palmHills,
    name: 'Palm Hills New Cairo',
    location: 'New Cairo',
  },
  {
    id: PROJECT_IDS.palmHillsOctober,
    developerId: DEVELOPER_IDS.palmHills,
    name: 'Palm Hills October',
    location: '6th of October',
  },
  {
    id: PROJECT_IDS.badya,
    developerId: DEVELOPER_IDS.palmHills,
    name: 'Badya',
    location: '6th of October',
  },
  {
    id: PROJECT_IDS.uptownCairo,
    developerId: DEVELOPER_IDS.emaar,
    name: 'Uptown Cairo',
    location: 'New Cairo',
  },
  {
    id: PROJECT_IDS.mivida,
    developerId: DEVELOPER_IDS.emaar,
    name: 'Mivida',
    location: 'New Cairo',
  },
  {
    id: PROJECT_IDS.madinaty,
    developerId: DEVELOPER_IDS.tmg,
    name: 'Madinaty',
    location: 'New Cairo',
  },
  {
    id: PROJECT_IDS.alRehab,
    developerId: DEVELOPER_IDS.tmg,
    name: 'Al Rehab',
    location: 'New Cairo',
  },
  {
    id: PROJECT_IDS.sarai,
    developerId: DEVELOPER_IDS.tmg,
    name: 'Sarai',
    location: 'New Cairo',
  },
  {
    id: PROJECT_IDS.eastown,
    developerId: DEVELOPER_IDS.tmg,
    name: 'Eastown',
    location: 'New Cairo',
  },
  {
    id: PROJECT_IDS.mountainViewICity,
    developerId: DEVELOPER_IDS.mountainView,
    name: 'Mountain View iCity',
    location: 'New Cairo',
  },
  {
    id: PROJECT_IDS.ilBosco,
    developerId: DEVELOPER_IDS.mountainView,
    name: 'Il Bosco',
    location: 'New Capital',
  },
  {
    id: PROJECT_IDS.theWaterway,
    developerId: DEVELOPER_IDS.sodic,
    name: 'The Waterway',
    location: 'New Cairo',
  },
  {
    id: PROJECT_IDS.vyeKarnak,
    developerId: DEVELOPER_IDS.sodic,
    name: 'VYE Karnak',
    location: 'New Cairo',
  },
  {
    id: PROJECT_IDS.hydeParkNewCairo,
    developerId: DEVELOPER_IDS.hydePark,
    name: 'Hyde Park New Cairo',
    location: 'New Cairo',
  },
] as const;

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  }),
});

function initFaker(): void {
  const seed = process.env.SEED_RANDOM_SEED
    ? Number.parseInt(process.env.SEED_RANDOM_SEED, 10)
    : 42_026;
  faker.seed(seed);
  faker.setDefaultRefDate(new Date('2026-06-01'));
}

function normalizeEgyptPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('20')) {
    return `+${digits}`;
  }
  if (digits.startsWith('0')) {
    return `+20${digits.slice(1)}`;
  }
  return `+20${digits}`;
}

function egyptLocalPhone(): { raw: string; normalized: string } {
  const raw = `01${faker.string.numeric(9)}`;
  return { raw, normalized: normalizeEgyptPhone(raw) };
}

function objectKey(
  tenantId: string,
  category: string,
  filename: string,
): string {
  return `tenants/${tenantId}/${category.toLowerCase()}/${faker.string.uuid()}/${filename}`;
}

async function seedSubscriptionPlans(): Promise<void> {
  for (const plan of SUBSCRIPTION_PLANS) {
    await prisma.subscriptionPlan.upsert({
      where: { id: plan.id },
      create: plan,
      update: {
        name: plan.name,
        description: plan.description,
        isActive: plan.isActive,
        defaultPrice: plan.defaultPrice,
        currency: plan.currency,
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

async function seedAdminPermissions(): Promise<Map<string, string>> {
  const permissionIds = new Map<string, string>();

  for (const permission of ADMIN_PERMISSIONS) {
    const record = await prisma.adminPermission.upsert({
      where: { key: permission.key },
      create: permission,
      update: { description: permission.description },
    });
    permissionIds.set(permission.key, record.id);
  }

  return permissionIds;
}

async function seedAdminRoles(): Promise<void> {
  for (const role of ADMIN_ROLES) {
    await prisma.adminRole.upsert({
      where: { id: role.id },
      create: {
        id: role.id,
        name: role.name,
        isSystem: true,
      },
      update: {
        name: role.name,
        isSystem: true,
      },
    });
  }
}

async function syncAdminRolePermissions(
  roleId: string,
  permissionKeys: readonly string[],
  permissionIds: Map<string, string>,
): Promise<void> {
  const allowedPermissionIds = permissionKeys.map((key) => {
    const id = permissionIds.get(key);
    if (!id) {
      throw new Error(`Unknown admin permission key: ${key}`);
    }
    return id;
  });

  for (const permissionId of allowedPermissionIds) {
    await prisma.adminRolePermission.upsert({
      where: {
        roleId_permissionId: { roleId, permissionId },
      },
      create: { roleId, permissionId },
      update: {},
    });
  }

  await prisma.adminRolePermission.deleteMany({
    where: {
      roleId,
      permissionId: { notIn: allowedPermissionIds },
    },
  });
}

async function seedAdminRolePermissions(
  permissionIds: Map<string, string>,
): Promise<void> {
  const allAdminPermissionKeys = ADMIN_PERMISSIONS.map(
    (permission) => permission.key,
  );

  await syncAdminRolePermissions(
    ADMIN_ROLE_IDS.superAdmin,
    allAdminPermissionKeys,
    permissionIds,
  );
  await syncAdminRolePermissions(
    ADMIN_ROLE_IDS.support,
    SUPPORT_ADMIN_PERMISSION_KEYS,
    permissionIds,
  );
  await syncAdminRolePermissions(
    ADMIN_ROLE_IDS.billing,
    BILLING_ADMIN_PERMISSION_KEYS,
    permissionIds,
  );
  await syncAdminRolePermissions(
    ADMIN_ROLE_IDS.readonly,
    READONLY_ADMIN_PERMISSION_KEYS,
    permissionIds,
  );
}

async function seedInitialPlatformAdmin(passwordHash: string): Promise<void> {
  await prisma.platformAdmin.upsert({
    where: { email: 'admin@crmpro.local' },
    create: {
      id: INITIAL_PLATFORM_ADMIN_ID,
      email: 'admin@crmpro.local',
      passwordHash,
      fullName: 'System Administrator',
      roleId: ADMIN_ROLE_IDS.superAdmin,
      isActive: true,
    },
    update: {
      passwordHash,
      fullName: 'System Administrator',
      roleId: ADMIN_ROLE_IDS.superAdmin,
      isActive: true,
    },
  });
}

async function seedAdminAuditTrail(): Promise<void> {
  const auditLogs = [
    {
      id: ADMIN_AUDIT_IDS.tenantCreated,
      actorAdminId: INITIAL_PLATFORM_ADMIN_ID,
      actorType: AdminActorType.ADMIN,
      action: 'TENANT_CREATED',
      entityType: 'Tenant',
      entityId: TENANT_ID,
      ipAddress: '127.0.0.1',
      userAgent: 'seed-script',
      fingerprint: 'seed-local',
      metadata: {
        seed: true,
        contractId: CONTRACT_IDS.primeEstatesGrowth,
        ownerEmail: 'owner@primeestates.com',
      },
      createdAt: new Date('2026-06-15T10:00:00.000Z'),
    },
    {
      id: ADMIN_AUDIT_IDS.contractCreated,
      actorAdminId: INITIAL_PLATFORM_ADMIN_ID,
      actorType: AdminActorType.ADMIN,
      action: 'CONTRACT_CREATED',
      entityType: 'TenantContract',
      entityId: CONTRACT_IDS.primeEstatesGrowth,
      ipAddress: '127.0.0.1',
      userAgent: 'seed-script',
      fingerprint: 'seed-local',
      metadata: { seed: true, planId: PLAN_IDS.growth },
      createdAt: new Date('2026-06-14T09:00:00.000Z'),
    },
    {
      id: ADMIN_AUDIT_IDS.login,
      actorAdminId: INITIAL_PLATFORM_ADMIN_ID,
      actorType: AdminActorType.ADMIN,
      action: 'LOGIN',
      entityType: 'PlatformAdmin',
      entityId: INITIAL_PLATFORM_ADMIN_ID,
      ipAddress: '127.0.0.1',
      userAgent: 'seed-script',
      fingerprint: 'seed-local',
      metadata: { seed: true },
      createdAt: new Date('2026-06-16T08:30:00.000Z'),
    },
  ] as const;

  for (const log of auditLogs) {
    const { id, ...data } = log;
    await prisma.adminAuditLog.upsert({
      where: { id },
      create: log,
      update: data,
    });
  }

  const securityEvents = [
    {
      id: ADMIN_SECURITY_EVENT_IDS.loginSuccess,
      adminId: INITIAL_PLATFORM_ADMIN_ID,
      eventType: AdminSecurityEventType.LOGIN_SUCCESS,
      severity: SecuritySeverity.LOW,
      ipAddress: '127.0.0.1',
      userAgent: 'seed-script',
      fingerprint: 'seed-local',
      metadata: { seed: true },
      createdAt: new Date('2026-06-16T08:30:00.000Z'),
    },
    {
      id: ADMIN_SECURITY_EVENT_IDS.loginFailed,
      adminId: null,
      eventType: AdminSecurityEventType.LOGIN_FAILED,
      severity: SecuritySeverity.MEDIUM,
      ipAddress: '203.0.113.50',
      userAgent: 'suspicious-client',
      fingerprint: 'unknown-device',
      metadata: { seed: true, reason: 'not_found' },
      createdAt: new Date('2026-06-16T07:15:00.000Z'),
    },
    {
      id: ADMIN_SECURITY_EVENT_IDS.tokenRefresh,
      adminId: INITIAL_PLATFORM_ADMIN_ID,
      eventType: AdminSecurityEventType.TOKEN_REFRESH,
      severity: SecuritySeverity.LOW,
      ipAddress: '127.0.0.1',
      userAgent: 'seed-script',
      fingerprint: 'seed-local',
      metadata: { seed: true },
      createdAt: new Date('2026-06-16T09:00:00.000Z'),
    },
  ] as const;

  for (const event of securityEvents) {
    const { id, ...data } = event;
    await prisma.adminSecurityEvent.upsert({
      where: { id },
      create: event,
      update: data,
    });
  }
}

async function seedTenantContracts(): Promise<void> {
  const contracts = [
    {
      id: CONTRACT_IDS.primeEstatesGrowth,
      contractName: 'Prime Estates Growth Contract',
      planId: PLAN_IDS.growth,
      tenantId: TENANT_ID,
      agreedPrice: 7000,
      currency: 'EGP',
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      paymentFrequency: PaymentFrequency.MONTHLY,
      contractStartAt: new Date('2026-07-01T00:00:00.000Z'),
      contractEndAt: new Date('2027-07-01T00:00:00.000Z'),
      autoRenew: true,
      status: ContractStatus.ACTIVE,
      createdByAdminId: INITIAL_PLATFORM_ADMIN_ID,
    },
    {
      id: CONTRACT_IDS.vipEnterprise,
      contractName: 'VIP Enterprise Contract',
      planId: PLAN_IDS.enterprise,
      agreedPrice: 42000,
      currency: 'EGP',
      paymentMethod: PaymentMethod.CHEQUE,
      paymentFrequency: PaymentFrequency.QUARTERLY,
      contractStartAt: new Date('2026-07-01T00:00:00.000Z'),
      discountPercent: 15,
      status: ContractStatus.DRAFT,
      createdByAdminId: INITIAL_PLATFORM_ADMIN_ID,
    },
  ] as const;

  for (const contract of contracts) {
    const { id, ...data } = contract;
    await prisma.tenantContract.upsert({
      where: { id },
      create: contract,
      update: data,
    });
  }
}

async function seedTenants(): Promise<void> {
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

  await prisma.tenant.upsert({
    where: { slug: 'sunrise-properties' },
    create: {
      id: SECOND_TENANT_ID,
      name: 'Sunrise Properties',
      slug: 'sunrise-properties',
      status: TenantStatus.TRIAL,
      subscriptionPlanId: PLAN_IDS.starter,
      storageUsedBytes: 0n,
    },
    update: {
      name: 'Sunrise Properties',
      status: TenantStatus.TRIAL,
      subscriptionPlanId: PLAN_IDS.starter,
    },
  });
}

async function seedRoles(tenantId: string, roleDefs: typeof TENANT_ROLES): Promise<void> {
  for (const role of roleDefs) {
    await prisma.role.upsert({
      where: { id: role.id },
      create: {
        id: role.id,
        tenantId,
        name: role.name,
        description: role.description,
        isSystem: true,
      },
      update: {
        name: role.name,
        description: role.description,
        isSystem: true,
        tenantId,
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
  await syncRolePermissions(
    ROLE_IDS.owner,
    [...OWNER_PERMISSION_KEYS],
    permissionIds,
  );
  await syncRolePermissions(
    ROLE_IDS.manager,
    [...MANAGER_PERMISSION_KEYS],
    permissionIds,
  );
  await syncRolePermissions(
    ROLE_IDS.agent,
    [...AGENT_PERMISSION_KEYS],
    permissionIds,
  );
}

async function seedUsers(
  tenantId: string,
  users: typeof SAMPLE_USERS,
  passwordHash: string,
): Promise<string[]> {
  const userIds: string[] = [];

  for (const user of users) {
    const record = await prisma.user.upsert({
      where: {
        tenantId_email: {
          tenantId,
          email: user.email,
        },
      },
      create: {
        id: user.id,
        tenantId,
        roleId: user.roleId,
        name: user.name,
        email: user.email,
        phone: 'phone' in user ? user.phone : undefined,
        passwordHash,
        isActive: true,
        lastLoginAt: faker.date.recent({ days: 7 }),
      },
      update: {
        name: user.name,
        roleId: user.roleId,
        phone: 'phone' in user ? user.phone : null,
        passwordHash,
        isActive: true,
        lastLoginAt: faker.date.recent({ days: 7 }),
      },
    });
    userIds.push(record.id);
  }

  return userIds;
}

async function clearTenantSampleData(tenantId: string): Promise<void> {
  await prisma.exportJob.deleteMany({ where: { tenantId } });
  await prisma.importJob.deleteMany({ where: { tenantId } });
  await prisma.fileAsset.deleteMany({ where: { tenantId } });
  await prisma.auditLog.deleteMany({ where: { tenantId } });
  await prisma.lead.deleteMany({ where: { tenantId } });
  await prisma.notification.deleteMany({ where: { tenantId } });
  await prisma.notificationPreference.deleteMany({ where: { tenantId } });
  await prisma.pipeline.deleteMany({ where: { tenantId } });
  await prisma.leadSource.deleteMany({ where: { tenantId } });
  await prisma.project.deleteMany({ where: { tenantId } });
  await prisma.developer.deleteMany({ where: { tenantId } });
  await prisma.userSession.deleteMany({
    where: { user: { tenantId } },
  });

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { storageUsedBytes: 0n },
  });
}

async function seedUserSessions(
  tenantId: string,
  userIds: string[],
): Promise<void> {
  const refreshHash = await argon2.hash('seed-refresh-token-not-for-login');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  for (const userId of userIds) {
    await prisma.userSession.create({
      data: {
        userId,
        hashedRefreshToken: refreshHash,
        deviceName: faker.helpers.arrayElement([
          'Chrome on Windows',
          'Safari on iPhone',
          'Postman',
        ]),
        ipAddress: faker.internet.ipv4(),
        userAgent: faker.internet.userAgent(),
        expiresAt,
        revokedAt: faker.datatype.boolean({ probability: 0.2 })
          ? new Date()
          : null,
      },
    });
  }

  void tenantId;
}

async function seedDevelopers(tenantId: string): Promise<string[]> {
  const ids: string[] = [];

  for (const developer of SAMPLE_DEVELOPERS) {
    const record = await prisma.developer.create({
      data: {
        id: developer.id,
        tenantId,
        name: developer.name,
      },
    });
    ids.push(record.id);
  }

  return ids;
}

async function seedProjects(tenantId: string): Promise<string[]> {
  const ids: string[] = [];

  for (const project of SAMPLE_PROJECTS) {
    const record = await prisma.project.create({
      data: {
        id: project.id,
        tenantId,
        developerId: project.developerId,
        name: project.name,
        location: project.location,
        description: faker.lorem.paragraph(),
        isActive: true,
      },
    });
    ids.push(record.id);
  }

  return ids;
}

async function seedLeadSources(tenantId: string): Promise<string[]> {
  const ids: string[] = [];
  const names = [...DEFAULT_LEAD_SOURCES, ...DEMO_EXTRA_LEAD_SOURCE_NAMES];

  for (const name of names) {
    const source = await prisma.leadSource.create({
      data: { tenantId, name },
    });
    ids.push(source.id);
  }

  return ids;
}

type StageRecord = { id: string; isClosed: boolean; closeType: PipelineCloseType | null };

async function seedPipelines(tenantId: string): Promise<{
  defaultPipelineId: string;
  stages: StageRecord[];
  commercialStages: StageRecord[];
}> {
  const defaultPipeline = await prisma.pipeline.create({
    data: {
      id: DEFAULT_PIPELINE_ID,
      tenantId,
      name: DEFAULT_PIPELINE.name,
      isDefault: DEFAULT_PIPELINE.isDefault,
    },
  });

  const stages: StageRecord[] = [];
  for (let i = 0; i < DEFAULT_PIPELINE_STAGES.length; i++) {
    const def = DEFAULT_PIPELINE_STAGES[i];
    const stage = await prisma.pipelineStage.create({
      data: {
        tenantId,
        pipelineId: defaultPipeline.id,
        name: def.name,
        color: def.color,
        sortOrder: i + 1,
        isSystem: def.isClosed,
        isClosed: def.isClosed,
        closeType: def.closeType as PipelineCloseType | null,
      },
    });
    stages.push({
      id: stage.id,
      isClosed: stage.isClosed,
      closeType: stage.closeType,
    });
  }

  const commercialPipeline = await prisma.pipeline.create({
    data: {
      id: COMMERCIAL_PIPELINE_ID,
      tenantId,
      name: 'Commercial Leasing',
      isDefault: false,
    },
  });

  const commercialStageNames = [
    'Inquiry',
    'Site Visit',
    'Proposal',
    'Lease Signed',
    'Declined',
  ];
  const commercialStages: StageRecord[] = [];

  for (let i = 0; i < commercialStageNames.length; i++) {
    const name = commercialStageNames[i];
    const isClosed = name === 'Lease Signed' || name === 'Declined';
    const closeType =
      name === 'Lease Signed'
        ? PipelineCloseType.WON
        : name === 'Declined'
          ? PipelineCloseType.LOST
          : null;

    const stage = await prisma.pipelineStage.create({
      data: {
        tenantId,
        pipelineId: commercialPipeline.id,
        name,
        color: faker.color.rgb(),
        sortOrder: i + 1,
        isSystem: isClosed,
        isClosed,
        closeType,
      },
    });
    commercialStages.push({
      id: stage.id,
      isClosed: stage.isClosed,
      closeType: stage.closeType,
    });
  }

  return {
    defaultPipelineId: defaultPipeline.id,
    stages,
    commercialStages,
  };
}

async function seedLeadsAndRelated(params: {
  tenantId: string;
  pipelineId: string;
  stages: StageRecord[];
  sourceIds: string[];
  projectIds: string[];
  agentUserIds: string[];
  leadCount: number;
}): Promise<string[]> {
  const {
    tenantId,
    pipelineId,
    stages,
    sourceIds,
    projectIds,
    agentUserIds,
    leadCount,
  } = params;

  const openStages = stages.filter((s) => !s.isClosed);
  const leadIds: string[] = [];

  for (let i = 0; i < leadCount; i++) {
    const primary = egyptLocalPhone();
    const hasSecondary = faker.datatype.boolean({ probability: 0.3 });
    const secondary = hasSecondary ? egyptLocalPhone() : null;
    const stage = faker.helpers.arrayElement(openStages);
    const assignedUserId = faker.datatype.boolean({ probability: 0.85 })
      ? faker.helpers.arrayElement(agentUserIds)
      : null;
    const hasEmail = faker.datatype.boolean({ probability: 0.6 });

    const lead = await prisma.lead.create({
      data: {
        tenantId,
        sourceId: faker.datatype.boolean({ probability: 0.9 })
          ? faker.helpers.arrayElement(sourceIds)
          : null,
        pipelineId,
        pipelineStageId: stage.id,
        assignedUserId,
        status: LeadStatus.OPEN,
        fullName: faker.person.fullName(),
        primaryPhone: primary.raw,
        primaryPhoneNormalized: primary.normalized,
        secondaryPhone: secondary?.raw,
        secondaryPhoneNormalized: secondary?.normalized,
        email: hasEmail ? faker.internet.email().toLowerCase() : null,
        budgetMin: new Prisma.Decimal(
          faker.number.int({ min: 1_000_000, max: 5_000_000 }),
        ),
        budgetMax: new Prisma.Decimal(
          faker.number.int({ min: 5_000_000, max: 15_000_000 }),
        ),
        notesSummary: faker.datatype.boolean({ probability: 0.4 })
          ? faker.lorem.sentence()
          : null,
        customFields: faker.datatype.boolean({ probability: 0.2 })
          ? { preferredUnit: faker.helpers.arrayElement(['2BR', '3BR', 'Villa']) }
          : undefined,
        lastContactedAt: faker.date.recent({ days: 30 }),
        createdAt: faker.date.recent({ days: 60 }),
      },
    });

    leadIds.push(lead.id);

    await prisma.leadActivity.create({
      data: {
        tenantId,
        leadId: lead.id,
        actorUserId: assignedUserId,
        eventType: LeadActivityEventType.LEAD_CREATED,
        metadata: { source: 'seed' },
        createdAt: lead.createdAt,
      },
    });

    if (assignedUserId) {
      await prisma.leadActivity.create({
        data: {
          tenantId,
          leadId: lead.id,
          actorUserId: assignedUserId,
          eventType: LeadActivityEventType.ASSIGNED,
          metadata: { toUserId: assignedUserId },
          createdAt: faker.date.soon({ days: 1, refDate: lead.createdAt }),
        },
      });
    }

    const noteCount = faker.number.int({ min: 0, max: 3 });
    for (let n = 0; n < noteCount; n++) {
      const authorId = faker.helpers.arrayElement(agentUserIds);
      const note = await prisma.leadNote.create({
        data: {
          tenantId,
          leadId: lead.id,
          authorId,
          content: faker.lorem.paragraph(),
          createdAt: faker.date.between({
            from: lead.createdAt,
            to: new Date(),
          }),
        },
      });

      await prisma.leadActivity.create({
        data: {
          tenantId,
          leadId: lead.id,
          actorUserId: authorId,
          eventType: LeadActivityEventType.NOTE_ADDED,
          metadata: { noteId: note.id },
          createdAt: note.createdAt,
        },
      });
    }

    const interestCount = faker.number.int({ min: 0, max: 3 });
    const pickedProjects = faker.helpers.arrayElements(
      projectIds,
      interestCount,
    );
    for (const projectId of pickedProjects) {
      await prisma.leadProjectInterest.create({
        data: {
          leadId: lead.id,
          projectId,
          interestLevel: faker.helpers.arrayElement([
            InterestLevel.LOW,
            InterestLevel.MEDIUM,
            InterestLevel.HIGH,
            InterestLevel.HOT,
          ]),
        },
      });

      await prisma.leadActivity.create({
        data: {
          tenantId,
          leadId: lead.id,
          actorUserId: assignedUserId,
          eventType: LeadActivityEventType.PROJECT_LINKED,
          metadata: { projectId },
          createdAt: faker.date.recent({ days: 14 }),
        },
      });
    }

    if (faker.datatype.boolean({ probability: 0.15 })) {
      await prisma.leadActivity.create({
        data: {
          tenantId,
          leadId: lead.id,
          actorUserId: assignedUserId,
          eventType: faker.helpers.arrayElement([
            LeadActivityEventType.CALL_LOGGED,
            LeadActivityEventType.WHATSAPP_LOGGED,
            LeadActivityEventType.EMAIL_LOGGED,
          ]),
          metadata: { durationMinutes: faker.number.int({ min: 2, max: 45 }) },
          createdAt: faker.date.recent({ days: 7 }),
        },
      });
    }
  }

  return leadIds;
}

async function seedFileAssets(params: {
  tenantId: string;
  uploaderId: string;
  userIds: string[];
  projectIds: string[];
  leadIds: string[];
}): Promise<{ totalBytes: bigint; fileIds: string[] }> {
  const { tenantId, uploaderId, userIds, projectIds, leadIds } = params;
  let totalBytes = 0n;
  const fileIds: string[] = [];

  const track = async (
    data: Prisma.FileAssetUncheckedCreateInput,
  ): Promise<string> => {
    const file = await prisma.fileAsset.create({ data });
    totalBytes += file.sizeBytes;
    fileIds.push(file.id);
    return file.id;
  };

  for (const userId of userIds) {
    await track({
      tenantId,
      uploadedByUserId: uploaderId,
      avatarForUserId: userId,
      category: FileAssetCategory.AVATAR,
      objectKey: objectKey(tenantId, 'avatars', `${userId}.jpg`),
      originalFilename: 'avatar.jpg',
      mimeType: 'image/jpeg',
      sizeBytes: BigInt(faker.number.int({ min: 50_000, max: 500_000 })),
    });
  }

  for (const projectId of projectIds.slice(0, 5)) {
    await track({
      tenantId,
      uploadedByUserId: uploaderId,
      category: FileAssetCategory.PROJECT_BROCHURE,
      projectId,
      objectKey: objectKey(tenantId, 'brochures', 'brochure.pdf'),
      originalFilename: 'project-brochure.pdf',
      mimeType: 'application/pdf',
      sizeBytes: BigInt(faker.number.int({ min: 1, max: 8 })) * MB,
    });
  }

  for (const leadId of faker.helpers.arrayElements(leadIds, 15)) {
    await track({
      tenantId,
      uploadedByUserId: uploaderId,
      category: FileAssetCategory.LEAD_ATTACHMENT,
      leadId,
      objectKey: objectKey(tenantId, 'attachments', 'document.pdf'),
      originalFilename: faker.system.commonFileName('pdf'),
      mimeType: 'application/pdf',
      sizeBytes: BigInt(faker.number.int({ min: 100_000, max: 2_000_000 })),
    });
  }

  const importFileId = await track({
    tenantId,
    uploadedByUserId: uploaderId,
    category: FileAssetCategory.IMPORT_FILE,
    objectKey: objectKey(tenantId, 'imports', 'leads-import.csv'),
    originalFilename: 'leads-import.csv',
    mimeType: 'text/csv',
    sizeBytes: BigInt(faker.number.int({ min: 10_000, max: 500_000 })),
  });

  const exportFileId = await track({
    tenantId,
    uploadedByUserId: uploaderId,
    category: FileAssetCategory.EXPORT_FILE,
    objectKey: objectKey(tenantId, 'exports', 'leads-export.csv'),
    originalFilename: 'leads-export.csv',
    mimeType: 'text/csv',
    sizeBytes: BigInt(faker.number.int({ min: 10_000, max: 500_000 })),
  });

  await prisma.importJob.create({
    data: {
      tenantId,
      createdByUserId: uploaderId,
      fileAssetId: importFileId,
      status: JobStatus.COMPLETED,
      totalRows: 120,
      processedRows: 120,
      successfulRows: 108,
      failedRows: 12,
      errorSummary: {
        duplicateCandidates: 5,
        validationErrors: 7,
      },
      completedAt: faker.date.recent({ days: 3 }),
    },
  });

  await prisma.importJob.create({
    data: {
      tenantId,
      createdByUserId: uploaderId,
      fileAssetId: importFileId,
      status: JobStatus.FAILED,
      totalRows: 45,
      processedRows: 45,
      successfulRows: 0,
      failedRows: 45,
      errorSummary: [{ row: 1, reason: 'Sample failed import for UI preview' }],
      completedAt: faker.date.recent({ days: 1 }),
    },
  });

  await prisma.exportJob.create({
    data: {
      tenantId,
      createdByUserId: uploaderId,
      fileAssetId: exportFileId,
      exportType: 'LEADS',
      format: 'CSV',
      filters: {},
      status: JobStatus.COMPLETED,
      progress: 100,
      rowCount: leadIds.length,
      completedAt: faker.date.recent({ days: 1 }),
    },
  });

  await prisma.exportJob.create({
    data: {
      tenantId,
      createdByUserId: uploaderId,
      exportType: 'LEADS',
      format: 'CSV',
      filters: { status: 'OPEN' },
      status: JobStatus.FAILED,
      progress: 45,
      errorMessage: 'Sample failed export for UI preview',
      completedAt: faker.date.recent({ days: 1 }),
    },
  });

  return { totalBytes, fileIds };
}

async function seedAuditLogs(params: {
  tenantId: string;
  userIds: string[];
  leadIds: string[];
}): Promise<void> {
  const { tenantId, userIds, leadIds } = params;

  for (let i = 0; i < 25; i++) {
    const isSystem = faker.datatype.boolean({ probability: 0.15 });
    await prisma.auditLog.create({
      data: {
        tenantId,
        actorType: isSystem ? AuditActorType.SYSTEM : AuditActorType.USER,
        actorUserId: isSystem ? null : faker.helpers.arrayElement(userIds),
        entityType: faker.helpers.arrayElement(['Lead', 'User', 'Project', 'Role']),
        entityId: faker.helpers.arrayElement([
          ...leadIds,
          ...userIds,
          faker.string.uuid(),
        ]),
        action: faker.helpers.arrayElement(['created', 'updated', 'deleted', 'assigned']),
        metadata: { seed: true, detail: faker.lorem.sentence() },
        createdAt: faker.date.recent({ days: 30 }),
      },
    });
  }
}

async function seedNotificationPreferences(
  tenantId: string,
  userIds: string[],
): Promise<void> {
  const categories = Object.values(NotificationPreferenceCategory);

  for (const userId of userIds) {
    for (const category of categories) {
      await prisma.notificationPreference.upsert({
        where: {
          userId_category: { userId, category },
        },
        create: {
          tenantId,
          userId,
          category,
          enabled: true,
        },
        update: {
          tenantId,
          enabled: true,
        },
      });
    }
  }
}

async function seedNotifications(params: {
  tenantId: string;
  userIds: string[];
  leadIds: string[];
}): Promise<void> {
  const { tenantId, userIds, leadIds } = params;
  const ownerId = userIds[0];
  const managerId = userIds[1] ?? userIds[0];
  const agentId = userIds[2] ?? userIds[0];
  const sampleLeadId = leadIds[0];

  const samples = [
    {
      recipientUserId: agentId,
      type: NotificationType.LEAD_ASSIGNED,
      title: 'New Lead Assigned',
      message: 'A new lead has been assigned to you: Ahmed Hassan.',
      priority: NotificationPriority.HIGH,
      status: NotificationStatus.UNREAD,
      metadata: { leadId: sampleLeadId, leadName: 'Ahmed Hassan' },
      createdByUserId: managerId,
    },
    {
      recipientUserId: agentId,
      type: NotificationType.LEAD_STAGE_CHANGED,
      title: 'Lead Stage Changed',
      message: 'Ahmed Hassan moved from New to Qualified.',
      priority: NotificationPriority.NORMAL,
      status: NotificationStatus.UNREAD,
      metadata: {
        leadId: sampleLeadId,
        leadName: 'Ahmed Hassan',
        fromStageName: 'New',
        toStageName: 'Qualified',
      },
      createdByUserId: managerId,
    },
    {
      recipientUserId: ownerId,
      type: NotificationType.IMPORT_COMPLETED,
      title: 'Import Completed',
      message: 'Your import job completed with 108 successful row(s).',
      priority: NotificationPriority.NORMAL,
      status: NotificationStatus.READ,
      metadata: {
        importJobId: faker.string.uuid(),
        successfulRows: 108,
        failedRows: 12,
      },
      createdByUserId: ownerId,
      readAt: faker.date.recent({ days: 2 }),
    },
    {
      recipientUserId: managerId,
      type: NotificationType.EXPORT_COMPLETED,
      title: 'Export Completed',
      message: 'Your export job completed with 50 row(s).',
      priority: NotificationPriority.NORMAL,
      status: NotificationStatus.UNREAD,
      metadata: {
        exportJobId: faker.string.uuid(),
        rowCount: 50,
        exportType: 'LEADS',
      },
      createdByUserId: managerId,
    },
    {
      recipientUserId: agentId,
      type: NotificationType.LEAD_WON,
      title: 'Lead Won',
      message: 'Sara Mohamed has been marked as won.',
      priority: NotificationPriority.HIGH,
      status: NotificationStatus.UNREAD,
      metadata: { leadId: leadIds[1] ?? sampleLeadId, leadName: 'Sara Mohamed' },
      createdByUserId: managerId,
    },
    {
      recipientUserId: ownerId,
      type: NotificationType.SECURITY,
      title: 'New Login Detected',
      message: 'A new login was detected from Chrome on Windows.',
      priority: NotificationPriority.CRITICAL,
      status: NotificationStatus.READ,
      metadata: { deviceName: 'Chrome on Windows' },
      createdByUserId: ownerId,
      readAt: faker.date.recent({ days: 1 }),
    },
    {
      recipientUserId: managerId,
      type: NotificationType.REMINDER,
      title: 'Follow-up Reminder',
      message: 'You have 3 leads waiting for follow-up today.',
      priority: NotificationPriority.NORMAL,
      status: NotificationStatus.UNREAD,
      metadata: { title: 'Follow-up Reminder', message: '3 leads pending' },
      createdByUserId: ownerId,
    },
  ];

  for (const sample of samples) {
    await prisma.notification.create({
      data: {
        tenantId,
        recipientUserId: sample.recipientUserId,
        type: sample.type,
        title: sample.title,
        message: sample.message,
        priority: sample.priority,
        status: sample.status,
        metadata: sample.metadata,
        createdByUserId: sample.createdByUserId,
        readAt: 'readAt' in sample ? sample.readAt : null,
        expiresAt: faker.datatype.boolean({ probability: 0.2 })
          ? faker.date.soon({ days: 7 })
          : null,
      },
    });
  }
}

async function seedTenantCrmData(
  tenantId: string,
  userIds: string[],
  leadCount: number,
): Promise<void> {
  await seedDevelopers(tenantId);
  const projectIds = await seedProjects(tenantId);
  const sourceIds = await seedLeadSources(tenantId);
  const { defaultPipelineId, stages } = await seedPipelines(tenantId);

  const agentUserIds = userIds;
  const ownerId = userIds[0];
  const leadIds = await seedLeadsAndRelated({
    tenantId,
    pipelineId: defaultPipelineId,
    stages,
    sourceIds,
    projectIds,
    agentUserIds,
    leadCount,
  });

  const { totalBytes } = await seedFileAssets({
    tenantId,
    uploaderId: ownerId,
    userIds,
    projectIds,
    leadIds,
  });

  await seedAuditLogs({ tenantId, userIds, leadIds });

  await seedNotificationPreferences(tenantId, userIds);
  await seedNotifications({ tenantId, userIds, leadIds });

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { storageUsedBytes: totalBytes },
  });
}

async function main(): Promise<void> {
  initFaker();
  console.log('Seeding CRMPro database...\n');

  const passwordHash = await argon2.hash('Password123!');
  const adminPasswordHash = await argon2.hash('Admin123!');

  await seedSubscriptionPlans();
  console.log('✓ Subscription plans');

  const permissionIds = await seedPermissions();
  console.log('✓ Permissions');

  const adminPermissionIds = await seedAdminPermissions();
  console.log('✓ Admin permissions');

  await seedTenants();
  console.log('✓ Tenants (prime-estates, sunrise-properties)');

  await seedRoles(TENANT_ID, TENANT_ROLES);
  console.log('✓ Roles');

  await seedRolePermissions(permissionIds);
  console.log('✓ Role permissions');

  await seedAdminRoles();
  console.log('✓ Admin roles');

  await seedAdminRolePermissions(adminPermissionIds);
  console.log('✓ Admin role permissions');

  await seedInitialPlatformAdmin(adminPasswordHash);
  console.log('✓ Platform admin');

  await seedTenantContracts();
  console.log('✓ Tenant contracts');

  await seedAdminAuditTrail();
  console.log('✓ Admin audit logs & security events');

  const userIds = await seedUsers(TENANT_ID, SAMPLE_USERS, passwordHash);
  console.log('✓ Users (fixed credentials)');

  console.log('\nRefreshing sample CRM data for prime-estates...');
  await clearTenantSampleData(TENANT_ID);

  await seedUserSessions(TENANT_ID, userIds);
  console.log('✓ User sessions');

  await seedTenantCrmData(TENANT_ID, userIds, 50);
  console.log('✓ Developers, projects, lead sources, pipelines');
  console.log('✓ Leads, activities, notes, project interests');
  console.log('✓ File assets, import/export jobs');
  console.log('✓ Audit logs');
  console.log('✓ Notification preferences & sample notifications');

  console.log('\nSeed complete.');
  console.log('\nLogin (prime-estates):');
  console.log('  tenantSlug: prime-estates');
  console.log('  owner@primeestates.com / Password123!');
  console.log('  manager@primeestates.com / Password123!');
  console.log('  agent@primeestates.com / Password123!');
  console.log('\nLogin (admin-api):');
  console.log('  admin@crmpro.local / Admin123!');
  console.log('\nAdmin audit explorer sample IDs:');
  console.log(`  auditId: ${ADMIN_AUDIT_IDS.tenantCreated}`);
  console.log(`  securityEventId: ${ADMIN_SECURITY_EVENT_IDS.loginSuccess}`);
  console.log('\nStable sample IDs (prime-estates):');
  console.log(`  developerId (Palm Hills): ${DEVELOPER_IDS.palmHills}`);
  console.log(`  projectId (Palm Hills New Cairo): ${PROJECT_IDS.palmHillsNewCairo}`);
  console.log('\nRe-run is idempotent for foundation data; CRM sample data is refreshed each run.');
  console.log('Set SEED_RANDOM_SEED for reproducible faker output.');
}

main()
  .catch((error: unknown) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
