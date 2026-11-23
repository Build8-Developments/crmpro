import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Prisma } from '@crmpro/database';
import {
  type LeadScope,
  PermissionsService,
  SYSTEM_LEAD_SCOPE,
} from '../../../common/auth';
import { DomainEventBus } from '../../../common/events/domain-event-bus.service';
import {
  DOMAIN_EVENT_TYPES,
  type DomainEvent,
} from '../../../common/events/domain-event.types';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuditWriterService } from '../../audit/audit-writer.service';
import { NotificationTriggerService } from '../../notifications/notification-trigger.service';
import { TaskLifecycleService } from '../../workflow/common/task-lifecycle.service';
import { LeadActivityService } from './lead-activity.service';
import {
  LEAD_MERGE_AUDIT_ACTION,
  LeadMergeService,
} from './lead-merge.service';

const TENANT = 'tenant-1';
const ACTOR = 'actor-1';
const AGENT_A = 'agent-a';
const AGENT_B = 'agent-b';

type FakeLead = Record<string, unknown> & {
  id: string;
  assignedUserId: string | null;
  deletedAt: Date | null;
  mergedIntoId: string | null;
};

function makeLead(overrides: Partial<FakeLead> & { id: string }): FakeLead {
  const assignedUserId =
    overrides.assignedUserId === undefined ? AGENT_A : overrides.assignedUserId;
  return {
    status: 'OPEN',
    fullName: 'Ahmed Hassan',
    primaryPhone: '01012345678',
    primaryPhoneNormalized: '201012345678',
    secondaryPhone: null,
    secondaryPhoneNormalized: null,
    email: null,
    budgetMin: null,
    budgetMax: null,
    occupation: null,
    residenceArea: null,
    paymentPreference: null,
    contactChannelPreference: null,
    contactTimePreference: null,
    purchasePurpose: null,
    lastContactedAt: null,
    firstContactedAt: null,
    stageEnteredAt: new Date('2026-01-01'),
    closedAt: null,
    nextTaskDueAt: null,
    contactAttempts: 0,
    unansweredStreak: 0,
    heat: 'WARM',
    lostNote: null,
    lostReason: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    source: null,
    pipeline: { id: 'pipe-1', name: 'Sales' },
    pipelineStage: {
      id: 'stage-1',
      name: 'New',
      color: null,
      icon: null,
      isClosed: false,
      closeType: null,
    },
    leadProjectInterests: [],
    tenantId: TENANT,
    sourceId: null,
    assignedAt: null,
    externalId: null,
    _count: { interactions: 0, tasks: 0, notes: 0, fileAssets: 0 },
    ...overrides,
    assignedUserId,
    assignedUser:
      overrides.assignedUser !== undefined
        ? overrides.assignedUser
        : assignedUserId
          ? {
              id: assignedUserId,
              name: `User ${assignedUserId}`,
              isActive: true,
              deletedAt: null,
            }
          : null,
    deletedAt: overrides.deletedAt ?? null,
    mergedIntoId: overrides.mergedIntoId ?? null,
  };
}

/** Applies the parts of a Prisma `where` the service uses (id/tenant/deleted/scope). */
function matches(lead: FakeLead, where: Record<string, unknown>): boolean {
  if (where.id !== undefined && where.id !== lead.id) return false;
  if (where.deletedAt === null && lead.deletedAt !== null) return false;
  const or = where.OR as
    | Array<{ assignedUserId: null | { in: string[] } }>
    | undefined;
  if (or) {
    return or.some((cond) =>
      cond.assignedUserId === null
        ? lead.assignedUserId === null
        : cond.assignedUserId.in.includes(lead.assignedUserId ?? ''),
    );
  }
  return true;
}

describe('LeadMergeService', () => {
  let service: LeadMergeService;
  let leads: Map<string, FakeLead>;
  let permissionKeys: Set<string>;

  const prisma = {
    lead: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    task: { findMany: jest.fn(), updateMany: jest.fn() },
    interaction: { updateMany: jest.fn() },
    leadNote: { updateMany: jest.fn() },
    leadActivity: { updateMany: jest.fn() },
    fileAsset: { updateMany: jest.fn() },
    deal: {
      count: jest.fn().mockResolvedValue(0),
      updateMany: jest.fn(),
    },
    leadProjectInterest: {
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const activity = { createActivity: jest.fn() };
  const audit = { createAuditLog: jest.fn() };
  const lifecycle = {
    followReassignment: jest.fn(),
    refreshNextTaskDueAt: jest.fn(),
  };
  const events = { publish: jest.fn() };
  const notifications = { notifyLeadAssigned: jest.fn() };
  const permissions = {
    getPermissionKeysForUser: jest.fn(() => Promise.resolve(permissionKeys)),
  };

  const published = (): DomainEvent[] =>
    events.publish.mock.calls.map(([event]) => event as DomainEvent);
  const updateManyCall = (mock: jest.Mock) =>
    mock.mock.calls[0]?.[0] as { where: unknown; data: unknown } | undefined;
  const targetUpdate = () =>
    prisma.lead.update.mock.calls[0][0] as {
      where: { id: string };
      data: Record<string, unknown>;
    };

  beforeEach(async () => {
    jest.clearAllMocks();
    leads = new Map();
    permissionKeys = new Set(['lead.merge', 'lead.assign', 'lead.read']);

    prisma.$transaction.mockImplementation((fn: (tx: unknown) => unknown) =>
      fn(prisma),
    );
    prisma.lead.findFirst.mockImplementation(
      ({ where }: { where: Record<string, unknown> }) =>
        Promise.resolve(
          [...leads.values()].find((lead) => matches(lead, where)) ?? null,
        ),
    );
    prisma.lead.updateMany.mockResolvedValue({ count: 1 });
    prisma.task.findMany.mockResolvedValue([]);
    prisma.task.updateMany.mockResolvedValue({ count: 0 });
    prisma.interaction.updateMany.mockResolvedValue({ count: 0 });
    prisma.leadNote.updateMany.mockResolvedValue({ count: 0 });
    prisma.leadActivity.updateMany.mockResolvedValue({ count: 0 });
    prisma.fileAsset.updateMany.mockResolvedValue({ count: 0 });
    prisma.leadProjectInterest.findMany.mockResolvedValue([]);

    const module = await Test.createTestingModule({
      providers: [
        LeadMergeService,
        { provide: PrismaService, useValue: prisma },
        { provide: LeadActivityService, useValue: activity },
        { provide: AuditWriterService, useValue: audit },
        { provide: TaskLifecycleService, useValue: lifecycle },
        { provide: DomainEventBus, useValue: events },
        { provide: NotificationTriggerService, useValue: notifications },
        { provide: PermissionsService, useValue: permissions },
      ],
    }).compile();
    service = module.get(LeadMergeService);
  });

  function seed(...records: FakeLead[]) {
    for (const record of records) leads.set(record.id, record);
  }

  it('moves everything from the duplicate onto the survivor in one transaction', async () => {
    seed(
      makeLead({
        id: 'target',
        contactAttempts: 2,
        firstContactedAt: new Date('2026-02-10'),
        lastContactedAt: new Date('2026-02-12'),
      }),
      makeLead({
        id: 'source',
        fullName: 'Ahmed H.',
        contactAttempts: 3,
        firstContactedAt: new Date('2026-02-01'),
        lastContactedAt: new Date('2026-02-20'),
        externalId: 'fb-123',
        _count: { interactions: 4, tasks: 2, notes: 1, fileAssets: 3 },
      }),
    );
    prisma.task.updateMany.mockResolvedValue({ count: 2 });
    prisma.interaction.updateMany.mockResolvedValue({ count: 4 });
    prisma.leadNote.updateMany.mockResolvedValue({ count: 1 });
    prisma.leadActivity.updateMany.mockResolvedValue({ count: 6 });
    prisma.fileAsset.updateMany.mockResolvedValue({ count: 3 });
    prisma.leadProjectInterest.findMany
      .mockResolvedValueOnce([
        { projectId: 'p-shared', interestLevel: 'LOW' },
        { projectId: 'p-target', interestLevel: 'HOT' },
      ])
      .mockResolvedValueOnce([
        { projectId: 'p-shared', interestLevel: 'HIGH' },
        { projectId: 'p-source', interestLevel: null },
      ]);

    const result = await service.mergeLeads(
      'target',
      TENANT,
      ACTOR,
      { sourceLeadId: 'source' },
      SYSTEM_LEAD_SCOPE,
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    // Source claimed (soft-deleted, pointed at the survivor, externalId freed).
    expect(prisma.lead.updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        id: 'source',
        tenantId: TENANT,
        deletedAt: null,
        mergedIntoId: null,
      },
      data: expect.objectContaining({
        deletedAt: expect.any(Date),
        mergedIntoId: 'target',
        externalId: null,
      }),
    });
    for (const mock of [
      prisma.task.updateMany,
      prisma.interaction.updateMany,
      prisma.leadNote.updateMany,
      prisma.leadActivity.updateMany,
    ]) {
      expect(mock).toHaveBeenCalledWith({
        where: { leadId: 'source' },
        data: { leadId: 'target' },
      });
    }
    expect(prisma.fileAsset.updateMany).toHaveBeenCalledWith({
      where: { leadId: 'source', tenantId: TENANT },
      data: { leadId: 'target' },
    });

    // Interests: union, higher level wins on the shared project.
    expect(prisma.leadProjectInterest.update).toHaveBeenCalledWith({
      where: { leadId_projectId: { leadId: 'target', projectId: 'p-shared' } },
      data: { interestLevel: 'HIGH' },
    });
    expect(prisma.leadProjectInterest.updateMany).toHaveBeenCalledWith({
      where: { leadId: 'source', projectId: { in: ['p-source'] } },
      data: { leadId: 'target' },
    });
    expect(prisma.leadProjectInterest.deleteMany).toHaveBeenCalledWith({
      where: { leadId: 'source' },
    });

    // Counters and dates combined; target keeps its own name by default.
    const update = targetUpdate();
    expect(update.where).toEqual({ id: 'target' });
    expect(update.data).toEqual(
      expect.objectContaining({
        contactAttempts: 5,
        firstContactedAt: new Date('2026-02-01'),
        lastContactedAt: new Date('2026-02-20'),
        externalId: 'fb-123',
      }),
    );
    expect(update.data).not.toHaveProperty('fullName');
    expect(update.data).not.toHaveProperty('createdAt');
    expect(lifecycle.refreshNextTaskDueAt).toHaveBeenCalledWith(
      'target',
      prisma,
    );

    // Timeline + audit, inside the transaction.
    expect(activity.createActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        leadId: 'target',
        eventType: 'LEAD_MERGED',
        metadata: expect.objectContaining({
          sourceLeadId: 'source',
          sourceLeadName: 'Ahmed H.',
          moved: {
            interactions: 4,
            tasks: 2,
            notes: 1,
            files: 3,
            activities: 6,
            projectInterests: 2,
          },
        }),
      }),
      prisma,
    );
    expect(audit.createAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({
        action: LEAD_MERGE_AUDIT_ACTION,
        entityType: 'Lead',
        entityId: 'target',
        tx: prisma,
      }),
    );

    // Lists refresh for both leads, and Today refreshes for the moved tasks.
    expect(
      published()
        .filter((event) => event.type === DOMAIN_EVENT_TYPES.LEAD_UPDATED)
        .map((event) => (event as DomainEvent & { leadId: string }).leadId),
    ).toEqual(['target', 'source']);
    expect(published().map((event) => event.type)).toContain(
      DOMAIN_EVENT_TYPES.TASKS_CHANGED,
    );
    expect(lifecycle.followReassignment).not.toHaveBeenCalled();

    expect(result.mergedLeadId).toBe('source');
    expect(result.moved.interactions).toBe(4);
    expect(result.lead.id).toBe('target');
  });

  it('rejects merging a lead into itself', async () => {
    await expect(
      service.mergeLeads(
        'same',
        TENANT,
        ACTOR,
        { sourceLeadId: 'same' },
        SYSTEM_LEAD_SCOPE,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.lead.findFirst).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('treats a duplicate outside the caller scope as missing', async () => {
    const ownScope: LeadScope = { kind: 'own', actorUserId: AGENT_A };
    seed(
      makeLead({ id: 'target', assignedUserId: AGENT_A }),
      makeLead({ id: 'source', assignedUserId: AGENT_B }),
    );

    await expect(
      service.mergeLeads(
        'target',
        TENANT,
        AGENT_A,
        { sourceLeadId: 'source' },
        ownScope,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.lead.findFirst).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'source',
          tenantId: TENANT,
          OR: [{ assignedUserId: { in: [AGENT_A] } }, { assignedUserId: null }],
        }),
      }),
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('treats a survivor outside the caller scope as missing', async () => {
    const ownScope: LeadScope = { kind: 'own', actorUserId: AGENT_A };
    seed(
      makeLead({ id: 'target', assignedUserId: AGENT_B }),
      makeLead({ id: 'source', assignedUserId: null }),
    );

    await expect(
      service.mergeLeads(
        'target',
        TENANT,
        AGENT_A,
        { sourceLeadId: 'source' },
        ownScope,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a duplicate that was already merged', async () => {
    seed(
      makeLead({ id: 'target' }),
      makeLead({
        id: 'source',
        deletedAt: new Date(),
        mergedIntoId: 'someone-else',
      }),
    );

    await expect(
      service.mergeLeads(
        'target',
        TENANT,
        ACTOR,
        { sourceLeadId: 'source' },
        SYSTEM_LEAD_SCOPE,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects a deleted duplicate as missing', async () => {
    seed(
      makeLead({ id: 'target' }),
      makeLead({ id: 'source', deletedAt: new Date() }),
    );

    await expect(
      service.mergeLeads(
        'target',
        TENANT,
        ACTOR,
        { sourceLeadId: 'source' },
        SYSTEM_LEAD_SCOPE,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('fails cleanly when a concurrent merge claimed the duplicate first', async () => {
    seed(makeLead({ id: 'target' }), makeLead({ id: 'source' }));
    prisma.lead.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(
      service.mergeLeads(
        'target',
        TENANT,
        ACTOR,
        { sourceLeadId: 'source' },
        SYSTEM_LEAD_SCOPE,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.task.updateMany).not.toHaveBeenCalled();
    expect(activity.createActivity).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });

  it('refuses to merge away a lead that has a live deal', async () => {
    seed(makeLead({ id: 'target' }), makeLead({ id: 'source' }));
    prisma.deal.count.mockResolvedValueOnce(1);

    const error = await service
      .mergeLeads(
        'target',
        TENANT,
        ACTOR,
        { sourceLeadId: 'source' },
        SYSTEM_LEAD_SCOPE,
      )
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ConflictException);
    expect((error as ConflictException).getResponse()).toEqual(
      expect.objectContaining({ code: 'DEAL_ACTIVE' }),
    );
    expect(prisma.lead.updateMany).not.toHaveBeenCalled();
    expect(prisma.deal.updateMany).not.toHaveBeenCalled();
  });

  it("moves the duplicate's cancelled deals over as history", async () => {
    seed(makeLead({ id: 'target' }), makeLead({ id: 'source' }));

    await service.mergeLeads(
      'target',
      TENANT,
      ACTOR,
      { sourceLeadId: 'source' },
      SYSTEM_LEAD_SCOPE,
    );

    expect(prisma.deal.count).toHaveBeenCalledWith({
      where: { leadId: 'source', status: { not: 'CANCELLED' } },
    });
    expect(prisma.deal.updateMany).toHaveBeenCalledWith({
      where: { leadId: 'source', tenantId: TENANT },
      data: { leadId: 'target' },
    });
  });

  describe('phone carry-over', () => {
    it("puts the duplicate's phone into the empty secondary slot", async () => {
      seed(
        makeLead({ id: 'target' }),
        makeLead({
          id: 'source',
          primaryPhone: '+20 122 000 1111',
          primaryPhoneNormalized: '201220001111',
        }),
      );

      const result = await service.mergeLeads(
        'target',
        TENANT,
        ACTOR,
        { sourceLeadId: 'source' },
        SYSTEM_LEAD_SCOPE,
      );

      expect(targetUpdate().data).toEqual(
        expect.objectContaining({
          secondaryPhone: '+20 122 000 1111',
          secondaryPhoneNormalized: '201220001111',
        }),
      );
      expect(result.secondaryPhoneAdded).toBe(true);
    });

    it("uses the duplicate's secondary phone when its primary is already known", async () => {
      seed(
        makeLead({ id: 'target' }),
        makeLead({
          id: 'source',
          secondaryPhone: '01155556666',
          secondaryPhoneNormalized: '201155556666',
        }),
      );

      await service.mergeLeads(
        'target',
        TENANT,
        ACTOR,
        { sourceLeadId: 'source' },
        SYSTEM_LEAD_SCOPE,
      );

      expect(targetUpdate().data).toEqual(
        expect.objectContaining({
          secondaryPhone: '01155556666',
          secondaryPhoneNormalized: '201155556666',
        }),
      );
    });

    it('never overwrites an existing secondary phone or adds a phone it already has', async () => {
      seed(
        makeLead({
          id: 'target',
          secondaryPhone: '01099998888',
          secondaryPhoneNormalized: '201099998888',
        }),
        makeLead({
          id: 'source',
          primaryPhone: '01220001111',
          primaryPhoneNormalized: '201220001111',
        }),
      );

      const result = await service.mergeLeads(
        'target',
        TENANT,
        ACTOR,
        { sourceLeadId: 'source' },
        SYSTEM_LEAD_SCOPE,
      );

      expect(targetUpdate().data).not.toHaveProperty('secondaryPhone');
      expect(result.secondaryPhoneAdded).toBe(false);
    });

    it('adds nothing when both leads share the same single phone', async () => {
      seed(makeLead({ id: 'target' }), makeLead({ id: 'source' }));

      const result = await service.mergeLeads(
        'target',
        TENANT,
        ACTOR,
        { sourceLeadId: 'source' },
        SYSTEM_LEAD_SCOPE,
      );

      expect(targetUpdate().data).not.toHaveProperty('secondaryPhone');
      expect(result.secondaryPhoneAdded).toBe(false);
    });
  });

  describe('field choices', () => {
    beforeEach(() => {
      seed(
        makeLead({
          id: 'target',
          fullName: 'Ahmed Hassan',
          email: null,
          occupation: 'Engineer',
          budgetMin: new Prisma.Decimal(1_000_000),
          budgetMax: new Prisma.Decimal(2_000_000),
        }),
        makeLead({
          id: 'source',
          fullName: 'Ahmed Hassan Ali',
          email: 'ahmed@example.com',
          occupation: 'Doctor',
          residenceArea: 'Nasr City',
          budgetMin: new Prisma.Decimal(3_000_000),
          budgetMax: null,
        }),
      );
    });

    it('keeps the survivor values and fills its blanks by default', async () => {
      const result = await service.mergeLeads(
        'target',
        TENANT,
        ACTOR,
        { sourceLeadId: 'source' },
        SYSTEM_LEAD_SCOPE,
      );

      const data = targetUpdate().data;
      expect(data).not.toHaveProperty('fullName');
      expect(data).not.toHaveProperty('occupation');
      expect(data).not.toHaveProperty('budgetMin');
      expect(data).toEqual(
        expect.objectContaining({
          email: 'ahmed@example.com',
          residenceArea: 'Nasr City',
        }),
      );
      expect(result.fieldsFromSource).toEqual(['email', 'residenceArea']);
    });

    it('applies explicit choices, including keeping a blank and moving the whole budget range', async () => {
      const result = await service.mergeLeads(
        'target',
        TENANT,
        ACTOR,
        {
          sourceLeadId: 'source',
          fields: {
            fullName: 'source',
            budget: 'source',
            email: 'target',
            occupation: 'target',
          },
        },
        SYSTEM_LEAD_SCOPE,
      );

      const data = targetUpdate().data;
      expect(data.fullName).toBe('Ahmed Hassan Ali');
      expect(Number(data.budgetMin)).toBe(3_000_000);
      expect(data.budgetMax).toBeNull();
      expect(data).not.toHaveProperty('email');
      expect(data).not.toHaveProperty('occupation');
      expect(result.fieldsFromSource).toEqual([
        'fullName',
        'budget',
        'residenceArea',
      ]);
    });
  });

  describe('owner', () => {
    it("takes the duplicate's owner when chosen; open tasks follow the new owner", async () => {
      seed(
        makeLead({ id: 'target', assignedUserId: AGENT_A }),
        makeLead({
          id: 'source',
          assignedUserId: AGENT_B,
          assignedAt: new Date('2026-03-01'),
        }),
      );

      await service.mergeLeads(
        'target',
        TENANT,
        ACTOR,
        { sourceLeadId: 'source', fields: { assignee: 'source' } },
        SYSTEM_LEAD_SCOPE,
      );

      expect(targetUpdate().data).toEqual(
        expect.objectContaining({
          assignedUserId: AGENT_B,
          assignedAt: new Date('2026-03-01'),
        }),
      );
      // The survivor's own open tasks move from A to B.
      expect(lifecycle.followReassignment).toHaveBeenCalledWith(
        'target',
        AGENT_A,
        AGENT_B,
        prisma,
      );
      expect(published().map((event) => event.type)).toEqual(
        expect.arrayContaining([
          DOMAIN_EVENT_TYPES.LEAD_ASSIGNED,
          DOMAIN_EVENT_TYPES.TASKS_CHANGED,
        ]),
      );
      expect(notifications.notifyLeadAssigned).toHaveBeenCalledWith(
        expect.objectContaining({ recipientUserId: AGENT_B, leadId: 'target' }),
      );
    });

    it("moves the duplicate owner's open tasks to the survivor's owner", async () => {
      seed(
        makeLead({ id: 'target', assignedUserId: AGENT_A }),
        makeLead({ id: 'source', assignedUserId: AGENT_B }),
      );

      await service.mergeLeads(
        'target',
        TENANT,
        ACTOR,
        { sourceLeadId: 'source' },
        SYSTEM_LEAD_SCOPE,
      );

      expect(targetUpdate().data).not.toHaveProperty('assignedUserId');
      // Tasks are moved onto the target first, then follow its owner.
      const moveOrder = prisma.task.updateMany.mock.invocationCallOrder[0];
      const followOrder =
        lifecycle.followReassignment.mock.invocationCallOrder[0];
      expect(followOrder).toBeGreaterThan(moveOrder);
      expect(lifecycle.followReassignment).toHaveBeenCalledWith(
        'target',
        AGENT_B,
        AGENT_A,
        prisma,
      );
    });

    it('refuses to change the owner without the assign permission', async () => {
      permissionKeys = new Set(['lead.merge', 'lead.read']);
      seed(
        makeLead({ id: 'target', assignedUserId: AGENT_A }),
        makeLead({ id: 'source', assignedUserId: AGENT_B }),
      );

      await expect(
        service.mergeLeads(
          'target',
          TENANT,
          ACTOR,
          { sourceLeadId: 'source', fields: { assignee: 'source' } },
          SYSTEM_LEAD_SCOPE,
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('does not fill an empty owner without the assign permission', async () => {
      permissionKeys = new Set(['lead.merge', 'lead.read']);
      seed(
        makeLead({ id: 'target', assignedUserId: null }),
        makeLead({ id: 'source', assignedUserId: AGENT_B }),
      );

      await service.mergeLeads(
        'target',
        TENANT,
        ACTOR,
        { sourceLeadId: 'source' },
        SYSTEM_LEAD_SCOPE,
      );

      expect(targetUpdate().data).not.toHaveProperty('assignedUserId');
    });
  });

  it("cancels the duplicate's open rule task when the survivor already has one", async () => {
    seed(makeLead({ id: 'target' }), makeLead({ id: 'source' }));
    prisma.task.findMany.mockResolvedValue([{ ruleKey: 'R1_FIRST_CALL' }]);
    prisma.task.updateMany
      .mockResolvedValueOnce({ count: 1 }) // cancel conflicting rule task
      .mockResolvedValueOnce({ count: 3 }); // move tasks

    await service.mergeLeads(
      'target',
      TENANT,
      ACTOR,
      { sourceLeadId: 'source' },
      SYSTEM_LEAD_SCOPE,
    );

    expect(prisma.task.updateMany).toHaveBeenNthCalledWith(1, {
      where: {
        leadId: 'source',
        status: 'OPEN',
        ruleKey: { in: ['R1_FIRST_CALL'] },
      },
      data: { status: 'CANCELLED', completedAt: expect.any(Date) },
    });
    expect(updateManyCall(prisma.interaction.updateMany)).toBeDefined();
    expect(activity.createActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ cancelledDuplicateTaskCount: 1 }),
      }),
      prisma,
    );
  });

  it('rejects merging into an archived lead', async () => {
    seed(
      makeLead({ id: 'target', status: 'ARCHIVED' }),
      makeLead({ id: 'source' }),
    );

    await expect(
      service.mergeLeads(
        'target',
        TENANT,
        ACTOR,
        { sourceLeadId: 'source' },
        SYSTEM_LEAD_SCOPE,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  describe('findDuplicates', () => {
    it('matches on phone (either slot) or email, inside the scope', async () => {
      const ownScope: LeadScope = { kind: 'own', actorUserId: AGENT_A };
      seed(
        makeLead({
          id: 'lead',
          email: 'Ahmed@Example.com',
          _count: { interactions: 1, tasks: 1, notes: 0, fileAssets: 2 },
        }),
      );
      prisma.lead.findMany.mockResolvedValue([
        makeLead({
          id: 'dup',
          email: 'ahmed@example.com',
          fullName: 'Ahmed H',
          secondaryPhone: '01012345678',
          secondaryPhoneNormalized: '201012345678',
          primaryPhone: '01111111111',
          primaryPhoneNormalized: '201111111111',
        }),
      ]);

      const result = await service.findDuplicates('lead', TENANT, ownScope);

      const where = prisma.lead.findMany.mock.calls[0][0].where as {
        AND: Array<Record<string, unknown>>;
      };
      expect(where.AND[0]).toEqual({
        tenantId: TENANT,
        deletedAt: null,
        id: { not: 'lead' },
        OR: [
          { primaryPhoneNormalized: '201012345678' },
          { secondaryPhoneNormalized: '201012345678' },
          { email: { equals: 'Ahmed@Example.com', mode: 'insensitive' } },
        ],
      });
      expect(where.AND[1]).toEqual({
        OR: [{ assignedUserId: { in: [AGENT_A] } }, { assignedUserId: null }],
      });
      expect(result.counts).toEqual({
        interactions: 1,
        tasks: 1,
        notes: 0,
        files: 2,
      });
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual(
        expect.objectContaining({
          id: 'dup',
          matchedOn: ['phone', 'email'],
          differingFields: ['fullName'],
          contactMasked: true,
        }),
      );
      // Contacts stay masked like everywhere else.
      expect(result.items[0].primaryPhone).not.toBe('01111111111');
    });

    it('404s when the lead itself is outside the scope', async () => {
      seed(makeLead({ id: 'lead', assignedUserId: AGENT_B }));

      await expect(
        service.findDuplicates('lead', TENANT, {
          kind: 'own',
          actorUserId: AGENT_A,
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.lead.findMany).not.toHaveBeenCalled();
    });
  });
});

describe('mergedCustomFields', () => {
  it("fills the survivor's empty custom fields from the duplicate", () => {
    const { mergedCustomFields } = jest.requireActual<
      typeof import('./lead-merge.service')
    >('./lead-merge.service');

    expect(
      mergedCustomFields(
        { unit: 'Villa', floor: null, tags: [] },
        { unit: 'Apartment', floor: 3, tags: ['vip'], area: 'New Cairo' },
      ),
    ).toEqual({
      customFields: {
        unit: 'Villa',
        floor: 3,
        tags: ['vip'],
        area: 'New Cairo',
      },
    });
  });

  it('writes nothing when the duplicate adds no value', () => {
    const { mergedCustomFields } = jest.requireActual<
      typeof import('./lead-merge.service')
    >('./lead-merge.service');

    expect(mergedCustomFields({ unit: 'Villa' }, { unit: '' })).toEqual({});
    expect(mergedCustomFields(null, null)).toEqual({});
  });
});
