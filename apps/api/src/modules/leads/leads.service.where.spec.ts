import { Test, TestingModule } from '@nestjs/testing';
import { LeadActivityService } from './services/lead-activity.service';
import { DomainEventBus } from '../../common/events/domain-event-bus.service';
import { TaskLifecycleService } from '../workflow/common/task-lifecycle.service';
import { QuotaService } from '../../common/quota/quota.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { CustomFieldsService } from '../custom-fields/custom-fields.service';
import { mergeCustomFieldValues } from '../custom-fields/custom-field-values';
import { LeadsService } from './leads.service';

describe('LeadsService.buildLeadsWhereInput', () => {
  let service: LeadsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        {
          provide: CustomFieldsService,
          useValue: {
            getLeadDefinitions: jest.fn().mockResolvedValue([]),
            resolveLeadValues: mergeCustomFieldValues,
          },
        },
        { provide: PrismaService, useValue: {} },
        { provide: LeadActivityService, useValue: {} },
        { provide: DomainEventBus, useValue: { publish: jest.fn() } },
        {
          provide: TaskLifecycleService,
          useValue: { cancelOpenTasks: jest.fn().mockResolvedValue(0) },
        },
        { provide: QuotaService, useValue: {} },
      ],
    }).compile();

    service = module.get(LeadsService);
  });

  it('keeps both the stale and the search conditions when combined', () => {
    const where = service.buildLeadsWhereInput('tenant-1', {
      staleOnly: true,
      search: 'ahmed',
    });

    expect(where.OR).toBeUndefined();
    expect(where.AND).toHaveLength(2);
    const [stale, search] = where.AND as Array<Record<string, unknown>>;
    expect(stale.OR).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ lastContactedAt: null }),
      ]),
    );
    expect(search.OR).toEqual(
      expect.arrayContaining([
        { fullName: { contains: 'ahmed', mode: 'insensitive' } },
      ]),
    );
  });

  it('matches phone searches against normalized columns', () => {
    const where = service.buildLeadsWhereInput('tenant-1', {
      search: '0100 123',
    });

    expect(where.OR).toEqual(
      expect.arrayContaining([
        { primaryPhoneNormalized: { contains: '100123' } },
        { secondaryPhoneNormalized: { contains: '100123' } },
      ]),
    );
  });
});

describe('LeadsService.buildLeadsWhereInput — manager filters', () => {
  let service: LeadsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        {
          provide: CustomFieldsService,
          useValue: {
            getLeadDefinitions: jest.fn().mockResolvedValue([]),
            resolveLeadValues: mergeCustomFieldValues,
          },
        },
        { provide: PrismaService, useValue: {} },
        { provide: LeadActivityService, useValue: {} },
        { provide: DomainEventBus, useValue: { publish: jest.fn() } },
        {
          provide: TaskLifecycleService,
          useValue: { cancelOpenTasks: jest.fn().mockResolvedValue(0) },
        },
        { provide: QuotaService, useValue: {} },
      ],
    }).compile();
    service = module.get(LeadsService);
  });

  it('matches owners and unassigned leads together', () => {
    const where = service.buildLeadsWhereInput('t', {
      assignees: ['11111111-1111-4111-8111-111111111111', 'unassigned'],
    });
    expect(where.OR).toEqual([
      { assignedUserId: { in: ['11111111-1111-4111-8111-111111111111'] } },
      { assignedUserId: null },
    ]);
  });

  it('keeps several OR-filters intact by AND-ing them', () => {
    const where = service.buildLeadsWhereInput('t', {
      assignees: ['unassigned', '11111111-1111-4111-8111-111111111111'],
      lastContact: 'over_7d',
      search: 'ahmed',
    });
    expect(where.AND).toHaveLength(3);
  });

  it('finds open leads without a next step', () => {
    const where = service.buildLeadsWhereInput('t', { nextStep: 'none' });
    expect(where).toMatchObject({
      status: 'OPEN',
      pipelineStage: { isClosed: false },
      nextTaskDueAt: null,
    });
  });

  it('uses the tenant day for "due today"', () => {
    const bounds = {
      start: new Date('2026-11-16T22:00:00Z'),
      end: new Date('2026-11-17T22:00:00Z'),
    };
    const where = service.buildLeadsWhereInput('t', {
      nextStep: 'today',
      todayBounds: bounds,
    });
    expect(where.nextTaskDueAt).toEqual({ gte: bounds.start, lt: bounds.end });
  });

  it('combines project and interest level on the same interest row', () => {
    const where = service.buildLeadsWhereInput('t', {
      projectId: '22222222-2222-4222-8222-222222222222',
      interestLevel: 'HOT',
    });
    expect(where.leadProjectInterests).toEqual({
      some: {
        projectId: '22222222-2222-4222-8222-222222222222',
        interestLevel: 'HOT',
      },
    });
  });

  it('filters heat, stages, sources and unanswered streak', () => {
    const where = service.buildLeadsWhereInput('t', {
      heat: ['HOT', 'WARM'],
      stageIds: ['a'],
      sourceIds: ['b'],
      unansweredMin: 3,
    });
    expect(where).toMatchObject({
      heat: { in: ['HOT', 'WARM'] },
      pipelineStageId: { in: ['a'] },
      sourceId: { in: ['b'] },
      unansweredStreak: { gte: 3 },
    });
  });

  describe('dashboard "needs attention" filters', () => {
    const DAY = 86_400_000;

    beforeEach(() => {
      jest.useFakeTimers({ now: new Date('2026-11-18T10:00:00.000Z') });
    });
    afterEach(() => {
      jest.useRealTimers();
    });

    it('finds SLA breaches of the tenant day', () => {
      const bounds = {
        start: new Date('2026-11-17T22:00:00Z'),
        end: new Date('2026-11-18T22:00:00Z'),
      };
      const where = service.buildLeadsWhereInput('t', {
        slaBreached: 'today',
        todayBounds: bounds,
      });
      expect(where.slaBreachedAt).toEqual({
        gte: bounds.start,
        lt: bounds.end,
      });
    });

    it('uses each stage’s stuck threshold on stageEnteredAt', () => {
      const where = service.buildLeadsWhereInput('t', {
        stuck: true,
        stageThresholds: {
          stuck: [{ id: 'neg', days: 21 }],
          stale: [],
        },
      });
      expect(where).toMatchObject({
        status: 'OPEN',
        pipelineStage: { isClosed: false },
        OR: [
          {
            pipelineStageId: 'neg',
            stageEnteredAt: { lt: new Date(Date.now() - 21 * DAY) },
          },
        ],
      });
    });

    it('matches nothing when no stage has the rule on', () => {
      const where = service.buildLeadsWhereInput('t', {
        stageStale: true,
      });
      expect(where.id).toEqual({ in: [] });
    });

    it('uses each stage’s stale threshold on the last contact', () => {
      const where = service.buildLeadsWhereInput('t', {
        stageStale: true,
        stageThresholds: { stuck: [], stale: [{ id: 'new', days: 3 }] },
      });
      const cutoff = new Date(Date.now() - 3 * DAY);
      expect(where.OR).toEqual([
        {
          pipelineStageId: 'new',
          OR: [
            { lastContactedAt: { lt: cutoff } },
            { lastContactedAt: null, createdAt: { lt: cutoff } },
          ],
        },
      ]);
    });

    it('finds assigned leads without a next step', () => {
      const where = service.buildLeadsWhereInput('t', {
        nextStep: 'none',
        assignedOnly: true,
      });
      expect(where.AND).toEqual(
        expect.arrayContaining([
          { assignedUserId: { not: null } },
          expect.objectContaining({ nextTaskDueAt: null }),
        ]),
      );
    });

    it('treats "over 2 days" as 48 hours without contact (or never)', () => {
      const where = service.buildLeadsWhereInput('t', {
        lastContact: 'over_2d',
        heat: ['HOT'],
        openOnly: true,
      });
      expect(where.AND).toEqual(
        expect.arrayContaining([
          {
            OR: [
              { lastContactedAt: { lt: new Date(Date.now() - 2 * DAY) } },
              { lastContactedAt: null },
            ],
          },
        ]),
      );
    });
  });
});
