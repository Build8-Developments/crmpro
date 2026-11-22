import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DealStatus,
  InterestLevel,
  LeadActivityEventType,
  LeadStatus,
  Prisma,
  TaskStatus,
} from '@crmpro/database';
import { PERMISSIONS } from '@crmpro/shared/auth';
import { API_ERROR_CODES } from '@crmpro/shared/errors';
import {
  LEAD_MERGE_FIELDS,
  type LeadMergeField,
  type LeadMergeFieldChoice,
} from '@crmpro/shared/leads';
import {
  type LeadScope,
  PermissionsService,
  SYSTEM_LEAD_SCOPE,
  leadScopeWhere,
} from '../../../common/auth';
import { DomainEventBus } from '../../../common/events/domain-event-bus.service';
import {
  LeadAssignedEvent,
  LeadUpdatedEvent,
  TasksChangedEvent,
} from '../../../common/events/domain-event.types';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { AuditWriterService } from '../../audit/audit-writer.service';
import { AUDIT_ENTITY_TYPES } from '../../audit/audit.constants';
import { NotificationTriggerService } from '../../notifications/notification-trigger.service';
import { TaskLifecycleService } from '../../workflow/common/task-lifecycle.service';
import { MergeLeadsDto } from '../dto/merge-leads.dto';
import { leadSelect, toLeadResponse } from '../lead.mapper';
import type {
  LeadDuplicateResponse,
  LeadDuplicatesResponse,
  LeadMergeCounts,
  LeadMergeResult,
} from '../types/lead-merge.types';
import { LeadActivityService } from './lead-activity.service';

export const LEAD_MERGE_AUDIT_ACTION = 'LEAD_MERGED';

const MAX_DUPLICATES = 20;

const mergeCountSelect = {
  interactions: true,
  tasks: true,
  notes: { where: { deletedAt: null } },
  fileAssets: { where: { deletedAt: null } },
} satisfies Prisma.LeadCountOutputTypeSelect;

/** Everything the response needs plus the raw columns a merge reads. */
const mergeLeadSelect = {
  ...leadSelect,
  tenantId: true,
  sourceId: true,
  assignedUserId: true,
  assignedAt: true,
  externalId: true,
  deletedAt: true,
  mergedIntoId: true,
  assignedUser: {
    select: { id: true, name: true, isActive: true, deletedAt: true },
  },
  _count: { select: mergeCountSelect },
} satisfies Prisma.LeadSelect;

type MergeLeadRecord = Prisma.LeadGetPayload<{
  select: typeof mergeLeadSelect;
}>;

const INTEREST_RANK: Record<InterestLevel, number> = {
  [InterestLevel.LOW]: 1,
  [InterestLevel.MEDIUM]: 2,
  [InterestLevel.HIGH]: 3,
  [InterestLevel.HOT]: 4,
};

function interestRank(level: InterestLevel | null): number {
  return level ? INTEREST_RANK[level] : 0;
}

function toCounts(lead: MergeLeadRecord): LeadMergeCounts {
  return {
    interactions: lead._count.interactions,
    tasks: lead._count.tasks,
    notes: lead._count.notes,
    files: lead._count.fileAssets,
  };
}

function minDate(a: Date | null, b: Date | null): Date | null {
  if (!a) return b;
  if (!b) return a;
  return a <= b ? a : b;
}

function maxDate(a: Date | null, b: Date | null): Date | null {
  if (!a) return b;
  if (!b) return a;
  return a >= b ? a : b;
}

/**
 * The comparable (unmasked) value of each mergeable field. Budget is one
 * field so a range is never split between two leads.
 */
function mergeFieldValue(
  lead: MergeLeadRecord,
  field: LeadMergeField,
): string | null {
  switch (field) {
    case 'fullName':
      return lead.fullName;
    case 'email':
      return lead.email ? lead.email.toLowerCase() : null;
    case 'source':
      return lead.sourceId;
    case 'budget':
      return lead.budgetMin === null && lead.budgetMax === null
        ? null
        : `${lead.budgetMin?.toString() ?? ''}-${lead.budgetMax?.toString() ?? ''}`;
    case 'occupation':
      return lead.occupation;
    case 'residenceArea':
      return lead.residenceArea;
    case 'paymentPreference':
      return lead.paymentPreference;
    case 'contactChannelPreference':
      return lead.contactChannelPreference;
    case 'contactTimePreference':
      return lead.contactTimePreference;
    case 'purchasePurpose':
      return lead.purchasePurpose;
    case 'assignee':
      return lead.assignedUserId;
  }
}

function differingFields(
  a: MergeLeadRecord,
  b: MergeLeadRecord,
): LeadMergeField[] {
  return LEAD_MERGE_FIELDS.filter(
    (field) => mergeFieldValue(a, field) !== mergeFieldValue(b, field),
  );
}

/**
 * Finds and merges duplicate leads. A merge folds one lead (the source) into
 * another (the target, which survives): its whole history, tasks, files and
 * project interests move over, chosen field values are copied, and the source
 * is soft-deleted with `mergedIntoId` pointing at the survivor.
 *
 * Pipeline, stage, status, heat and lost reason always stay with the target:
 * a stage change has side effects (closing cancels tasks, won/lost analytics),
 * so the user picks which lead survives instead of mixing stages.
 */
@Injectable()
export class LeadMergeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leadActivity: LeadActivityService,
    private readonly auditWriter: AuditWriterService,
    private readonly taskLifecycle: TaskLifecycleService,
    private readonly domainEventBus: DomainEventBus,
    private readonly notificationTrigger: NotificationTriggerService,
    private readonly permissions: PermissionsService,
  ) {}

  /**
   * Other live leads in the caller's scope that share a normalized phone
   * (primary or secondary, either direction) or the email (case-insensitive).
   */
  async findDuplicates(
    leadId: string,
    tenantId: string,
    scope: LeadScope,
  ): Promise<LeadDuplicatesResponse> {
    const lead = await this.findLiveLeadOrThrow(leadId, tenantId, scope);

    const phones = [
      lead.primaryPhoneNormalized,
      lead.secondaryPhoneNormalized,
    ].filter((phone): phone is string => Boolean(phone));
    const or: Prisma.LeadWhereInput[] = phones.flatMap((phone) => [
      { primaryPhoneNormalized: phone },
      { secondaryPhoneNormalized: phone },
    ]);
    if (lead.email) {
      or.push({ email: { equals: lead.email, mode: 'insensitive' } });
    }

    const matches = await this.prisma.lead.findMany({
      where: {
        AND: [
          { tenantId, deletedAt: null, id: { not: lead.id }, OR: or },
          leadScopeWhere(scope),
        ],
      },
      select: mergeLeadSelect,
      orderBy: { createdAt: 'asc' },
      take: MAX_DUPLICATES,
    });

    const phoneSet = new Set(phones);
    const email = lead.email?.toLowerCase() ?? null;

    return {
      counts: toCounts(lead),
      items: matches.map((match): LeadDuplicateResponse => {
        const matchedOn: LeadDuplicateResponse['matchedOn'] = [];
        if (
          phoneSet.has(match.primaryPhoneNormalized) ||
          (match.secondaryPhoneNormalized !== null &&
            phoneSet.has(match.secondaryPhoneNormalized))
        ) {
          matchedOn.push('phone');
        }
        if (email && match.email?.toLowerCase() === email) {
          matchedOn.push('email');
        }
        return {
          ...toLeadResponse(match),
          counts: toCounts(match),
          matchedOn,
          differingFields: differingFields(lead, match),
        };
      }),
    };
  }

  /** Merge `dto.sourceLeadId` into `targetId` (the survivor), atomically. */
  async mergeLeads(
    targetId: string,
    tenantId: string,
    actorUserId: string,
    dto: MergeLeadsDto,
    scope: LeadScope,
  ): Promise<LeadMergeResult> {
    if (targetId === dto.sourceLeadId) {
      throw new BadRequestException('Choose two different leads to merge');
    }

    const target = await this.findLiveLeadOrThrow(targetId, tenantId, scope);
    const source = await this.findSourceLeadOrThrow(
      dto.sourceLeadId,
      tenantId,
      scope,
    );

    if (target.status === LeadStatus.ARCHIVED) {
      throw new BadRequestException(
        'Restore the lead you are keeping before merging into it',
      );
    }

    const canAssign = await this.canAssign(actorUserId, tenantId);
    const plan = this.planFields(target, source, dto, canAssign);

    const previousOwnerId = target.assignedUserId;
    const newOwnerId = plan.assignee;
    const ownerChanged = newOwnerId !== previousOwnerId;
    if (ownerChanged && !canAssign) {
      throw new ForbiddenException(
        "Changing the lead's owner needs the permission to assign leads",
      );
    }

    const now = new Date();
    const moveExternalId = !target.externalId && Boolean(source.externalId);

    const outcome = await this.prisma.$transaction(async (tx) => {
      // A live deal belongs on a won lead: the lead that disappears must not
      // carry one (keep that lead instead, or cancel the deal first).
      const sourceLiveDeals = await tx.deal.count({
        where: { leadId: source.id, status: { not: DealStatus.CANCELLED } },
      });
      if (sourceLiveDeals > 0) {
        throw new ConflictException({
          code: API_ERROR_CODES.DEAL_ACTIVE,
          message:
            'The duplicate has an active deal. Keep that lead instead, or cancel its deal first.',
        });
      }

      // Claim the source first: a concurrent merge (or delete) loses here.
      // The source's externalId is cleared before the target takes it (the
      // partial unique index covers live leads only, but be explicit).
      const claimed = await tx.lead.updateMany({
        where: {
          id: source.id,
          tenantId,
          deletedAt: null,
          mergedIntoId: null,
        },
        data: {
          deletedAt: now,
          mergedIntoId: target.id,
          nextTaskDueAt: null,
          ...(moveExternalId ? { externalId: null } : {}),
        },
      });
      if (claimed.count !== 1) {
        throw new ConflictException(
          'This lead was changed while merging. Refresh and try again.',
        );
      }
      // Leads merged into the source earlier now point at the survivor.
      await tx.lead.updateMany({
        where: { tenantId, mergedIntoId: source.id },
        data: { mergedIntoId: target.id },
      });

      // Target's own open tasks follow a new owner first (same rule as a
      // manual reassignment).
      if (ownerChanged) {
        await this.taskLifecycle.followReassignment(
          target.id,
          previousOwnerId,
          newOwnerId,
          tx,
        );
      }

      const cancelledTaskCount = await this.cancelConflictingRuleTasks(
        target.id,
        source.id,
        now,
        tx,
      );

      const tasks = await tx.task.updateMany({
        where: { leadId: source.id },
        data: { leadId: target.id },
      });
      // The duplicate owner's open tasks now follow the survivor's owner
      // (cancelled when the survivor has no owner, like an unassignment).
      if (source.assignedUserId && source.assignedUserId !== newOwnerId) {
        await this.taskLifecycle.followReassignment(
          target.id,
          source.assignedUserId,
          newOwnerId,
          tx,
        );
      }

      const interactions = await tx.interaction.updateMany({
        where: { leadId: source.id },
        data: { leadId: target.id },
      });
      // Notes and files include soft-deleted rows; the summary counts live ones.
      await tx.leadNote.updateMany({
        where: { leadId: source.id },
        data: { leadId: target.id },
      });
      const activities = await tx.leadActivity.updateMany({
        where: { leadId: source.id },
        data: { leadId: target.id },
      });
      await tx.fileAsset.updateMany({
        where: { leadId: source.id, tenantId },
        data: { leadId: target.id },
      });
      // Only cancelled deals can be here (guarded above): history moves too.
      await tx.deal.updateMany({
        where: { leadId: source.id, tenantId },
        data: { leadId: target.id },
      });
      const projectInterests = await this.mergeProjectInterests(
        target.id,
        source.id,
        tx,
      );

      await tx.lead.update({
        where: { id: target.id },
        data: {
          ...plan.data,
          ...(ownerChanged
            ? {
                assignedUserId: newOwnerId,
                // The new owner has had this person since the duplicate was
                // given to them; keeps the SLA clock honest.
                assignedAt: newOwnerId ? (source.assignedAt ?? now) : null,
              }
            : {}),
          ...plan.phone,
          firstContactedAt: minDate(
            target.firstContactedAt,
            source.firstContactedAt,
          ),
          lastContactedAt: maxDate(
            target.lastContactedAt,
            source.lastContactedAt,
          ),
          contactAttempts: target.contactAttempts + source.contactAttempts,
          ...(moveExternalId ? { externalId: source.externalId } : {}),
        },
      });
      await this.taskLifecycle.refreshNextTaskDueAt(target.id, tx);

      const moved = {
        interactions: interactions.count,
        tasks: tasks.count,
        notes: source._count.notes,
        files: source._count.fileAssets,
        activities: activities.count,
        projectInterests,
      };
      const summary = {
        sourceLeadId: source.id,
        sourceLeadName: source.fullName,
        moved,
        fieldsFromSource: plan.fieldsFromSource,
        secondaryPhoneAdded: plan.secondaryPhoneAdded,
        cancelledDuplicateTaskCount: cancelledTaskCount,
        ...(ownerChanged
          ? {
              fromUserId: previousOwnerId,
              fromUserName: target.assignedUser?.name ?? null,
              toUserId: newOwnerId,
              toUserName: source.assignedUser?.name ?? null,
            }
          : {}),
        ...(moveExternalId ? { externalIdMoved: true } : {}),
      };

      await this.leadActivity.createActivity(
        {
          tenantId,
          leadId: target.id,
          actorUserId,
          eventType: LeadActivityEventType.LEAD_MERGED,
          metadata: summary,
        },
        tx,
      );
      await this.auditWriter.createAuditLog({
        tenantId,
        actorUserId,
        action: LEAD_MERGE_AUDIT_ACTION,
        entityType: AUDIT_ENTITY_TYPES.LEAD,
        entityId: target.id,
        metadata: summary,
        tx,
      });

      return {
        moved,
        tasksTouched: tasks.count > 0 || cancelledTaskCount > 0 || ownerChanged,
      };
    });

    const survivor = await this.findLiveLeadOrThrow(
      target.id,
      tenantId,
      SYSTEM_LEAD_SCOPE,
    );

    // Same invalidation as a lead update, for both leads (drawers and lists
    // showing the merged-away lead refresh too).
    void this.domainEventBus.publish(new LeadUpdatedEvent(tenantId, target.id));
    void this.domainEventBus.publish(new LeadUpdatedEvent(tenantId, source.id));
    if (ownerChanged) {
      void this.domainEventBus.publish(
        new LeadAssignedEvent(tenantId, target.id),
      );
      if (newOwnerId && newOwnerId !== actorUserId) {
        void this.notificationTrigger.notifyLeadAssigned({
          tenantId,
          recipientUserId: newOwnerId,
          leadId: target.id,
          leadName: survivor.fullName,
          actorUserId,
        });
      }
    }
    if (outcome.tasksTouched) {
      void this.domainEventBus.publish(new TasksChangedEvent(tenantId));
    }

    return {
      lead: toLeadResponse(survivor),
      mergedLeadId: source.id,
      moved: outcome.moved,
      fieldsFromSource: plan.fieldsFromSource,
      secondaryPhoneAdded: plan.secondaryPhoneAdded,
    };
  }

  // ─── Field plan ──────────────────────────────────────────────────────────

  /**
   * Which value each field ends up with. An explicit choice wins; otherwise
   * the target keeps its value, and a blank on the target is filled from the
   * source. The owner is only filled in when the actor may assign leads.
   */
  private planFields(
    target: MergeLeadRecord,
    source: MergeLeadRecord,
    dto: MergeLeadsDto,
    canAssign: boolean,
  ) {
    const fieldsFromSource: LeadMergeField[] = [];
    const takesSource = (field: LeadMergeField): boolean => {
      const sourceValue = mergeFieldValue(source, field);
      const targetValue = mergeFieldValue(target, field);
      if (sourceValue === targetValue) return false;

      const explicit: LeadMergeFieldChoice | undefined = dto.fields?.[field];
      const fillBlank =
        targetValue === null &&
        sourceValue !== null &&
        (field !== 'assignee' || canAssign);
      const choice = explicit ?? (fillBlank ? 'source' : 'target');
      if (choice === 'source') fieldsFromSource.push(field);
      return choice === 'source';
    };

    const data: Prisma.LeadUncheckedUpdateInput = {};
    if (takesSource('fullName')) data.fullName = source.fullName;
    if (takesSource('email')) data.email = source.email;
    if (takesSource('source')) data.sourceId = source.sourceId;
    if (takesSource('budget')) {
      data.budgetMin = source.budgetMin;
      data.budgetMax = source.budgetMax;
    }
    if (takesSource('occupation')) data.occupation = source.occupation;
    if (takesSource('residenceArea')) data.residenceArea = source.residenceArea;
    if (takesSource('paymentPreference')) {
      data.paymentPreference = source.paymentPreference;
    }
    if (takesSource('contactChannelPreference')) {
      data.contactChannelPreference = source.contactChannelPreference;
    }
    if (takesSource('contactTimePreference')) {
      data.contactTimePreference = source.contactTimePreference;
    }
    if (takesSource('purchasePurpose')) {
      data.purchasePurpose = source.purchasePurpose;
    }

    let assignee = target.assignedUserId;
    if (takesSource('assignee')) {
      const owner = source.assignedUser;
      if (owner && (!owner.isActive || owner.deletedAt)) {
        throw new BadRequestException(
          "The duplicate's owner is no longer active; keep this lead's owner",
        );
      }
      assignee = source.assignedUserId;
    }

    return {
      data,
      assignee,
      fieldsFromSource,
      ...this.planPhone(target, source),
    };
  }

  /**
   * The survivor keeps its phones. When it has no secondary phone, the
   * duplicate's first phone it doesn't already have becomes the secondary.
   */
  private planPhone(target: MergeLeadRecord, source: MergeLeadRecord) {
    if (target.secondaryPhone !== null) {
      return { phone: {}, secondaryPhoneAdded: false };
    }
    const known = new Set([target.primaryPhoneNormalized]);
    const candidates = [
      {
        phone: source.primaryPhone,
        normalized: source.primaryPhoneNormalized,
      },
      {
        phone: source.secondaryPhone,
        normalized: source.secondaryPhoneNormalized,
      },
    ];
    const extra = candidates.find(
      (candidate): candidate is { phone: string; normalized: string } =>
        candidate.phone !== null &&
        candidate.normalized !== null &&
        !known.has(candidate.normalized),
    );
    if (!extra) return { phone: {}, secondaryPhoneAdded: false };
    return {
      phone: {
        secondaryPhone: extra.phone,
        secondaryPhoneNormalized: extra.normalized,
      },
      secondaryPhoneAdded: true,
    };
  }

  // ─── Transaction steps ───────────────────────────────────────────────────

  /**
   * At most one OPEN task per (lead, ruleKey). When both leads have the same
   * open rule task (e.g. both have a "first call"), the duplicate's copy is
   * cancelled before the tasks move.
   */
  private async cancelConflictingRuleTasks(
    targetId: string,
    sourceId: string,
    now: Date,
    tx: Prisma.TransactionClient,
  ): Promise<number> {
    const targetRuleTasks = await tx.task.findMany({
      where: {
        leadId: targetId,
        status: TaskStatus.OPEN,
        ruleKey: { not: null },
      },
      select: { ruleKey: true },
    });
    const ruleKeys = targetRuleTasks
      .map((task) => task.ruleKey)
      .filter((key): key is string => key !== null);
    if (ruleKeys.length === 0) return 0;

    const result = await tx.task.updateMany({
      where: {
        leadId: sourceId,
        status: TaskStatus.OPEN,
        ruleKey: { in: ruleKeys },
      },
      data: { status: TaskStatus.CANCELLED, completedAt: now },
    });
    return result.count;
  }

  /**
   * Union of both leads' project interests; when both have the same project
   * the higher interest level wins. Moved rows keep their createdAt
   * (analytics buckets interest by that date).
   */
  private async mergeProjectInterests(
    targetId: string,
    sourceId: string,
    tx: Prisma.TransactionClient,
  ): Promise<number> {
    const [targetInterests, sourceInterests] = await Promise.all([
      tx.leadProjectInterest.findMany({
        where: { leadId: targetId },
        select: { projectId: true, interestLevel: true },
      }),
      tx.leadProjectInterest.findMany({
        where: { leadId: sourceId },
        select: { projectId: true, interestLevel: true },
      }),
    ]);
    const targetLevels = new Map(
      targetInterests.map((interest) => [
        interest.projectId,
        interest.interestLevel,
      ]),
    );

    const moveProjectIds: string[] = [];
    for (const interest of sourceInterests) {
      if (!targetLevels.has(interest.projectId)) {
        moveProjectIds.push(interest.projectId);
        continue;
      }
      const targetLevel = targetLevels.get(interest.projectId) ?? null;
      if (interestRank(interest.interestLevel) > interestRank(targetLevel)) {
        await tx.leadProjectInterest.update({
          where: {
            leadId_projectId: {
              leadId: targetId,
              projectId: interest.projectId,
            },
          },
          data: { interestLevel: interest.interestLevel },
        });
      }
    }

    if (moveProjectIds.length > 0) {
      await tx.leadProjectInterest.updateMany({
        where: { leadId: sourceId, projectId: { in: moveProjectIds } },
        data: { leadId: targetId },
      });
    }
    // Whatever is left duplicated a target interest and has been folded in.
    await tx.leadProjectInterest.deleteMany({ where: { leadId: sourceId } });

    return sourceInterests.length;
  }

  // ─── Lookups ─────────────────────────────────────────────────────────────

  private async findLiveLeadOrThrow(
    id: string,
    tenantId: string,
    scope: LeadScope,
  ): Promise<MergeLeadRecord> {
    // Out of scope behaves exactly like missing.
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId, deletedAt: null, ...leadScopeWhere(scope) },
      select: mergeLeadSelect,
    });
    if (!lead) throw new NotFoundException('Lead not found');
    return lead;
  }

  /** Like a live lookup, but tells "already merged" apart from "missing". */
  private async findSourceLeadOrThrow(
    id: string,
    tenantId: string,
    scope: LeadScope,
  ): Promise<MergeLeadRecord> {
    const lead = await this.prisma.lead.findFirst({
      where: { id, tenantId, ...leadScopeWhere(scope) },
      select: mergeLeadSelect,
    });
    if (!lead) throw new NotFoundException('Lead not found');
    if (lead.mergedIntoId) {
      throw new ConflictException(
        'That lead was already merged into another lead',
      );
    }
    if (lead.deletedAt) throw new NotFoundException('Lead not found');
    return lead;
  }

  private async canAssign(userId: string, tenantId: string): Promise<boolean> {
    const keys = await this.permissions.getPermissionKeysForUser(
      userId,
      tenantId,
    );
    return keys.has(PERMISSIONS.LEAD_ASSIGN);
  }
}
