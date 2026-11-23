import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { LeadActivityEventType, NotificationType } from '@crmpro/database';
import type { AuthenticatedApiKey } from '../api-keys/types/api-key.types';
import type { InboundLeadDto } from './dto/inbound-lead.dto';
import { InboundLeadsService } from './inbound-leads.service';

const placement = { pipelineId: 'pipe-1', pipelineStageId: 'stage-1' };
const now = new Date('2026-11-17T12:30:00Z');
const hourBucket = Math.floor(now.getTime() / 3_600_000);

describe('InboundLeadsService', () => {
  let managers: { distributors: jest.Mock };
  let prisma: {
    leadSource: { findFirst: jest.Mock };
    project: { findFirst: jest.Mock };
    lead: { findFirst: jest.Mock };
    leadActivity: { findFirst: jest.Mock };
    user: { findMany: jest.Mock };
  };
  let leads: {
    createSystemLead: jest.Mock;
    getDefaultPipelinePlacement: jest.Mock;
  };
  let activities: { createActivity: jest.Mock };
  let notifications: { trigger: jest.Mock };
  let service: InboundLeadsService;

  const key: AuthenticatedApiKey = {
    id: 'key-1',
    tenantId: 'tenant-1',
    name: 'Zapier – Meta',
    sourceId: null,
    lastUsedAt: null,
  };

  const dto = (overrides: Partial<InboundLeadDto> = {}): InboundLeadDto => ({
    fullName: 'Hany Adel',
    phone: '01012345678',
    ...overrides,
  });

  const duplicate = (existingIsOpen: boolean) => ({
    status: 'duplicate' as const,
    existingLeadId: 'lead-old',
    existingAssigneeId: 'agent-1',
    existingIsOpen,
  });

  beforeEach(() => {
    prisma = {
      leadSource: { findFirst: jest.fn().mockResolvedValue(null) },
      project: { findFirst: jest.fn().mockResolvedValue(null) },
      lead: {
        findFirst: jest.fn().mockResolvedValue({
          fullName: 'Hany Adel',
          assignedUser: { id: 'agent-1', isActive: true, deletedAt: null },
        }),
      },
      leadActivity: { findFirst: jest.fn().mockResolvedValue(null) },
      user: { findMany: jest.fn().mockResolvedValue([]) },
    };
    leads = {
      createSystemLead: jest
        .fn()
        .mockResolvedValue({ status: 'created', leadId: 'lead-new' }),
      getDefaultPipelinePlacement: jest.fn().mockResolvedValue(placement),
    };
    activities = { createActivity: jest.fn().mockResolvedValue({}) };
    notifications = { trigger: jest.fn().mockResolvedValue(undefined) };
    managers = { distributors: jest.fn().mockResolvedValue([]) };
    service = new InboundLeadsService(
      prisma as never,
      leads as never,
      activities as never,
      notifications as never,
      managers as never,
    );
  });

  it('creates an unassigned lead through createSystemLead', async () => {
    await expect(
      service.ingest(
        key,
        dto({
          email: 'hany@example.com',
          message: 'Interested in a 3-bedroom',
          budgetMin: 4_000_000,
          paymentPreference: 'INSTALLMENTS',
          externalId: 'fb-123',
          utmSource: 'facebook',
          utmCampaign: 'nov-launch',
        }),
        now,
      ),
    ).resolves.toEqual({ leadId: 'lead-new', status: 'created' });

    expect(leads.createSystemLead).toHaveBeenCalledTimes(1);
    const [tenantId, row, usedPlacement, options] = leads.createSystemLead.mock
      .calls[0] as [
      string,
      Record<string, unknown>,
      unknown,
      Record<string, unknown>,
    ];
    expect(tenantId).toBe('tenant-1');
    expect(usedPlacement).toBe(placement);
    expect(row).toEqual(
      expect.objectContaining({
        fullName: 'Hany Adel',
        primaryPhone: '01012345678',
        email: 'hany@example.com',
        message: 'Interested in a 3-bedroom',
        externalId: 'fb-123',
        sourceId: null,
        projectIds: [],
        profile: { budgetMin: 4_000_000, paymentPreference: 'INSTALLMENTS' },
      }),
    );
    expect(row).not.toHaveProperty('assignedUserId');
    expect(options).toEqual({
      origin: 'inbound',
      actorUserId: null,
      duplicatePolicy: 'SKIP',
      metadata: {
        channel: 'api',
        apiKeyId: 'key-1',
        apiKeyName: 'Zapier – Meta',
        utm: { source: 'facebook', campaign: 'nov-launch' },
      },
    });
    expect(activities.createActivity).not.toHaveBeenCalled();
    expect(notifications.trigger).not.toHaveBeenCalled();
  });

  it("uses the key's source over the payload's", async () => {
    prisma.leadSource.findFirst.mockResolvedValueOnce({ id: 'src-key' });

    await service.ingest(
      { ...key, sourceId: 'src-key' },
      dto({ source: 'Website' }),
      now,
    );

    expect(prisma.leadSource.findFirst).toHaveBeenCalledTimes(1);
    expect(leads.createSystemLead).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({ sourceId: 'src-key' }),
      placement,
      expect.anything(),
    );
  });

  it('matches source and project names; unknown names are kept on the timeline only', async () => {
    prisma.leadSource.findFirst.mockResolvedValueOnce({ id: 'src-fb' });
    await service.ingest(
      key,
      dto({ source: 'facebook ads', projectName: 'Nowhere Towers' }),
      now,
    );
    expect(leads.createSystemLead).toHaveBeenLastCalledWith(
      'tenant-1',
      expect.objectContaining({ sourceId: 'src-fb', projectIds: [] }),
      placement,
      expect.objectContaining({
        metadata: expect.objectContaining({
          submittedProject: 'Nowhere Towers',
        }) as unknown,
      }),
    );

    prisma.project.findFirst.mockResolvedValueOnce({ id: 'proj-1' });
    await service.ingest(
      key,
      dto({ source: 'Billboard', projectName: 'palm hills' }),
      now,
    );
    expect(leads.createSystemLead).toHaveBeenLastCalledWith(
      'tenant-1',
      expect.objectContaining({ sourceId: null, projectIds: ['proj-1'] }),
      placement,
      expect.objectContaining({
        metadata: expect.objectContaining({
          submittedSource: 'Billboard',
        }) as unknown,
      }),
    );
  });

  it('answers a repeated externalId idempotently', async () => {
    leads.createSystemLead.mockResolvedValue({
      status: 'already-created',
      leadId: 'lead-ext',
    });

    await expect(
      service.ingest(key, dto({ externalId: 'fb-123' }), now),
    ).resolves.toEqual({ leadId: 'lead-ext', status: 'duplicate_request' });
    expect(activities.createActivity).not.toHaveBeenCalled();
    expect(notifications.trigger).not.toHaveBeenCalled();
  });

  it('records a resubmission on an open lead and notifies its owner once an hour', async () => {
    leads.createSystemLead.mockResolvedValue(duplicate(true));

    await expect(
      service.ingest(
        key,
        dto({ message: 'Still interested', utmSource: 'facebook' }),
        now,
      ),
    ).resolves.toEqual({ leadId: 'lead-old', status: 'resubmitted' });

    expect(leads.createSystemLead).toHaveBeenCalledTimes(1);
    expect(activities.createActivity).toHaveBeenCalledWith({
      tenantId: 'tenant-1',
      leadId: 'lead-old',
      actorUserId: null,
      eventType: LeadActivityEventType.LEAD_RESUBMITTED,
      metadata: {
        channel: 'api',
        apiKeyId: 'key-1',
        apiKeyName: 'Zapier – Meta',
        utm: { source: 'facebook' },
        submittedName: 'Hany Adel',
        message: 'Still interested',
      },
    });
    expect(notifications.trigger).toHaveBeenCalledTimes(1);
    expect(notifications.trigger).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-1',
        recipientUserId: 'agent-1',
        type: NotificationType.ESCALATION,
        metadata: expect.objectContaining({
          kind: 'lead_resubmitted',
          leadId: 'lead-old',
        }) as unknown,
        dedupeKey: `lead:lead-old:ESCALATION:agent-1:resubmitted:${hourBucket}`,
      }),
    );
  });

  it('notifies the distributors when the open lead has no (active) owner', async () => {
    leads.createSystemLead.mockResolvedValue(duplicate(true));
    prisma.lead.findFirst.mockResolvedValue({
      fullName: 'Hany Adel',
      assignedUser: null,
    });
    managers.distributors.mockResolvedValue(['mgr-1', 'mgr-2']);

    await service.ingest(key, dto(), now);

    expect(managers.distributors).toHaveBeenCalledWith('tenant-1');
    expect(
      notifications.trigger.mock.calls.map(
        ([input]: [{ recipientUserId: string }]) => input.recipientUserId,
      ),
    ).toEqual(['mgr-1', 'mgr-2']);
  });

  it('does not repeat a resubmission retried with the same externalId', async () => {
    leads.createSystemLead.mockResolvedValue(duplicate(true));
    prisma.leadActivity.findFirst.mockResolvedValue({ id: 'activity-1' });

    await expect(
      service.ingest(key, dto({ externalId: 'fb-999' }), now),
    ).resolves.toEqual({ leadId: 'lead-old', status: 'duplicate_request' });
    expect(prisma.leadActivity.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          leadId: 'lead-old',
          eventType: LeadActivityEventType.LEAD_RESUBMITTED,
          metadata: { path: ['externalId'], equals: 'fb-999' },
        }) as unknown,
      }),
    );
    expect(activities.createActivity).not.toHaveBeenCalled();
    expect(notifications.trigger).not.toHaveBeenCalled();
  });

  it('does not repeat an identical resubmission from the same key within the hour', async () => {
    leads.createSystemLead.mockResolvedValue(duplicate(true));
    prisma.leadActivity.findFirst.mockResolvedValue({
      metadata: { apiKeyId: 'key-1', message: 'Still interested' },
    });

    await expect(
      service.ingest(key, dto({ message: 'Still interested' }), now),
    ).resolves.toEqual({ leadId: 'lead-old', status: 'resubmitted' });
    expect(prisma.leadActivity.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          leadId: 'lead-old',
          createdAt: { gte: new Date(now.getTime() - 3_600_000) },
        }) as unknown,
      }),
    );
    expect(activities.createActivity).not.toHaveBeenCalled();
    expect(notifications.trigger).not.toHaveBeenCalled();

    // A new message is a new inquiry.
    await service.ingest(key, dto({ message: 'Now I want a villa' }), now);
    expect(activities.createActivity).toHaveBeenCalledTimes(1);
  });

  it('still answers resubmitted when the notification fails', async () => {
    leads.createSystemLead.mockResolvedValue(duplicate(true));
    notifications.trigger.mockRejectedValue(new Error('queue down'));

    await expect(service.ingest(key, dto(), now)).resolves.toEqual({
      leadId: 'lead-old',
      status: 'resubmitted',
    });
  });

  it('creates a new lead when the phone only matches a closed lead', async () => {
    leads.createSystemLead
      .mockResolvedValueOnce(duplicate(false))
      .mockResolvedValueOnce({ status: 'created', leadId: 'lead-again' });

    await expect(service.ingest(key, dto(), now)).resolves.toEqual({
      leadId: 'lead-again',
      status: 'created',
    });

    expect(leads.createSystemLead).toHaveBeenCalledTimes(2);
    expect(leads.createSystemLead).toHaveBeenLastCalledWith(
      'tenant-1',
      expect.anything(),
      placement,
      expect.objectContaining({
        duplicatePolicy: 'CREATE',
        metadata: expect.objectContaining({
          previousLeadId: 'lead-old',
        }) as unknown,
      }),
    );
    expect(activities.createActivity).not.toHaveBeenCalled();
    expect(notifications.trigger).not.toHaveBeenCalled();
  });

  it('turns a failed row into a 422 with the reason', async () => {
    leads.createSystemLead.mockResolvedValue({
      status: 'failed',
      reason: 'Lead quota exceeded',
    });

    const error = await service
      .ingest(key, dto(), now)
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(UnprocessableEntityException);
    expect((error as UnprocessableEntityException).message).toBe(
      'Lead quota exceeded',
    );
  });

  it('422s when the workspace has no default pipeline', async () => {
    leads.getDefaultPipelinePlacement.mockRejectedValue(
      new BadRequestException('Default pipeline is not configured'),
    );

    await expect(service.ingest(key, dto(), now)).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
    expect(leads.createSystemLead).not.toHaveBeenCalled();
  });
});
