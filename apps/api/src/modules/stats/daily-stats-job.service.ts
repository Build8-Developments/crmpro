import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CacheService } from '../../common/cache/cache.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ACCESSIBLE_TENANT_STATUSES } from '../../common/tenant-access/tenant-access.constants';
import { TenantAccessService } from '../../common/tenant-access/tenant-access.service';
import { SchedulerService } from '../scheduler/scheduler.service';
import { TenantClockService } from '../workflow/common/tenant-clock.service';
import { AchievementsService } from './achievements/achievements.service';
import { DailyStatsService } from './daily-stats.service';
import {
  BACKDATE_WINDOW_MS,
  BACKFILL_BATCH_DAYS,
  BACKFILL_DAYS,
  BACKFILL_DONE_TTL_SECONDS,
  BACKFILL_STATE_TTL_SECONDS,
  backfillStateKey,
  DAILY_STATS_EVERY_MS,
  DAILY_STATS_JOB,
  FINAL_CLAIM_TTL_SECONDS,
  PASS_CLAIM_TTL_SECONDS,
  STATS_CLAIM_KEYS,
} from './stats.constants';
import {
  addDays,
  dbDateToDay,
  dayToDbDate,
  localDayBounds,
  localDayOf,
} from './utils/local-day.util';

/**
 * Backfill progress: next day to compute (walking back) down to `until`.
 * When done, `oldestDay` is the earliest day that had rows at that point
 * (null: none). Old days are never rewritten afterwards, so if that day's
 * rows are gone the table was wiped (re-seed, restore) and the backfill
 * starts over. A flag without `oldestDay` predates this and re-runs once.
 */
export type BackfillState =
  | { done: true; oldestDay?: string | null }
  | { done?: false; cursor: string; until: string };

export interface TenantPassResult {
  /** Past days given their final computation this tick. */
  finalized: string[];
  /** Today was refreshed (false when another instance holds it). */
  today: boolean;
  /** Days computed by the backfill this tick. */
  backfilled: number;
}

/**
 * The `daily-stats` scheduler job (every 15 minutes), per accessible tenant:
 *
 * 1. **Final passes** — yesterday once it has ended, and the day three days
 *    back once the 48h back-dating window has closed. Each is claimed once
 *    per tenant/day (Redis SET NX, kept until it expires) and skipped when
 *    the stored rows were already computed after that point.
 * 2. **Today** — always refreshed (claimed for the duration of the pass so
 *    overlapping ticks or instances skip it).
 * 3. **Backfill** — a tenant with no rows before today gets the last 90 days
 *    (not before the tenant existed), BACKFILL_BATCH_DAYS per tick, resumable
 *    from its Redis cursor.
 * 4. **Badges** — right after today's refresh (by the instance that did it),
 *    badges are evaluated for active users with a row today. Best effort.
 */
@Injectable()
export class DailyStatsJobService implements OnModuleInit {
  private readonly logger = new Logger(DailyStatsJobService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stats: DailyStatsService,
    private readonly clock: TenantClockService,
    private readonly scheduler: SchedulerService,
    private readonly cache: CacheService,
    private readonly tenantAccess: TenantAccessService,
    private readonly achievements: AchievementsService,
  ) {}

  onModuleInit(): void {
    this.scheduler.register({
      name: DAILY_STATS_JOB,
      everyMs: DAILY_STATS_EVERY_MS,
      run: async () => {
        await this.runTick();
      },
    });
  }

  async runTick(now = new Date()): Promise<void> {
    const tenants = await this.prisma.tenant.findMany({
      where: {
        deletedAt: null,
        status: { in: [...ACCESSIBLE_TENANT_STATUSES] },
      },
      select: { id: true, createdAt: true },
    });

    for (const tenant of tenants) {
      try {
        // Also skips tenants whose contract lapsed.
        await this.tenantAccess.assertTenantAccessible(tenant.id);
      } catch {
        continue;
      }
      try {
        const result = await this.runTenant(tenant, now);
        if (result.finalized.length > 0 || result.backfilled > 0) {
          this.logger.log(
            `Daily stats tenant=${tenant.id} ${JSON.stringify(result)}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Daily stats failed for tenant ${tenant.id}: ${String(error)}`,
        );
      }
    }
  }

  async runTenant(
    tenant: { id: string; createdAt: Date },
    now = new Date(),
  ): Promise<TenantPassResult> {
    const timeZone = await this.clock.getTimeZone(tenant.id);
    const today = localDayOf(now, timeZone);
    const firstDay = localDayOf(tenant.createdAt, timeZone);

    // Before today's rows exist, so a brand-new table is detected.
    await this.ensureBackfillStarted(tenant.id, today, firstDay);

    const finalized: string[] = [];
    for (const pass of finalPasses(today, timeZone)) {
      if (pass.finalAt > now || pass.day < firstDay) continue;
      if (await this.finalizeDay(tenant.id, pass.day, pass.finalAt, now)) {
        finalized.push(pass.day);
      }
    }

    const todayDone = await this.refreshTenantToday(tenant.id, today, now);
    if (todayDone) {
      const badges = await this.achievements.evaluateActiveToday(
        tenant.id,
        today,
        now,
      );
      if (badges.written > 0) {
        this.logger.log(
          `Achievements tenant=${tenant.id} ${JSON.stringify(badges)}`,
        );
      }
    }
    const backfilled = await this.continueBackfill(tenant.id, now);
    return { finalized, today: todayDone, backfilled };
  }

  /** Computes `day` unless it was already computed at/after `finalAt`. */
  private async finalizeDay(
    tenantId: string,
    day: string,
    finalAt: Date,
    now: Date,
  ): Promise<boolean> {
    const last = await this.prisma.userDailyStat.aggregate({
      where: { tenantId, day: dayToDbDate(day) },
      _max: { computedAt: true },
    });
    const computedAt = last._max.computedAt;
    if (computedAt && computedAt >= finalAt) return false;

    // Held until it expires: one final pass per tenant/day, cluster-wide.
    const claim = await this.scheduler.claim(
      STATS_CLAIM_KEYS.final(tenantId, day, finalAt),
      FINAL_CLAIM_TTL_SECONDS,
    );
    if (!claim) return false;
    try {
      await this.stats.computeDay(tenantId, day, undefined, now);
    } catch (error) {
      await claim.release();
      throw error;
    }
    return true;
  }

  private async refreshTenantToday(
    tenantId: string,
    today: string,
    now: Date,
  ): Promise<boolean> {
    const claim = await this.scheduler.claim(
      STATS_CLAIM_KEYS.pass(tenantId, today),
      PASS_CLAIM_TTL_SECONDS,
    );
    if (!claim) return false;
    try {
      await this.stats.computeDay(tenantId, today, undefined, now);
    } finally {
      await claim.release();
    }
    return true;
  }

  private async ensureBackfillStarted(
    tenantId: string,
    today: string,
    firstDay: string,
  ): Promise<void> {
    const key = backfillStateKey(tenantId);
    const state = await this.cache.get<BackfillState>(key);
    if (state && !state.done) return;

    if (state?.done) {
      // "Done" lives in Redis for a year; the rows can be wiped meanwhile.
      if (!(await this.backfillWiped(tenantId, state.oldestDay))) return;
      this.logger.log(
        `Daily stats rows were wiped for ${tenantId}; backfilling again`,
      );
    } else {
      const existing = await this.prisma.userDailyStat.findFirst({
        where: { tenantId, day: { lt: dayToDbDate(today) } },
        select: { day: true },
      });
      if (existing) return;
    }

    // Yesterday and the settle day are handled by the final passes.
    const cursor = addDays(today, -2);
    const oldest = addDays(today, -BACKFILL_DAYS);
    const until = oldest > firstDay ? oldest : firstDay;
    if (cursor < until) {
      await this.markBackfillDone(tenantId);
      return;
    }
    await this.cache.set(
      key,
      { cursor, until } satisfies BackfillState,
      BACKFILL_STATE_TTL_SECONDS,
    );
    this.logger.log(`Daily stats backfill ${until}..${cursor} for ${tenantId}`);
  }

  /** True when the rows a finished backfill left behind are gone. */
  private async backfillWiped(
    tenantId: string,
    oldestDay: string | null | undefined,
  ): Promise<boolean> {
    // Flag from before `oldestDay` was recorded: re-run once to record it.
    if (oldestDay === undefined) return true;
    // Nothing was stored, so nothing can have been lost.
    if (oldestDay === null) return false;
    const kept = await this.prisma.userDailyStat.findFirst({
      where: { tenantId, day: { lte: dayToDbDate(oldestDay) } },
      select: { day: true },
    });
    return kept === null;
  }

  private async markBackfillDone(tenantId: string): Promise<void> {
    const oldest = await this.prisma.userDailyStat.findFirst({
      where: { tenantId },
      orderBy: { day: 'asc' },
      select: { day: true },
    });
    await this.cache.set(
      backfillStateKey(tenantId),
      {
        done: true,
        oldestDay: oldest ? dbDateToDay(oldest.day) : null,
      } satisfies BackfillState,
      BACKFILL_DONE_TTL_SECONDS,
    );
  }

  private async continueBackfill(tenantId: string, now: Date): Promise<number> {
    const key = backfillStateKey(tenantId);
    const pending = await this.cache.get<BackfillState>(key);
    if (!pending || pending.done) return 0;

    const claim = await this.scheduler.claim(
      STATS_CLAIM_KEYS.backfill(tenantId),
      PASS_CLAIM_TTL_SECONDS,
    );
    if (!claim) return 0;
    try {
      // Another instance may have advanced it before we got the claim.
      const state = await this.cache.get<BackfillState>(key);
      if (!state || state.done) return 0;

      let cursor = state.cursor;
      let computed = 0;
      while (computed < BACKFILL_BATCH_DAYS && cursor >= state.until) {
        await this.stats.computeDay(tenantId, cursor, undefined, now);
        cursor = addDays(cursor, -1);
        computed += 1;
      }
      if (cursor < state.until) {
        await this.markBackfillDone(tenantId);
      } else {
        await this.cache.set(
          key,
          { cursor, until: state.until } satisfies BackfillState,
          BACKFILL_STATE_TTL_SECONDS,
        );
      }
      return computed;
    } finally {
      await claim.release();
    }
  }
}

/** Past days to (re)compute and the instant from which they are final. */
export function finalPasses(
  today: string,
  timeZone: string,
): Array<{ day: string; finalAt: Date }> {
  const yesterday = addDays(today, -1);
  const settleDay = addDays(today, -3);
  return [
    { day: yesterday, finalAt: localDayBounds(yesterday, timeZone).end },
    {
      day: settleDay,
      finalAt: new Date(
        localDayBounds(settleDay, timeZone).end.getTime() + BACKDATE_WINDOW_MS,
      ),
    },
  ];
}
