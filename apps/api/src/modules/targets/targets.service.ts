import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Prisma, TargetMetric } from '@crmpro/database';
import { PERMISSIONS } from '@crmpro/shared/auth';
import {
  DEFAULT_WORK_SCHEDULE,
  type WorkSchedule,
} from '@crmpro/shared/workflow';
import { scopeUserIds, type LeadScope } from '../../common/auth';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  monthBounds,
  periodOf,
  shiftPeriod,
} from '../../common/utils/month-period.util';
import { AuditWriterService } from '../audit/audit-writer.service';
import type { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import type { SaveTargetsDto } from './dto/save-targets.dto';
import {
  emptyMetricValues,
  TargetActualsService,
} from './target-actuals.service';
import {
  COUNT_METRICS,
  SUGGESTION_MONTHS,
  TARGET_AUDIT_ACTIONS,
  TARGET_AUDIT_ENTITY,
  TARGET_METRICS,
} from './targets.constants';
import type {
  MetricProgress,
  MetricTargets,
  MyTargetsResponse,
  TargetPerson,
  TargetsGridResponse,
  TargetSuggestionsResponse,
} from './targets.types';
import {
  evaluateProgress,
  monthPace,
  roundSuggestion,
} from './utils/target-pace.util';

const DEFAULT_CURRENCY = 'EGP';

export interface WorkspaceCalendar {
  timeZone: string;
  currency: string;
  schedule: WorkSchedule;
}

type EligibleUser = TargetPerson & { createdAt: Date };

type TargetRecord = {
  id: string;
  userId: string | null;
  metric: TargetMetric;
  value: Prisma.Decimal;
};

const targetKey = (userId: string | null, metric: TargetMetric) =>
  `${userId ?? 'workspace'}:${metric}`;

function emptyTargets(): MetricTargets {
  return Object.fromEntries(
    TARGET_METRICS.map((metric) => [metric, null]),
  ) as MetricTargets;
}

/**
 * Monthly targets per person and for the workspace (spec §2.6), with what
 * was actually done that month. Managers see the people in their lead scope;
 * only workspace-wide managers (lead.read-all) see and set workspace goals.
 */
@Injectable()
export class TargetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly actuals: TargetActualsService,
    private readonly auditWriter: AuditWriterService,
  ) {}

  async getGrid(
    user: AuthenticatedUser,
    scope: LeadScope,
    requestedPeriod?: string,
    now = new Date(),
  ): Promise<TargetsGridResponse> {
    const calendar = await this.loadCalendar(user.tenantId);
    const period = requestedPeriod ?? periodOf(now, calendar.timeZone);
    const withWorkspace = scope.kind === 'all';

    const [people, targets, actuals] = await Promise.all([
      this.listEligibleUsers(user.tenantId, scope),
      this.prisma.target.findMany({
        where: { tenantId: user.tenantId, period },
        select: { id: true, userId: true, metric: true, value: true },
      }),
      this.actuals.compute(
        user.tenantId,
        monthBounds(period, calendar.timeZone),
      ),
    ]);

    const byOwner = new Map<string, MetricTargets>();
    for (const target of targets) {
      const owner = target.userId ?? 'workspace';
      const values = byOwner.get(owner) ?? emptyTargets();
      values[target.metric] = target.value.toNumber();
      byOwner.set(owner, values);
    }

    return {
      period,
      timeZone: calendar.timeZone,
      currency: calendar.currency,
      metrics: TARGET_METRICS,
      workspace: withWorkspace
        ? {
            targets: byOwner.get('workspace') ?? emptyTargets(),
            actuals: actuals.total,
          }
        : null,
      users: people.map(({ createdAt: _createdAt, ...person }) => ({
        user: person,
        targets: byOwner.get(person.id) ?? emptyTargets(),
        actuals: actuals.byUser.get(person.id) ?? emptyMetricValues(),
      })),
    };
  }

  /**
   * Sets and clears targets in one transaction. Entries with the same value
   * are no-ops; one audit row lists what changed.
   */
  async save(
    user: AuthenticatedUser,
    scope: LeadScope,
    dto: SaveTargetsDto,
    now = new Date(),
  ): Promise<TargetsGridResponse> {
    const seen = new Set<string>();
    for (const entry of dto.entries) {
      const key = targetKey(entry.userId, entry.metric);
      if (seen.has(key)) {
        throw new BadRequestException(
          'Each person and metric may appear only once',
        );
      }
      seen.add(key);
      if (
        entry.value !== null &&
        COUNT_METRICS.has(entry.metric) &&
        !Number.isInteger(entry.value)
      ) {
        throw new BadRequestException(
          `${entry.metric} targets must be whole numbers`,
        );
      }
    }

    if (
      scope.kind !== 'all' &&
      dto.entries.some((entry) => entry.userId === null)
    ) {
      throw new ForbiddenException(
        'Only workspace-wide managers can set workspace targets',
      );
    }

    const requestedUserIds = [
      ...new Set(
        dto.entries
          .map((entry) => entry.userId)
          .filter((id): id is string => id !== null),
      ),
    ];
    if (requestedUserIds.length > 0) {
      const eligible = new Set(
        (await this.listEligibleUsers(user.tenantId, scope)).map(
          (person) => person.id,
        ),
      );
      if (requestedUserIds.some((id) => !eligible.has(id))) {
        throw new BadRequestException(
          'Targets can only be set for active people you manage',
        );
      }
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        const existing: TargetRecord[] = await tx.target.findMany({
          where: { tenantId: user.tenantId, period: dto.period },
          select: { id: true, userId: true, metric: true, value: true },
        });
        const current = new Map(
          existing.map((target) => [
            targetKey(target.userId, target.metric),
            target,
          ]),
        );

        const changes: Array<{
          userId: string | null;
          metric: TargetMetric;
          from: number | null;
          to: number | null;
        }> = [];

        for (const entry of dto.entries) {
          const found = current.get(targetKey(entry.userId, entry.metric));
          const before = found ? found.value.toNumber() : null;
          if (before === entry.value) continue;

          if (entry.value === null) {
            await tx.target.delete({ where: { id: found!.id } });
          } else if (found) {
            await tx.target.update({
              where: { id: found.id },
              data: { value: entry.value, updatedByUserId: user.id },
            });
          } else {
            // The partial unique indexes (one row per person | workspace,
            // month and metric) catch a concurrent insert → 409 below.
            await tx.target.create({
              data: {
                tenantId: user.tenantId,
                userId: entry.userId,
                period: dto.period,
                metric: entry.metric,
                value: entry.value,
                updatedByUserId: user.id,
              },
            });
          }
          changes.push({
            userId: entry.userId,
            metric: entry.metric,
            from: before,
            to: entry.value,
          });
        }

        if (changes.length > 0) {
          await this.auditWriter.createAuditLog({
            tenantId: user.tenantId,
            actorUserId: user.id,
            action: TARGET_AUDIT_ACTIONS.UPDATED,
            entityType: TARGET_AUDIT_ENTITY,
            entityId: null,
            metadata: { period: dto.period, changes },
            tx,
          });
        }
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Targets were changed at the same time. Reload and try again.',
        );
      }
      throw error;
    }

    return this.getGrid(user, scope, dto.period, now);
  }

  /**
   * Proposed targets: the average of the last 3 complete months before the
   * period (never the current, unfinished month). A person who joined in the
   * window is averaged over the months they were here. Nothing is written.
   */
  async suggest(
    user: AuthenticatedUser,
    scope: LeadScope,
    requestedPeriod?: string,
    now = new Date(),
  ): Promise<TargetSuggestionsResponse> {
    const calendar = await this.loadCalendar(user.tenantId);
    const current = periodOf(now, calendar.timeZone);
    const period = requestedPeriod ?? current;
    const anchor = period < current ? period : current;
    const months = Array.from({ length: SUGGESTION_MONTHS }, (_, index) =>
      shiftPeriod(anchor, index - SUGGESTION_MONTHS),
    );
    const bounds = months.map((month) => monthBounds(month, calendar.timeZone));

    const [people, history] = await Promise.all([
      this.listEligibleUsers(user.tenantId, scope),
      Promise.all(
        bounds.map((range) => this.actuals.compute(user.tenantId, range)),
      ),
    ]);

    const average = (
      pick: (month: (typeof history)[number]) => Record<TargetMetric, number>,
      monthIndexes: number[],
    ) =>
      Object.fromEntries(
        TARGET_METRICS.map((metric) => {
          if (monthIndexes.length === 0) return [metric, null];
          const sum = monthIndexes.reduce(
            (total, index) => total + pick(history[index])[metric],
            0,
          );
          return [metric, roundSuggestion(metric, sum / monthIndexes.length)];
        }),
      ) as Record<TargetMetric, number | null>;

    const allMonths = months.map((_, index) => index);

    return {
      period,
      basedOn: months,
      workspace:
        scope.kind === 'all'
          ? average((month) => month.total, allMonths)
          : null,
      users: people.map((person) => {
        // Present from whichever comes first: the account's creation or the
        // first month with recorded work (imported or seeded history predates
        // the account).
        const firstActive = allMonths.find((index) =>
          TARGET_METRICS.some(
            (metric) =>
              (history[index].byUser.get(person.id)?.[metric] ?? 0) > 0,
          ),
        );
        const presentMonths = allMonths.filter(
          (index) =>
            bounds[index].end > person.createdAt ||
            (firstActive !== undefined && index >= firstActive),
        );
        return {
          userId: person.id,
          values: average(
            (month) => month.byUser.get(person.id) ?? emptyMetricValues(),
            presentMonths,
          ),
        };
      }),
    };
  }

  /**
   * The caller's month: their targets, actuals and pace against the share of
   * working days gone. Workspace totals for owners/managers who read
   * analytics across the workspace.
   */
  async getMine(
    user: AuthenticatedUser,
    permissionKeys: ReadonlySet<string>,
    requestedPeriod?: string,
    now = new Date(),
  ): Promise<MyTargetsResponse> {
    const calendar = await this.loadCalendar(user.tenantId);
    const period = requestedPeriod ?? periodOf(now, calendar.timeZone);
    const withWorkspace =
      permissionKeys.has(PERMISSIONS.ANALYTICS_READ) &&
      permissionKeys.has(PERMISSIONS.LEAD_READ_ALL);
    const bounds = monthBounds(period, calendar.timeZone);

    const [rows, actuals] = await Promise.all([
      this.prisma.target.findMany({
        where: {
          tenantId: user.tenantId,
          period,
          OR: withWorkspace
            ? [{ userId: user.id }, { userId: null }]
            : [{ userId: user.id }],
        },
        select: { userId: true, metric: true, value: true },
      }),
      // Workspace totals need everyone; otherwise only the caller's rows.
      this.actuals.compute(
        user.tenantId,
        bounds,
        withWorkspace ? {} : { userId: user.id },
      ),
    ]);
    const targets = rows.filter((row) => row.userId === user.id);
    const workspaceTargets = rows.filter((row) => row.userId === null);

    const pace = monthPace(period, now, calendar.schedule);
    const progress = (
      rows: Array<{ metric: TargetMetric; value: Prisma.Decimal }>,
      values: Record<TargetMetric, number>,
    ): MetricProgress[] => {
      const targetOf = new Map(
        rows.map((row) => [row.metric, row.value.toNumber()]),
      );
      return TARGET_METRICS.map((metric) =>
        evaluateProgress(
          metric,
          targetOf.get(metric) ?? null,
          values[metric],
          pace.share,
        ),
      );
    };

    const mine = actuals.byUser.get(user.id) ?? emptyMetricValues();
    return {
      period,
      timeZone: calendar.timeZone,
      currency: calendar.currency,
      pace,
      hasTargets: targets.length > 0,
      metrics: progress(targets, mine),
      workspace: withWorkspace
        ? {
            hasTargets: workspaceTargets.length > 0,
            metrics: progress(workspaceTargets, actuals.total),
          }
        : null,
    };
  }

  async loadCalendar(tenantId: string): Promise<WorkspaceCalendar> {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: {
        timezone: true,
        currency: true,
        workingDays: true,
        workdayStartMinute: true,
        workdayEndMinute: true,
      },
    });
    if (!settings) {
      return {
        timeZone: DEFAULT_WORK_SCHEDULE.timeZone,
        currency: DEFAULT_CURRENCY,
        schedule: DEFAULT_WORK_SCHEDULE,
      };
    }
    return {
      timeZone: settings.timezone,
      currency: settings.currency,
      schedule: {
        timeZone: settings.timezone,
        workingDays: settings.workingDays,
        startMinute: settings.workdayStartMinute,
        endMinute: settings.workdayEndMinute,
      },
    };
  }

  /**
   * Active people who can hold leads (role has lead.read), inside the
   * caller's lead scope. Deactivated and deleted users are left out.
   */
  private async listEligibleUsers(
    tenantId: string,
    scope: LeadScope,
  ): Promise<EligibleUser[]> {
    const userIds = scopeUserIds(scope);
    const users = await this.prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
        deletedAt: null,
        ...(userIds ? { id: { in: userIds } } : {}),
        role: {
          permissions: {
            some: { permission: { key: PERMISSIONS.LEAD_READ } },
          },
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        role: { select: { name: true } },
        team: { select: { id: true, name: true, deletedAt: true } },
      },
      orderBy: { name: 'asc' },
    });
    return users.map((person) => ({
      id: person.id,
      name: person.name,
      email: person.email,
      createdAt: person.createdAt,
      roleName: person.role?.name ?? null,
      team:
        person.team && !person.team.deletedAt
          ? { id: person.team.id, name: person.team.name }
          : null,
    }));
  }
}
