import { Prisma } from '@crmpro/database';
import { DomainEventBus } from '../../common/events/domain-event-bus.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QuotaService } from '../../common/quota/quota.service';
import { TaskLifecycleService } from '../workflow/common/task-lifecycle.service';
import { Test } from '@nestjs/testing';
import { LeadsService } from './leads.service';
import { LeadActivityService } from './services/lead-activity.service';

const placement = { pipelineId: 'pipeline-1', pipelineStageId: 'stage-1' };

function build() {
  const tx = {
    lead: { create: jest.fn().mockResolvedValue({ id: 'new-lead' }) },
    leadProjectInterest: { createMany: jest.fn() },
  };
  const prisma = {
    lead: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
    user: { findFirst: jest.fn().mockResolvedValue(null) },
    leadSource: { findFirst: jest.fn().mockResolvedValue({ id: 'source-1' }) },
    project: { count: jest.fn().mockResolvedValue(0) },
    $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
      callback(tx),
    ),
  };
  const events = { publish: jest.fn() };
  const activity = { createActivity: jest.fn() };
  return { prisma, tx, events, activity };
}

async function serviceFor(mocks: ReturnType<typeof build>) {
  const module = await Test.createTestingModule({
    providers: [
      LeadsService,
      { provide: PrismaService, useValue: mocks.prisma },
      { provide: LeadActivityService, useValue: mocks.activity },
      { provide: DomainEventBus, useValue: mocks.events },
      { provide: TaskLifecycleService, useValue: {} },
      {
        provide: QuotaService,
        useValue: {
          canCreateLeadInTransaction: jest.fn().mockResolvedValue(true),
        },
      },
    ],
  }).compile();
  return module.get(LeadsService);
}

describe('LeadsService.createSystemLead', () => {
  it('creates an unassigned lead with normalized phone and publishes the event', async () => {
    const mocks = build();
    const service = await serviceFor(mocks);

    const result = await service.createSystemLead(
      't',
      {
        fullName: 'mona  adel',
        primaryPhone: '01012345678',
        externalId: 'fb-1',
        message: 'Interested in Mivida',
      },
      placement,
      { origin: 'inbound', actorUserId: null },
    );

    expect(result).toEqual({ status: 'created', leadId: 'new-lead' });
    expect(mocks.tx.lead.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          assignedUserId: null,
          externalId: 'fb-1',
          primaryPhone: '01012345678',
        }),
      }),
    );
    expect(mocks.events.publish).toHaveBeenCalled();
    expect(mocks.activity.createActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          source: 'inbound',
          message: 'Interested in Mivida',
        }),
      }),
      mocks.tx,
    );
  });

  it('returns the earlier lead for a retried import row instead of creating another', async () => {
    const mocks = build();
    mocks.prisma.lead.findFirst.mockResolvedValue({ id: 'earlier-lead' });
    const service = await serviceFor(mocks);

    const result = await service.createSystemLead(
      't',
      { fullName: 'Mona Adel', primaryPhone: '01012345678' },
      placement,
      {
        origin: 'import',
        actorUserId: 'u',
        importJobId: 'job-1',
        importRowNumber: 7,
      },
    );

    expect(result).toEqual({
      status: 'already-created',
      leadId: 'earlier-lead',
    });
    expect(mocks.tx.lead.create).not.toHaveBeenCalled();
  });

  it('points a retried externalId at the survivor when its lead was merged away', async () => {
    const mocks = build();
    mocks.prisma.lead.findFirst.mockResolvedValue({
      id: 'merged-away',
      mergedIntoId: 'survivor',
    });
    const service = await serviceFor(mocks);

    await expect(
      service.createSystemLead(
        't',
        {
          fullName: 'Mona Adel',
          primaryPhone: '01012345678',
          externalId: 'fb-1',
        },
        placement,
        { origin: 'inbound', actorUserId: null },
      ),
    ).resolves.toEqual({ status: 'already-created', leadId: 'survivor' });
    expect(mocks.prisma.lead.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          externalId: 'fb-1',
          OR: [{ deletedAt: null }, { mergedIntoId: { not: null } }],
        }) as unknown,
      }),
    );
    expect(mocks.tx.lead.create).not.toHaveBeenCalled();
  });

  it('reports a duplicate phone (open lead preferred) under SKIP, and imports it under CREATE', async () => {
    const mocks = build();
    mocks.prisma.lead.findMany.mockResolvedValue([
      {
        id: 'closed',
        assignedUserId: 'a',
        status: 'OPEN',
        pipelineStage: { isClosed: true },
      },
      {
        id: 'open',
        assignedUserId: 'b',
        status: 'OPEN',
        pipelineStage: { isClosed: false },
      },
    ]);
    const service = await serviceFor(mocks);
    const row = { fullName: 'Mona Adel', primaryPhone: '01012345678' };

    await expect(
      service.createSystemLead('t', row, placement, {
        origin: 'import',
        actorUserId: 'u',
      }),
    ).resolves.toEqual({
      status: 'duplicate',
      existingLeadId: 'open',
      existingAssigneeId: 'b',
      existingIsOpen: true,
    });

    await expect(
      service.createSystemLead('t', row, placement, {
        origin: 'import',
        actorUserId: 'u',
        duplicatePolicy: 'CREATE',
      }),
    ).resolves.toEqual({ status: 'created', leadId: 'new-lead' });
  });

  it('fails rows with unknown projects or bad data without creating anything', async () => {
    const mocks = build();
    const service = await serviceFor(mocks);

    await expect(
      service.createSystemLead(
        't',
        {
          fullName: 'Mona',
          primaryPhone: '01012345678',
          projectIds: ['missing'],
        },
        placement,
        { origin: 'import', actorUserId: 'u' },
      ),
    ).resolves.toEqual({ status: 'failed', reason: 'Unknown project' });
    await expect(
      service.createSystemLead(
        't',
        { fullName: 'M', primaryPhone: '010' },
        placement,
        {
          origin: 'import',
          actorUserId: 'u',
        },
      ),
    ).resolves.toMatchObject({ status: 'failed' });
    expect(mocks.tx.lead.create).not.toHaveBeenCalled();
  });

  it('turns a lost race on the same externalId into the winning lead', async () => {
    const mocks = build();
    mocks.tx.lead.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('dup', {
        code: 'P2002',
        clientVersion: 'test',
      }),
    );
    mocks.prisma.lead.findFirst
      .mockResolvedValueOnce(null) // before creating
      .mockResolvedValueOnce({ id: 'winner' }); // after the conflict
    const service = await serviceFor(mocks);

    await expect(
      service.createSystemLead(
        't',
        {
          fullName: 'Mona Adel',
          primaryPhone: '01012345678',
          externalId: 'fb-1',
        },
        placement,
        { origin: 'inbound', actorUserId: null },
      ),
    ).resolves.toEqual({ status: 'already-created', leadId: 'winner' });
  });
});
