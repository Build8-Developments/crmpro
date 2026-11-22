import { WorkflowRulesService } from '../rules/workflow-rules.service';
import { SYSTEM_LEAD_SCOPE } from '../../../common/auth';
import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DomainEventBus } from '../../../common/events/domain-event-bus.service';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { LeadActivityService } from '../../leads/services/lead-activity.service';
import { FilesService } from '../../files/files.service';
import { TaskLifecycleService } from '../common/task-lifecycle.service';
import { InteractionsService } from './interactions.service';

const user = {
  id: 'agent-1',
  tenantId: 'tenant-1',
  roleId: 'role-1',
  sessionId: 's-1',
};

function makeLead(overrides: Record<string, unknown> = {}) {
  return {
    id: 'lead-1',
    status: 'OPEN',
    assignedUserId: 'agent-1',
    firstContactedAt: null,
    lastContactedAt: null,
    unansweredStreak: 0,
    pipelineStage: { isClosed: false },
    leadProjectInterests: [],
    ...overrides,
  };
}

const rules = { afterNextStepScheduled: jest.fn() };

describe('InteractionsService.log', () => {
  let service: InteractionsService;
  let tx: {
    interaction: { create: jest.Mock };
    fileAsset: { updateMany: jest.Mock };
    task: { findMany: jest.Mock; updateMany: jest.Mock; create: jest.Mock };
    lead: { update: jest.Mock };
  };
  let prisma: {
    lead: { findFirst: jest.Mock; findFirstOrThrow: jest.Mock };
    interaction: { findUniqueOrThrow: jest.Mock };
    project: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };
  let lifecycle: { refreshNextTaskDueAt: jest.Mock };
  let activity: { createActivity: jest.Mock };
  let files: { completeUpload: jest.Mock };

  beforeEach(async () => {
    tx = {
      interaction: { create: jest.fn().mockResolvedValue({ id: 'int-1' }) },
      fileAsset: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      task: {
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 0 }),
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'task-new',
            leadId: data.leadId,
            type: data.type,
            title: data.title,
            dueAt: data.dueAt,
            isAllDay: false,
            priority: data.priority,
            origin: data.origin,
            ruleKey: null,
            status: 'OPEN',
            completedAt: null,
            skipReason: null,
            snoozeCount: 0,
            createdAt: new Date(),
            assignee: { id: data.assigneeId, name: 'Agent' },
            createdBy: null,
            lead: null,
          }),
        ),
      },
      lead: { update: jest.fn().mockResolvedValue({}) },
    };
    prisma = {
      lead: {
        findFirst: jest.fn().mockResolvedValue(makeLead()),
        findFirstOrThrow: jest.fn().mockResolvedValue({
          id: 'lead-1',
          primaryPhone: '01012345678',
          secondaryPhone: null,
          email: null,
          pipelineStage: {
            id: 's',
            name: 'New',
            color: null,
            isClosed: false,
            closeType: null,
          },
          leadProjectInterests: [],
          source: null,
          pipeline: { id: 'p', name: 'P' },
          assignedUser: null,
          lostReason: null,
        }),
      },
      interaction: {
        findUniqueOrThrow: jest
          .fn()
          .mockResolvedValue({ id: 'int-1', evidence: [] }),
      },
      project: { findFirst: jest.fn() },
      $transaction: jest.fn((fn: (client: typeof tx) => unknown) => fn(tx)),
    };
    lifecycle = { refreshNextTaskDueAt: jest.fn().mockResolvedValue(null) };
    activity = { createActivity: jest.fn().mockResolvedValue({}) };
    files = {
      completeUpload: jest.fn().mockImplementation((_t, _u, input) =>
        Promise.resolve({
          id: `file-${input.objectKey}`,
          originalFilename: `${input.objectKey}.pdf`,
        }),
      ),
    };

    const module = await Test.createTestingModule({
      providers: [
        InteractionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: TaskLifecycleService, useValue: lifecycle },
        { provide: LeadActivityService, useValue: activity },
        { provide: DomainEventBus, useValue: { publish: jest.fn() } },
        { provide: FilesService, useValue: files },
        { provide: WorkflowRulesService, useValue: rules },
      ],
    }).compile();
    service = module.get(InteractionsService);
  });

  const inTwoHours = () => new Date(Date.now() + 2 * 60 * 60 * 1000);

  it('requires a next step on an open lead', async () => {
    await expect(
      service.log(
        user,
        'lead-1',
        {
          channel: 'CALL',
          outcome: 'ANSWERED_INTERESTED',
        },
        SYSTEM_LEAD_SCOPE,
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'NEXT_STEP_REQUIRED' }),
    });
  });

  it('does not require a next step when the outcome closes the lead', async () => {
    await service.log(
      user,
      'lead-1',
      {
        channel: 'CALL',
        outcome: 'WRONG_NUMBER',
      },
      SYSTEM_LEAD_SCOPE,
    );
    expect(tx.task.create).not.toHaveBeenCalled();
  });

  it('rejects outcomes that do not fit the channel', async () => {
    await expect(
      service.log(
        user,
        'lead-1',
        {
          channel: 'SITE_VISIT',
          outcome: 'BUSY',
          nextStep: { type: 'CALL', dueAt: inTwoHours() },
        },
        SYSTEM_LEAD_SCOPE,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('counts unanswered attempts and stamps the first contact', async () => {
    prisma.lead.findFirst.mockResolvedValue(makeLead({ unansweredStreak: 2 }));

    await service.log(
      user,
      'lead-1',
      {
        channel: 'CALL',
        outcome: 'NO_ANSWER',
        nextStep: { type: 'CALL', dueAt: inTwoHours() },
      },
      SYSTEM_LEAD_SCOPE,
    );

    const update = tx.lead.update.mock.calls[0][0].data;
    expect(update.unansweredStreak).toBe(3);
    expect(update.contactAttempts).toEqual({ increment: 1 });
    expect(update.firstContactedAt).toBeInstanceOf(Date);
    // Three unanswered in a row → cold.
    expect(update.heat).toBe('COLD');
  });

  it('resets the streak and heats up on a hot outcome', async () => {
    prisma.lead.findFirst.mockResolvedValue(
      makeLead({
        unansweredStreak: 2,
        firstContactedAt: new Date(Date.now() - 86_400_000),
      }),
    );

    await service.log(
      user,
      'lead-1',
      {
        channel: 'CALL',
        outcome: 'VISIT_BOOKED',
        nextStep: { type: 'SITE_VISIT', dueAt: inTwoHours() },
      },
      SYSTEM_LEAD_SCOPE,
    );

    const update = tx.lead.update.mock.calls[0][0].data;
    expect(update.unansweredStreak).toBe(0);
    expect(update.heat).toBe('HOT');
    expect(update.firstContactedAt).toBeUndefined();
  });

  it('completes the due task and schedules the next one for the lead owner', async () => {
    prisma.lead.findFirst.mockResolvedValue(
      makeLead({ assignedUserId: 'agent-2' }),
    );
    tx.task.findMany.mockResolvedValue([{ id: 'task-due' }]);

    const result = await service.log(
      user,
      'lead-1',
      {
        channel: 'WHATSAPP',
        outcome: 'OFFER_SENT',
        nextStep: { type: 'CALL', dueAt: inTwoHours() },
      },
      SYSTEM_LEAD_SCOPE,
    );

    expect(tx.task.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: ['task-due'] } },
        data: expect.objectContaining({
          status: 'DONE',
          completedInteractionId: 'int-1',
        }),
      }),
    );
    const created = tx.task.create.mock.calls[0][0].data;
    expect(created.assigneeId).toBe('agent-2');
    expect(created.origin).toBe('MANAGER');
    expect(created.title).toBe('Follow up on the offer');
    expect(result.completedTaskIds).toEqual(['task-due']);
    expect(lifecycle.refreshNextTaskDueAt).toHaveBeenCalledWith('lead-1', tx);
  });

  it('refuses a next step in the past', async () => {
    await expect(
      service.log(
        user,
        'lead-1',
        {
          channel: 'CALL',
          outcome: 'ANSWERED_INTERESTED',
          nextStep: {
            type: 'CALL',
            dueAt: new Date(Date.now() - 60 * 60 * 1000),
          },
        },
        SYSTEM_LEAD_SCOPE,
      ),
    ).rejects.toThrow('must be in the future');
  });

  it('attaches evidence to the lead and links it to the interaction', async () => {
    await service.log(
      user,
      'lead-1',
      {
        channel: 'MEETING',
        outcome: 'RESERVED',
        evidence: [
          { objectKey: 'reservation' },
          { objectKey: 'id-copy' },
          { objectKey: 'reservation' },
        ],
        nextStep: { type: 'PAPERWORK', dueAt: inTwoHours() },
      },
      SYSTEM_LEAD_SCOPE,
    );

    expect(files.completeUpload).toHaveBeenCalledTimes(2);
    expect(files.completeUpload).toHaveBeenCalledWith(
      'tenant-1',
      'agent-1',
      {
        objectKey: 'reservation',
        category: 'LEAD_ATTACHMENT',
        leadId: 'lead-1',
      },
      SYSTEM_LEAD_SCOPE,
    );
    expect(tx.fileAsset.updateMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['file-reservation', 'file-id-copy'] },
        tenantId: 'tenant-1',
        leadId: 'lead-1',
      },
      data: { interactionId: 'int-1' },
    });
    const metadata = activity.createActivity.mock.calls[0][0].metadata;
    expect(metadata.evidence).toEqual([
      { id: 'file-reservation', name: 'reservation.pdf' },
      { id: 'file-id-copy', name: 'id-copy.pdf' },
    ]);
  });

  it('validates the log before touching any upload', async () => {
    await expect(
      service.log(
        user,
        'lead-1',
        {
          channel: 'CALL',
          outcome: 'ANSWERED_INTERESTED',
          evidence: [{ objectKey: 'x' }],
        },
        SYSTEM_LEAD_SCOPE,
      ),
    ).rejects.toBeDefined();
    expect(files.completeUpload).not.toHaveBeenCalled();
  });
});
