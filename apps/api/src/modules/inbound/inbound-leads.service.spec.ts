import { LeadActivityEventType, NotificationType } from '@crmpro/database';
import { InboundLeadsService } from './inbound-leads.service';

describe('InboundLeadsService', () => {
  let tx: {
    lead: { create: jest.Mock; update: jest.Mock };
    leadProjectInterest: { create: jest.Mock };
  };
  let prisma: {
    tenantSettings: { findUnique: jest.Mock };
    lead: { findFirst: jest.Mock };
    pipeline: { findFirst: jest.Mock };
    leadSource: { findFirst: jest.Mock; create: jest.Mock };
    project: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };
  let activities: { createActivity: jest.Mock };
  let notifications: { trigger: jest.Mock };
  let events: { publish: jest.Mock };
  let service: InboundLeadsService;

  beforeEach(() => {
    tx = {
      lead: {
        create: jest.fn().mockResolvedValue({ id: 'lead-new' }),
        update: jest.fn(),
      },
      leadProjectInterest: { create: jest.fn() },
    };
    prisma = {
      tenantSettings: {
        findUnique: jest.fn().mockResolvedValue({ defaultCountryCode: 'EG' }),
      },
      lead: { findFirst: jest.fn().mockResolvedValue(null) },
      pipeline: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'pipe-1', stages: [{ id: 'stage-1' }] }),
      },
      leadSource: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'src-new' }),
      },
      project: { findFirst: jest.fn().mockResolvedValue({ id: 'proj-1' }) },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };
    activities = { createActivity: jest.fn() };
    notifications = { trigger: jest.fn() };
    events = { publish: jest.fn() };
    service = new InboundLeadsService(
      prisma as never,
      { assertCanCreateLeadInTransaction: jest.fn() } as never,
      activities as never,
      notifications as never,
      events as never,
    );
  });

  const payload = {
    fullName: 'Hany Adel',
    phone: '01012345678',
    source: 'Facebook Ads',
    project: 'Palm Hills New Cairo',
    campaign: 'Launch Nov',
  };

  it('creates a new lead with source, project and an API-sourced timeline entry', async () => {
    await expect(service.ingest('tenant-1', 'key-1', payload)).resolves.toEqual(
      {
        leadId: 'lead-new',
        duplicate: false,
      },
    );

    expect(prisma.leadSource.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { tenantId: 'tenant-1', name: 'Facebook Ads' },
      }),
    );
    expect(tx.lead.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          sourceId: 'src-new',
          pipelineStageId: 'stage-1',
        }) as Record<string, unknown>,
      }),
    );
    expect(tx.leadProjectInterest.create).toHaveBeenCalledWith({
      data: { leadId: 'lead-new', projectId: 'proj-1' },
    });
    expect(events.publish).toHaveBeenCalled();
  });

  it('keeps the existing owner when the phone already belongs to an open lead', async () => {
    prisma.lead.findFirst.mockResolvedValue({
      id: 'lead-old',
      fullName: 'Hany Adel',
      assignedUserId: 'agent-1',
    });

    await expect(service.ingest('tenant-1', 'key-1', payload)).resolves.toEqual(
      {
        leadId: 'lead-old',
        duplicate: true,
      },
    );

    expect(tx.lead.create).not.toHaveBeenCalled();
    expect(activities.createActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: LeadActivityEventType.LEAD_RESUBMITTED,
      }),
      tx,
    );
    expect(notifications.trigger).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientUserId: 'agent-1',
        type: NotificationType.LEAD_RESUBMITTED,
      }),
    );
  });

  it('answers repeated externalIds idempotently', async () => {
    prisma.lead.findFirst.mockResolvedValueOnce({ id: 'lead-ext' });

    await expect(
      service.ingest('tenant-1', 'key-1', { ...payload, externalId: 'fb-123' }),
    ).resolves.toEqual({ leadId: 'lead-ext', duplicate: true });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
