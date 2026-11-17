import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LeadActivityEventType, LeadStatus } from '@crmpro/database';
import type { LeadScope } from '../leads/scope/lead-scope.types';
import { LeadInteractionsService } from './lead-interactions.service';

describe('LeadInteractionsService', () => {
  const ownScope: LeadScope = { kind: 'own', actorUserId: 'agent-1' };
  let tx: { lead: { update: jest.Mock } };
  let prisma: { lead: { findFirst: jest.Mock }; $transaction: jest.Mock };
  let activities: { createActivity: jest.Mock };
  let tasks: {
    insertTask: jest.Mock;
    afterChange: jest.Mock;
    getTask: jest.Mock;
  };
  let events: { publish: jest.Mock };
  let service: LeadInteractionsService;

  beforeEach(() => {
    tx = { lead: { update: jest.fn() } };
    prisma = {
      lead: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'lead-1',
          status: LeadStatus.OPEN,
          assignedUserId: 'agent-1',
          lastContactedAt: null,
          firstContactedAt: null,
        }),
      },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    activities = {
      createActivity: jest.fn().mockResolvedValue({ id: 'activity-1' }),
    };
    tasks = {
      insertTask: jest.fn().mockResolvedValue('task-9'),
      afterChange: jest.fn(),
      getTask: jest.fn().mockResolvedValue({ id: 'task-9' }),
    };
    events = { publish: jest.fn() };
    service = new LeadInteractionsService(
      prisma as never,
      activities as never,
      tasks as never,
      events as never,
    );
  });

  it('logs a call and stamps first + last contact', async () => {
    const occurredAt = new Date(Date.now() - 60_000);

    await service.logActivity(
      'lead-1',
      'tenant-1',
      'agent-1',
      { type: 'CALL', outcome: 'ANSWERED', durationSeconds: 95, occurredAt },
      ownScope,
    );

    expect(activities.createActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: LeadActivityEventType.CALL_LOGGED,
        metadata: expect.objectContaining({
          outcome: 'ANSWERED',
          durationSeconds: 95,
        }) as Record<string, unknown>,
      }),
      tx,
    );
    expect(tx.lead.update).toHaveBeenCalledWith({
      where: { id: 'lead-1' },
      data: { lastContactedAt: occurredAt, firstContactedAt: occurredAt },
    });
    expect(events.publish).toHaveBeenCalled();
  });

  it('never moves firstContactedAt forward', async () => {
    const first = new Date('2026-01-01T00:00:00Z');
    prisma.lead.findFirst.mockResolvedValue({
      id: 'lead-1',
      status: LeadStatus.OPEN,
      assignedUserId: 'agent-1',
      lastContactedAt: first,
      firstContactedAt: first,
    });
    const occurredAt = new Date(Date.now() - 1000);

    await service.logActivity(
      'lead-1',
      'tenant-1',
      'agent-1',
      { type: 'WHATSAPP', occurredAt },
      ownScope,
    );

    expect(tx.lead.update).toHaveBeenCalledWith({
      where: { id: 'lead-1' },
      data: { lastContactedAt: occurredAt },
    });
  });

  it('schedules the next follow-up for the lead owner', async () => {
    await service.logActivity(
      'lead-1',
      'tenant-1',
      'manager-1',
      { type: 'MEETING', nextFollowUp: { dueAt: new Date('2030-01-01') } },
      { kind: 'all', actorUserId: 'manager-1' },
    );

    expect(tasks.insertTask).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ assignedUserId: 'agent-1', leadId: 'lead-1' }),
    );
    expect(tasks.afterChange).toHaveBeenCalledWith(
      'tenant-1',
      'task-9',
      'lead-1',
    );
  });

  it('rejects future timestamps, archived and out-of-scope leads', async () => {
    await expect(
      service.logActivity(
        'lead-1',
        'tenant-1',
        'agent-1',
        { type: 'CALL', occurredAt: new Date(Date.now() + 60 * 60_000) },
        ownScope,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    prisma.lead.findFirst.mockResolvedValueOnce({
      id: 'lead-1',
      status: LeadStatus.ARCHIVED,
      assignedUserId: 'agent-1',
      lastContactedAt: null,
      firstContactedAt: null,
    });
    await expect(
      service.logActivity(
        'lead-1',
        'tenant-1',
        'agent-1',
        { type: 'CALL' },
        ownScope,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    prisma.lead.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.logActivity(
        'lead-x',
        'tenant-1',
        'agent-1',
        { type: 'CALL' },
        ownScope,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.lead.findFirst).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ assignedUserId: 'agent-1' }) as Record<
          string,
          unknown
        >,
      }),
    );
  });
});
