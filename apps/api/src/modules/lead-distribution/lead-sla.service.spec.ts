import { NotificationType, SlaAction } from '@crmpro/database';
import { LeadSlaService } from './lead-sla.service';

describe('LeadSlaService', () => {
  const now = new Date('2030-01-01T10:00:00Z');
  const lead = {
    id: 'lead-1',
    fullName: 'Client',
    assignedUserId: 'agent-1',
    assignedAt: new Date('2030-01-01T09:00:00Z'),
    assignedUser: { name: 'Agent One', team: { leaderUserId: 'manager-1' } },
  };

  let tx: { lead: { updateMany: jest.Mock; update: jest.Mock } };
  let prisma: {
    tenantSettings: { findMany: jest.Mock };
    lead: { findMany: jest.Mock };
    user: { findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let notifications: { trigger: jest.Mock };
  let distribution: { assignNext: jest.Mock; afterAssign: jest.Mock };
  let service: LeadSlaService;

  beforeEach(() => {
    tx = {
      lead: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn(),
      },
    };
    prisma = {
      tenantSettings: {
        findMany: jest.fn().mockResolvedValue([
          {
            tenantId: 'tenant-1',
            slaFirstResponseMinutes: 15,
            slaAction: SlaAction.NOTIFY,
          },
        ]),
      },
      lead: { findMany: jest.fn().mockResolvedValue([lead]) },
      user: { findMany: jest.fn().mockResolvedValue([{ id: 'owner-1' }]) },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    notifications = { trigger: jest.fn() };
    distribution = {
      assignNext: jest
        .fn()
        .mockResolvedValue({ leadId: 'lead-1', assignedUserId: 'agent-2' }),
      afterAssign: jest.fn(),
    };
    service = new LeadSlaService(
      prisma as never,
      { register: jest.fn() } as never,
      { isTenantActive: jest.fn().mockResolvedValue(true) } as never,
      { createActivity: jest.fn() } as never,
      notifications as never,
      distribution as never,
    );
  });

  it('only looks at assigned, uncontacted, open leads past the deadline', async () => {
    await service.runScan(now);

    expect(prisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 'tenant-1',
          firstContactedAt: null,
          slaBreachedAt: null,
          assignedUserId: { not: null },
          assignedAt: { lt: new Date('2030-01-01T09:45:00Z') },
        }) as Record<string, unknown>,
      }),
    );
  });

  it('marks the breach once and escalates to the team leader', async () => {
    await expect(service.runScan(now)).resolves.toBe(1);

    expect(tx.lead.updateMany).toHaveBeenCalledWith({
      where: { id: 'lead-1', slaBreachedAt: null, firstContactedAt: null },
      data: { slaBreachedAt: now },
    });
    expect(notifications.trigger).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientUserId: 'manager-1',
        type: NotificationType.SLA_BREACHED,
      }),
    );
    expect(distribution.assignNext).not.toHaveBeenCalled();
  });

  it('escalates to tenant-wide users when the owner has no leader', async () => {
    prisma.lead.findMany.mockResolvedValue([
      { ...lead, assignedUser: { name: 'Agent One', team: null } },
    ]);

    await service.runScan(now);

    expect(notifications.trigger).toHaveBeenCalledWith(
      expect.objectContaining({ recipientUserId: 'owner-1' }),
    );
  });

  it('reassigns to the next agent when configured', async () => {
    prisma.tenantSettings.findMany.mockResolvedValue([
      {
        tenantId: 'tenant-1',
        slaFirstResponseMinutes: 15,
        slaAction: SlaAction.REASSIGN,
      },
    ]);

    await service.runScan(now);

    expect(distribution.assignNext).toHaveBeenCalledWith(
      tx,
      'tenant-1',
      'lead-1',
      {
        excludeUserId: 'agent-1',
        reason: 'sla_breach',
      },
    );
    expect(distribution.afterAssign).toHaveBeenCalled();
  });

  it('skips leads another worker already claimed', async () => {
    tx.lead.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.runScan(now)).resolves.toBe(0);
    expect(notifications.trigger).not.toHaveBeenCalled();
  });
});
