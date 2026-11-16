/**
 * Demo CRM dataset for the prime-estates tenant.
 *
 * Generates a believable eight-month history so every dashboard widget has
 * something to say: steady growth with a weekly rhythm and ad-campaign
 * spikes, sources that differ in volume *and* quality, agents that differ in
 * speed and win rate, full stage journeys (with STAGE_CHANGED activities the
 * trend and closing-time queries read), stale and unassigned leads, and
 * project interest that follows real Egyptian price bands.
 *
 * Everything is relative to "now" so the 7/30/90-day windows are always full,
 * and seeded through faker so a run is reproducible for a given day.
 */
import { faker } from '@faker-js/faker';
import {
  InterestLevel,
  LeadActivityEventType,
  LeadStatus,
  PipelineCloseType,
  Prisma,
  type PrismaClient,
} from '@prisma/client';
import { normalizePhone } from '@crmpro/shared/leads';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
/** Egypt is UTC+2 outside summer time; close enough for working hours. */
const CAIRO_OFFSET_HOURS = 2;

export const DEMO_HISTORY_DAYS = 240;

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export interface DemoAgentProfile {
  userId: string;
  /** Relative share of new leads routed to this person. */
  capacity: number;
  /** Multiplier on the base win probability. */
  skill: number;
  /** Typical hours from lead creation to the agent's first call/WhatsApp. */
  responseHours: number;
  /** Leads created before this many days ago are never routed to them. */
  joinedDaysAgo?: number;
}

export interface DemoSourceProfile {
  name: string;
  /** Share of lead volume. */
  volume: number;
  /** Multiplier on the base win probability. */
  quality: number;
  /** Optional campaign bursts: [startDaysAgo, endDaysAgo, multiplier]. */
  campaigns?: ReadonlyArray<readonly [number, number, number]>;
}

export interface DemoProjectProfile {
  id: string;
  name: string;
  popularity: number;
  /** Typical unit price band in EGP. */
  priceMin: number;
  priceMax: number;
  units: readonly string[];
}

export interface DemoStage {
  id: string;
  name: string;
  isClosed: boolean;
  closeType: PipelineCloseType | null;
}

export interface DemoPipelineInput {
  pipelineId: string;
  /** Ordered stages: open stages first, then the WON and LOST stages. */
  stages: DemoStage[];
  /** Approximate lead count to generate. */
  targetLeads: number;
  historyDays: number;
}

export interface DemoDatasetInput {
  tenantId: string;
  ownerId: string;
  managerIds: string[];
  agents: DemoAgentProfile[];
  sources: Array<DemoSourceProfile & { id: string }>;
  projects: DemoProjectProfile[];
  pipelines: DemoPipelineInput[];
}

export interface DemoLeadSummary {
  id: string;
  fullName: string;
  assignedUserId: string | null;
  createdAt: Date;
  outcome: 'WON' | 'LOST' | 'OPEN';
  closedAt: Date | null;
  stageName: string;
}

// ---------------------------------------------------------------------------
// Static vocabulary
// ---------------------------------------------------------------------------

const MALE_FIRST = [
  'Ahmed', 'Mohamed', 'Mahmoud', 'Mostafa', 'Omar', 'Youssef', 'Karim',
  'Hassan', 'Ali', 'Amr', 'Tarek', 'Sherif', 'Hossam', 'Khaled', 'Islam',
  'Ibrahim', 'Waleed', 'Hany', 'Ayman', 'Sameh', 'Ziad', 'Adham', 'Marwan',
  'Seif', 'Bassem', 'Ehab', 'Ramy', 'Fady', 'Mina', 'Kirollos', 'Hesham',
  'Nader', 'Yasser', 'Wael', 'Essam', 'Moataz', 'Abdelrahman', 'Belal',
] as const;

const FEMALE_FIRST = [
  'Nour', 'Mariam', 'Salma', 'Yasmin', 'Hana', 'Farida', 'Malak', 'Rana',
  'Dina', 'Heba', 'Aya', 'Mona', 'Reem', 'Nada', 'Sara', 'Habiba', 'Laila',
  'Rania', 'Ghada', 'Noha', 'Shereen', 'Marwa', 'Engy', 'Nesma', 'Mai',
  'Doaa', 'Basma', 'Jana', 'Lobna', 'Christine', 'Marina', 'Nermeen',
] as const;

const FAMILY = [
  'Hassan', 'Mohamed', 'Ali', 'Ibrahim', 'Mahmoud', 'Mostafa', 'Abdelaziz',
  'El-Sayed', 'Fathy', 'Kamal', 'Saleh', 'Farouk', 'Mansour', 'Shawky',
  'Abdelfattah', 'Ramadan', 'Soliman', 'Zaki', 'Hamdy', 'Gamal', 'Nabil',
  'Lotfy', 'Fawzy', 'Ezzat', 'Helmy', 'Sabry', 'Adel', 'Samir', 'Tawfik',
  'Hegazy', 'El-Masry', 'Naguib', 'Wahba', 'Girgis', 'Rizk', 'Morsy',
  'Badawy', 'Shalaby', 'Osman', 'Yehia', 'Khalil', 'Sharaf',
] as const;

const EMAIL_DOMAINS = [
  'gmail.com', 'gmail.com', 'gmail.com', 'yahoo.com', 'hotmail.com',
  'outlook.com', 'icloud.com',
] as const;

const PURPOSES = ['Living', 'Investment', 'Summer home', 'Resale'] as const;
const PAYMENT = ['Installments', 'Installments', 'Cash', 'Cash + installments'] as const;

const FIRST_TOUCH_NOTES = [
  'Called — interested in {unit} at {project}. Wants a brochure on WhatsApp.',
  'Sent price list for {project} on WhatsApp. Will review with family.',
  'Asked about delivery dates and maintenance fees at {project}.',
  'Prefers ground floor with garden. Budget around {budget}.',
  'Currently renting in Nasr City, looking to move within a year.',
  'Comparing {project} with another compound. Price is the main concern.',
  'Works abroad (KSA). Prefers calls after 8 PM Cairo time.',
  'Asked for 10% down payment options over 8 years.',
] as const;

const PROGRESS_NOTES = [
  'Site visit booked for Saturday at {project} sales center.',
  'Visited {project} with spouse — liked the club house and phase 2 units.',
  'Sent payment plan: {plan}. Waiting for feedback.',
  'Asked for a discount on cash payment. Escalated to manager.',
  'Shortlisted two units in {project}. Wants to see finishing samples.',
  'Will decide after selling current apartment.',
  'Requested comparison sheet between {project} and nearby launches.',
  'Follow-up call: still interested, waiting on bank transfer timing.',
] as const;

const WON_NOTES = [
  'Reservation paid for {unit} at {project}. Contract signing next week.',
  'Signed contract — {unit}, {plan}. Commission request sent.',
  'Deal closed at {project}. Client asked about referral bonus.',
] as const;

const LOST_REASONS = [
  'Lost — budget too low for current prices.',
  'Lost — bought through another broker.',
  'Lost — decided to postpone for a year.',
  'Lost — not reachable after 5 attempts.',
  'Lost — chose a resale unit instead.',
  'Lost — wanted delivery within 12 months.',
  'Lost — fake/duplicate lead from ads.',
] as const;

const PLANS = [
  '10% down, 8 years',
  '5% down, 10 years',
  '15% down, 6 years',
  '20% down, 7 years',
  'cash with 25% discount',
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function weightedPick<T>(items: readonly T[], weight: (item: T) => number): T {
  const weights = items.map((i) => Math.max(0, weight(i)));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = faker.number.float({ min: 0, max: total });
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

/** Log-normal-ish delay around a median, in ms. */
function delayAround(medianHours: number, spread = 0.9): number {
  const z =
    Math.sqrt(-2 * Math.log(faker.number.float({ min: 1e-6, max: 1 }))) *
    Math.cos(2 * Math.PI * faker.number.float({ min: 0, max: 1 }));
  return Math.max(0.05, medianHours * Math.exp(z * spread)) * HOUR;
}

/** Push a timestamp into Cairo working hours (10:00–21:00). */
function intoWorkingHours(t: number): number {
  const d = new Date(t);
  const cairoHour = (d.getUTCHours() + CAIRO_OFFSET_HOURS) % 24;
  if (cairoHour >= 10 && cairoHour < 21) return t;
  const next = new Date(t);
  if (cairoHour >= 21) next.setUTCDate(next.getUTCDate() + 1);
  next.setUTCHours(10 - CAIRO_OFFSET_HOURS, faker.number.int({ min: 0, max: 59 }), 0, 0);
  return next.getTime() + faker.number.int({ min: 0, max: 90 }) * 60_000;
}

function fillTemplate(
  template: string,
  ctx: { project: string; unit: string; budget: string; plan: string },
): string {
  return template
    .replaceAll('{project}', ctx.project)
    .replaceAll('{unit}', ctx.unit)
    .replaceAll('{budget}', ctx.budget)
    .replaceAll('{plan}', ctx.plan);
}

function formatEgp(value: number): string {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}M EGP`;
  }
  return `${Math.round(value / 1000)}K EGP`;
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

function egyptMobile(): { raw: string; normalized: string } {
  const prefix = faker.helpers.arrayElement(['010', '011', '012', '015']);
  const raw = `${prefix}${faker.string.numeric(8)}`;
  return { raw, normalized: normalizePhone(raw) };
}

function personName(): { first: string; last: string; full: string } {
  const female = faker.datatype.boolean({ probability: 0.42 });
  const first = faker.helpers.arrayElement(female ? FEMALE_FIRST : MALE_FIRST);
  const father = faker.helpers.arrayElement(MALE_FIRST);
  const last = faker.helpers.arrayElement(FAMILY);
  const full = faker.datatype.boolean({ probability: 0.55 })
    ? `${first} ${father} ${last}`
    : `${first} ${last}`;
  return { first, last, full };
}

/** Daily lead-volume multiplier: growth, weekly rhythm and holidays. */
function dayFactor(daysAgo: number, historyDays: number, date: Date): number {
  // ~2.6x more leads today than at the start of the history.
  const growth = 0.55 + 0.9 * (1 - daysAgo / historyDays) ** 1.4;
  const weekday = date.getUTCDay(); // 5 = Friday, 6 = Saturday
  const weekly = weekday === 5 ? 0.45 : weekday === 6 ? 0.8 : weekday === 0 ? 1.15 : 1;
  return growth * weekly;
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

export async function seedDemoDataset(
  prisma: PrismaClient,
  input: DemoDatasetInput,
): Promise<DemoLeadSummary[]> {
  const now = Date.now();
  const leads: Prisma.LeadCreateManyInput[] = [];
  const activities: Prisma.LeadActivityCreateManyInput[] = [];
  const notes: Prisma.LeadNoteCreateManyInput[] = [];
  const interests: Prisma.LeadProjectInterestCreateManyInput[] = [];
  const summaries: DemoLeadSummary[] = [];
  const usedPhones = new Set<string>();

  const assigners = [...input.managerIds, input.ownerId];

  for (const pipeline of input.pipelines) {
    const openStages = pipeline.stages.filter((s) => !s.isClosed);
    const wonStage = pipeline.stages.find((s) => s.closeType === PipelineCloseType.WON)!;
    const lostStage = pipeline.stages.find((s) => s.closeType === PipelineCloseType.LOST)!;

    // Spread the target over the history using the day factors.
    const days = Array.from({ length: pipeline.historyDays + 1 }, (_, i) => {
      const daysAgo = pipeline.historyDays - i;
      const date = new Date(now - daysAgo * DAY);
      return { daysAgo, date, factor: dayFactor(daysAgo, pipeline.historyDays, date) };
    });
    const factorSum = days.reduce((a, d) => a + d.factor, 0);
    const perUnit = pipeline.targetLeads / factorSum;
    const totalVolume = input.sources.reduce((a, s) => a + s.volume, 0);

    for (const day of days) {
      // Campaign bursts add leads from a specific source on top.
      const campaignExtra = input.sources.reduce((acc, s) => {
        const burst = s.campaigns?.find(
          ([from, to]) => day.daysAgo <= from && day.daysAgo >= to,
        );
        const share = s.volume / totalVolume;
        return acc + (burst ? (burst[2] - 1) * share * day.factor * perUnit : 0);
      }, 0);
      const expected = day.factor * perUnit + campaignExtra;
      const count =
        Math.floor(expected) +
        (faker.number.float({ min: 0, max: 1 }) < expected % 1 ? 1 : 0);

      for (let n = 0; n < count; n++) {
        // Time of day: Cairo 09:00–24:00, heavier in the evening.
        const cairoHour = weightedPick(
          Array.from({ length: 15 }, (_, i) => i + 9),
          (h) => (h >= 19 && h <= 23 ? 2.2 : h >= 12 && h <= 16 ? 1.3 : 0.8),
        );
        const created = new Date(day.date);
        created.setUTCHours(
          (cairoHour - CAIRO_OFFSET_HOURS + 24) % 24,
          faker.number.int({ min: 0, max: 59 }),
          faker.number.int({ min: 0, max: 59 }),
          0,
        );
        let createdAt = created.getTime();
        if (createdAt > now - 10 * 60_000) {
          createdAt = now - faker.number.int({ min: 10, max: 600 }) * 60_000;
        }
        const ageDays = (now - createdAt) / DAY;

        const source = weightedPick(input.sources, (s) => {
          const burst = s.campaigns?.find(
            ([from, to]) => day.daysAgo <= from && day.daysAgo >= to,
          );
          return s.volume * (burst ? burst[2] : 1);
        });

        // Routing: unassigned mostly among the newest leads.
        const eligible = input.agents.filter(
          (a) => a.joinedDaysAgo === undefined || ageDays <= a.joinedDaysAgo,
        );
        const unassigned =
          ageDays < 4
            ? faker.datatype.boolean({ probability: 0.3 })
            : faker.datatype.boolean({ probability: 0.02 });
        const agent = unassigned ? null : weightedPick(eligible, (a) => a.capacity);

        // Project interest and budget.
        const interestCount = weightedPick([0, 1, 1, 1, 2, 2, 3], () => 1);
        const pickedProjects: DemoProjectProfile[] = [];
        for (let k = 0; k < interestCount; k++) {
          const p = weightedPick(input.projects, (x) =>
            pickedProjects.includes(x) ? 0 : x.popularity,
          );
          if (!pickedProjects.includes(p)) pickedProjects.push(p);
        }
        const mainProject = pickedProjects[0] ?? weightedPick(input.projects, (x) => x.popularity);
        const unit = faker.helpers.arrayElement(mainProject.units);
        const price = roundTo(
          faker.number.int({ min: mainProject.priceMin, max: mainProject.priceMax }),
          50_000,
        );

        // Outcome.
        const closeChance = Math.min(0.95, ageDays / 40);
        const isClosed = ageDays > 2 && faker.number.float({ min: 0, max: 1 }) < closeChance;
        const winChance = Math.min(
          0.72,
          0.26 * source.quality * (agent?.skill ?? 0.5) * (pickedProjects.length ? 1.1 : 0.7),
        );
        const outcome: DemoLeadSummary['outcome'] = !isClosed
          ? 'OPEN'
          : faker.number.float({ min: 0, max: 1 }) < winChance && ageDays > 7
            ? 'WON'
            : 'LOST';

        // Which stages the lead walks through.
        let path: DemoStage[];
        if (outcome === 'WON') {
          path = [...openStages, wonStage];
        } else if (outcome === 'LOST') {
          const reached = weightedPick(
            openStages.map((_, i) => i),
            (i) => [5, 4, 3, 2, 1.5][i] ?? 1,
          );
          path = [...openStages.slice(0, reached + 1), lostStage];
        } else {
          const maxIdx = Math.min(openStages.length - 1, Math.floor(ageDays / 6));
          const reached = weightedPick(
            openStages.slice(0, maxIdx + 1).map((_, i) => i),
            (i) =>
              i === 0
                ? ageDays < 3 ? 6 : ageDays < 10 ? 1.2 : 0.15
                : 2.2 - i * 0.25,
          );
          path = openStages.slice(0, reached + 1);
        }
        const finalStage = path[path.length - 1];

        const leadId = faker.string.uuid();
        const person = personName();
        let phone = egyptMobile();
        while (usedPhones.has(phone.normalized)) phone = egyptMobile();
        usedPhones.add(phone.normalized);
        const secondary = faker.datatype.boolean({ probability: 0.18 }) ? egyptMobile() : null;
        const email = faker.datatype.boolean({ probability: 0.55 })
          ? `${person.first}.${person.last}${faker.number.int({ min: 1, max: 99 })}@${faker.helpers.arrayElement(EMAIL_DOMAINS)}`
              .toLowerCase()
              .replace(/[^a-z0-9.@-]/g, '')
          : null;

        const ctx = {
          project: mainProject.name,
          unit,
          budget: formatEgp(price),
          plan: faker.helpers.arrayElement(PLANS),
        };

        // ---- timeline ----
        const push = (
          eventType: LeadActivityEventType,
          at: number,
          actorUserId: string | null,
          metadata: Prisma.InputJsonValue = {},
        ) => {
          activities.push({
            tenantId: input.tenantId,
            leadId,
            actorUserId,
            eventType,
            metadata,
            createdAt: new Date(Math.min(at, now - 60_000)),
          });
        };
        const addNote = (authorId: string, content: string, at: number) => {
          const noteId = faker.string.uuid();
          const createdNoteAt = new Date(Math.min(at, now - 60_000));
          notes.push({
            id: noteId,
            tenantId: input.tenantId,
            leadId,
            authorId,
            content,
            createdAt: createdNoteAt,
          });
          push(LeadActivityEventType.NOTE_ADDED, createdNoteAt.getTime(), authorId, { noteId });
        };

        push(LeadActivityEventType.LEAD_CREATED, createdAt, null, {
          source: source.name,
        });

        let cursor = createdAt;
        let lastTouch: number | null = null;
        const actor = agent?.userId ?? null;

        if (agent) {
          const assigner = faker.helpers.arrayElement(assigners);
          cursor = intoWorkingHours(createdAt + delayAround(0.4, 1.1));
          push(LeadActivityEventType.ASSIGNED, cursor, assigner, { toUserId: agent.userId });

          // First touch by the agent — their speed shows in response time.
          const touchAt = createdAt + delayAround(agent.responseHours, 0.8);
          if (touchAt < now) {
            cursor = Math.max(cursor, touchAt);
            push(
              faker.helpers.arrayElement([
                LeadActivityEventType.CALL_LOGGED,
                LeadActivityEventType.CALL_LOGGED,
                LeadActivityEventType.WHATSAPP_LOGGED,
              ]),
              cursor,
              agent.userId,
              { durationMinutes: faker.number.int({ min: 1, max: 18 }) },
            );
            lastTouch = cursor;
            if (faker.datatype.boolean({ probability: 0.6 })) {
              addNote(
                agent.userId,
                fillTemplate(faker.helpers.arrayElement(FIRST_TOUCH_NOTES), ctx),
                cursor + 5 * 60_000,
              );
            }
          }
        }

        // Project links shortly after the first touch.
        pickedProjects.forEach((p, idx) => {
          const level =
            outcome === 'WON' && idx === 0
              ? InterestLevel.HOT
              : weightedPick(
                  [InterestLevel.LOW, InterestLevel.MEDIUM, InterestLevel.HIGH, InterestLevel.HOT],
                  (lvl) => {
                    const depth = path.length;
                    if (lvl === InterestLevel.HOT) return depth >= 4 ? 3 : 0.5;
                    if (lvl === InterestLevel.HIGH) return depth >= 3 ? 3 : 1;
                    if (lvl === InterestLevel.MEDIUM) return 2.5;
                    return depth <= 2 ? 2.5 : 0.8;
                  },
                );
          const at = Math.min(now - 60_000, cursor + delayAround(2, 1));
          interests.push({
            leadId,
            projectId: p.id,
            interestLevel: level,
            createdAt: new Date(at),
          });
          push(LeadActivityEventType.PROJECT_LINKED, at, actor, { projectId: p.id });
        });

        // Stage journey. Closed leads finish at closeAt; open ones stop
        // somewhere before now (and some go quiet → stale).
        const goesStale =
          outcome === 'OPEN' && ageDays > 9 && faker.datatype.boolean({ probability: 0.22 });
        const closeAt =
          outcome === 'WON'
            ? createdAt + Math.min(ageDays * 0.92, faker.number.float({ min: 9, max: 62 })) * DAY
            : outcome === 'LOST'
              ? createdAt + Math.min(ageDays * 0.92, faker.number.float({ min: 1.5, max: 38 })) * DAY
              : goesStale
                ? createdAt + (ageDays - faker.number.float({ min: 8, max: Math.max(8.5, ageDays - 1) })) * DAY
                : now - faker.number.float({ min: 0, max: Math.min(5, ageDays * 0.8) }) * DAY;
        const journeyEnd = Math.max(cursor + HOUR, Math.min(closeAt, now - 60_000));
        const transitions = path.length - 1;

        for (let s = 1; s <= transitions; s++) {
          const from = path[s - 1];
          const to = path[s];
          const at =
            s === transitions && to.isClosed
              ? journeyEnd
              : intoWorkingHours(cursor + ((journeyEnd - cursor) * s) / (transitions + 1) * faker.number.float({ min: 0.7, max: 1.1 }));
          const ts = Math.max(cursor + 10 * 60_000, Math.min(at, journeyEnd));
          cursor = ts;
          push(LeadActivityEventType.STAGE_CHANGED, ts, actor ?? faker.helpers.arrayElement(assigners), {
            fromStageId: from.id,
            fromStageName: from.name,
            toStageId: to.id,
            toStageName: to.name,
            isClosedTransition: to.isClosed,
            closeType: to.closeType,
          });

          if (actor && !to.isClosed) {
            // A touch or two between stages.
            const touches = faker.number.int({ min: 0, max: 2 });
            for (let t = 0; t < touches; t++) {
              const tAt = ts + delayAround(20, 0.7);
              if (tAt >= journeyEnd) break;
              push(
                faker.helpers.arrayElement([
                  LeadActivityEventType.CALL_LOGGED,
                  LeadActivityEventType.WHATSAPP_LOGGED,
                  LeadActivityEventType.WHATSAPP_LOGGED,
                  LeadActivityEventType.EMAIL_LOGGED,
                ]),
                tAt,
                actor,
                { durationMinutes: faker.number.int({ min: 2, max: 35 }) },
              );
              lastTouch = Math.max(lastTouch ?? 0, tAt);
            }
            if (s >= 2 && faker.datatype.boolean({ probability: 0.55 })) {
              addNote(actor, fillTemplate(faker.helpers.arrayElement(PROGRESS_NOTES), ctx), ts + 30 * 60_000);
            }
          }
          lastTouch = Math.max(lastTouch ?? 0, ts);
        }

        if (actor && outcome === 'WON') {
          addNote(actor, fillTemplate(faker.helpers.arrayElement(WON_NOTES), ctx), journeyEnd + 20 * 60_000);
        }
        if (actor && outcome === 'LOST') {
          addNote(actor, faker.helpers.arrayElement(LOST_REASONS), journeyEnd + 10 * 60_000);
        }

        // Open, still-active leads get a recent touch.
        if (actor && outcome === 'OPEN' && !goesStale && ageDays > 1) {
          const recent = now - faker.number.float({ min: 0.1, max: Math.min(6, ageDays) }) * DAY;
          if (recent > (lastTouch ?? 0)) {
            push(LeadActivityEventType.CALL_LOGGED, recent, actor, {
              durationMinutes: faker.number.int({ min: 2, max: 20 }),
            });
            lastTouch = recent;
          }
        }

        const archived = outcome === 'LOST' && faker.datatype.boolean({ probability: 0.12 });
        if (archived) {
          push(LeadActivityEventType.STATUS_ARCHIVED, journeyEnd + DAY, input.managerIds[0] ?? input.ownerId);
        }

        const budgetSpread = faker.number.float({ min: 0.75, max: 0.92 });
        leads.push({
          id: leadId,
          tenantId: input.tenantId,
          sourceId: source.id,
          pipelineId: pipeline.pipelineId,
          pipelineStageId: finalStage.id,
          assignedUserId: agent?.userId ?? null,
          status: archived ? LeadStatus.ARCHIVED : LeadStatus.OPEN,
          fullName: person.full,
          primaryPhone: phone.raw,
          primaryPhoneNormalized: phone.normalized,
          secondaryPhone: secondary?.raw,
          secondaryPhoneNormalized: secondary?.normalized,
          email,
          budgetMin: faker.datatype.boolean({ probability: 0.8 })
            ? new Prisma.Decimal(roundTo(price * budgetSpread, 50_000))
            : null,
          budgetMax: new Prisma.Decimal(roundTo(price * faker.number.float({ min: 1, max: 1.25 }), 50_000)),
          notesSummary: faker.datatype.boolean({ probability: 0.35 })
            ? `${unit} in ${mainProject.name}, ${ctx.plan}.`
            : null,
          customFields: {
            preferredUnit: unit,
            purpose: faker.helpers.arrayElement(PURPOSES),
            paymentPreference: faker.helpers.arrayElement(PAYMENT),
          },
          lastContactedAt: lastTouch ? new Date(lastTouch) : null,
          createdAt: new Date(createdAt),
          updatedAt: new Date(Math.max(createdAt, lastTouch ?? createdAt)),
        });

        summaries.push({
          id: leadId,
          fullName: person.full,
          assignedUserId: agent?.userId ?? null,
          createdAt: new Date(createdAt),
          outcome,
          closedAt: outcome === 'OPEN' ? null : new Date(journeyEnd),
          stageName: finalStage.name,
        });
      }
    }
  }

  for (const batch of chunk(leads, 500)) await prisma.lead.createMany({ data: batch });
  for (const batch of chunk(interests, 1000)) {
    await prisma.leadProjectInterest.createMany({ data: batch });
  }
  for (const batch of chunk(notes, 1000)) await prisma.leadNote.createMany({ data: batch });
  for (const batch of chunk(activities, 2000)) {
    await prisma.leadActivity.createMany({ data: batch });
  }

  return summaries;
}
