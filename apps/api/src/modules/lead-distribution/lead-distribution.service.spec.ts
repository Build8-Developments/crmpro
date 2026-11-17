import { LeadActivityEventType } from '@crmpro/database';
import { LeadDistributionService } from './lead-distribution.service';

describe('LeadDistributionService', () => {
  let tx: {
    $queryRaw: jest.Mock;
    lead: { findFirst: jest.Mock; updateMany: jest.Mock };
    user: { findFirst: jest.Mock; update: jest.Mock };
  };
  let prisma: {
    tenantSettings: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let activities: { createActivity: jest.Mock };
  let notifications: { notifyLeadAssigned: jest.Mock };
  let events: { subscribe: jest.Mock; publish: jest.Mock };
  let service: LeadDistributionService;

  beforeEach(() => {
    tx = {
      $queryRaw: jest.fn(),
      lead: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'lead-1',
          fullName: 'Client',
          assignedUserId: null,
        }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      user: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'agent-2', name: 'Agent Two' }),
        update: jest.fn(),
      },
    };
    prisma = {
      tenantSettings: {
        findUnique: jest.fn().mockResolvedValue({ autoAssignEnabled: true }),
      },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    activities = { createActivity: jest.fn() };
    notifications = { notifyLeadAssigned: jest.fn() };
    events = { subscribe: jest.fn(), publish: jest.fn() };
    service = new LeadDistributionService(
      prisma as never,
      events as never,
      activities as never,
      notifications as never,
    );
  });

  it('gives a new lead to the eligible agent assigned least recently', async () => {
    const result = await service.autoAssignNewLead('tenant-1', 'lead-1');

    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(tx.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 'tenant-1',
          isActive: true,
          receivesLeads: true,
        }) as Record<string, unknown>,
        orderBy: [
          { lastAutoAssignedAt: { sort: 'asc', nulls: 'first' } },
          { createdAt: 'asc' },
        ],
      }),
    );
    expect(tx.lead.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'lead-1', assignedUserId: null },
        data: expect.objectContaining({ assignedUserId: 'agent-2' }) as Record<
          string,
          unknown
        >,
      }),
    );
    expect(activities.createActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: LeadActivityEventType.ASSIGNED,
        metadata: expect.objectContaining({ automatic: true }) as Record<
          string,
          unknown
        >,
      }),
      tx,
    );
    expect(notifications.notifyLeadAssigned).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientUserId: 'agent-2',
        actorUserId: null,
      }),
    );
    expect(result?.assignedUserId).toBe('agent-2');
  });

  it('does nothing when auto-assign is off', async () => {
    prisma.tenantSettings.findUnique.mockResolvedValue({
      autoAssignEnabled: false,
    });

    await expect(
      service.autoAssignNewLead('tenant-1', 'lead-1'),
    ).resolves.toBeNull();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('backs off if someone assigned the lead first', async () => {
    tx.lead.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.autoAssignNewLead('tenant-1', 'lead-1'),
    ).resolves.toBeNull();
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(notifications.notifyLeadAssigned).not.toHaveBeenCalled();
  });
});
