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
} from '@prisma/client';
import * as argon2 from 'argon2';

const GB = 1024n ** 3n;
const MB = 1024n ** 2n;

const PLAN_IDS = {
  starter: '11111111-1111-4111-8111-111111111101',
  growth: '11111111-1111-4111-8111-111111111102',
  enterprise: '11111111-1111-4111-8111-111111111103',
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
  { key: 'pipeline.create', description: 'Create pipelines' },
  { key: 'pipeline.read', description: 'View pipelines' },
  { key: 'pipeline.update', description: 'Update pipelines and stages' },
  { key: 'pipeline.delete', description: 'Delete pipelines' },
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
  'project.read',
  'pipeline.read',
  'file.upload',
  'file.read',
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

const DEFAULT_STAGE_DEFS = [
  { name: 'New Lead', color: '#94a3b8', isClosed: false, closeType: null },
  { name: 'Contacted', color: '#60a5fa', isClosed: false, closeType: null },
  { name: 'Qualified', color: '#818cf8', isClosed: false, closeType: null },
  { name: 'Interested', color: '#a78bfa', isClosed: false, closeType: null },
  { name: 'Negotiation', color: '#f59e0b', isClosed: false, closeType: null },
  {
    name: 'Won',
    color: '#22c55e',
    isClosed: true,
    closeType: PipelineCloseType.WON,
  },
  {
    name: 'Lost',
    color: '#ef4444',
    isClosed: true,
    closeType: PipelineCloseType.LOST,
  },
] as const;

const LEAD_SOURCE_NAMES = [
  'Facebook Ads',
  'Website',
  'WhatsApp',
  'Referral',
  'Call Center',
  'Walk-in',
] as const;

const DEVELOPER_NAMES = [
  'Palm Hills Developments',
  'Emaar Misr',
  'Talaat Moustafa Group',
  'Mountain View',
  'SODIC',
  'Hyde Park',
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

  for (const name of DEVELOPER_NAMES) {
    const developer = await prisma.developer.create({
      data: { tenantId, name },
    });
    ids.push(developer.id);
  }

  return ids;
}

async function seedProjects(
  tenantId: string,
  developerIds: string[],
): Promise<string[]> {
  const projectNames = [
    'Badya',
    'Mountain View iCity',
    'New Giza',
    'Madinaty',
    'Al Rehab',
    'Eastown',
    'Sarai',
    'Il Bosco',
    'ZED East',
    'The Waterway',
  ];

  const ids: string[] = [];

  for (const name of projectNames) {
    const project = await prisma.project.create({
      data: {
        tenantId,
        developerId: faker.helpers.arrayElement(developerIds),
        name,
        location: faker.helpers.arrayElement([
          'New Cairo',
          '6th of October',
          'North Coast',
          'Sheikh Zayed',
          'Ain Sokhna',
        ]),
        description: faker.lorem.paragraph(),
        isActive: faker.datatype.boolean({ probability: 0.9 }),
      },
    });
    ids.push(project.id);
  }

  return ids;
}

async function seedLeadSources(tenantId: string): Promise<string[]> {
  const ids: string[] = [];

  for (const name of LEAD_SOURCE_NAMES) {
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
      name: 'Residential Sales',
      isDefault: true,
    },
  });

  const stages: StageRecord[] = [];
  for (let i = 0; i < DEFAULT_STAGE_DEFS.length; i++) {
    const def = DEFAULT_STAGE_DEFS[i];
    const stage = await prisma.pipelineStage.create({
      data: {
        tenantId,
        pipelineId: defaultPipeline.id,
        name: def.name,
        color: def.color,
        sortOrder: i + 1,
        isSystem: def.name === 'Won' || def.name === 'Lost',
        isClosed: def.isClosed,
        closeType: def.closeType,
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
      category: FileAssetCategory.BROCHURE,
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
      category: FileAssetCategory.ATTACHMENT,
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
    category: FileAssetCategory.IMPORT,
    objectKey: objectKey(tenantId, 'imports', 'leads-import.csv'),
    originalFilename: 'leads-import.csv',
    mimeType: 'text/csv',
    sizeBytes: BigInt(faker.number.int({ min: 10_000, max: 500_000 })),
  });

  const exportFileId = await track({
    tenantId,
    uploadedByUserId: uploaderId,
    category: FileAssetCategory.EXPORT,
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
      status: JobStatus.PENDING,
      totalRows: 0,
      processedRows: 0,
      successfulRows: 0,
      failedRows: 0,
    },
  });

  await prisma.exportJob.create({
    data: {
      tenantId,
      createdByUserId: uploaderId,
      fileAssetId: exportFileId,
      status: JobStatus.COMPLETED,
      rowCount: leadIds.length,
      completedAt: faker.date.recent({ days: 1 }),
    },
  });

  await prisma.exportJob.create({
    data: {
      tenantId,
      createdByUserId: uploaderId,
      fileAssetId: exportFileId,
      status: JobStatus.PROCESSING,
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

async function seedTenantCrmData(
  tenantId: string,
  userIds: string[],
  leadCount: number,
): Promise<void> {
  const developerIds = await seedDevelopers(tenantId);
  const projectIds = await seedProjects(tenantId, developerIds);
  const sourceIds = await seedLeadSources(tenantId);
  const { defaultPipelineId, stages } = await seedPipelines(tenantId);

  const agentUserIds = userIds;
  const leadIds = await seedLeadsAndRelated({
    tenantId,
    pipelineId: defaultPipelineId,
    stages,
    sourceIds,
    projectIds,
    agentUserIds,
    leadCount,
  });

  const ownerId = userIds[0];
  const { totalBytes } = await seedFileAssets({
    tenantId,
    uploaderId: ownerId,
    userIds,
    projectIds,
    leadIds,
  });

  await seedAuditLogs({ tenantId, userIds, leadIds });

  await prisma.tenant.update({
    where: { id: tenantId },
    data: { storageUsedBytes: totalBytes },
  });
}

async function main(): Promise<void> {
  initFaker();
  console.log('Seeding CRMPro database...\n');

  const passwordHash = await argon2.hash('Password123!');

  await seedSubscriptionPlans();
  console.log('✓ Subscription plans');

  const permissionIds = await seedPermissions();
  console.log('✓ Permissions');

  await seedTenants();
  console.log('✓ Tenants (prime-estates, sunrise-properties)');

  await seedRoles(TENANT_ID, TENANT_ROLES);
  console.log('✓ Roles');

  await seedRolePermissions(permissionIds);
  console.log('✓ Role permissions');

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

  console.log('\nSeed complete.');
  console.log('\nLogin (prime-estates):');
  console.log('  tenantSlug: prime-estates');
  console.log('  owner@primeestates.com / Password123!');
  console.log('  manager@primeestates.com / Password123!');
  console.log('  agent@primeestates.com / Password123!');
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
