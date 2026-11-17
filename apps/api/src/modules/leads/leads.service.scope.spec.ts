import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DomainEventBus } from '../../common/events/domain-event-bus.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { QuotaService } from '../../common/quota/quota.service';
import { LeadsService } from './leads.service';
import type { LeadScope } from './scope/lead-scope.types';
import { LeadActivityService } from './services/lead-activity.service';
import { AuditWriterService } from '../audit/audit-writer.service';
import { CustomFieldsService } from '../custom-fields/custom-fields.service';

const agentScope: LeadScope = { kind: 'own', actorUserId: 'agent-1' };
const teamScope: LeadScope = {
  kind: 'team',
  actorUserId: 'manager-1',
  userIds: ['manager-1', 'agent-1'],
};

describe('LeadsService scope isolation', () => {
  let service: LeadsService;
  let prisma: {
    tenantSettings: { findUnique: jest.Mock };
    lead: { findMany: jest.Mock; findFirst: jest.Mock; count: jest.Mock };
    user: { findFirst: jest.Mock };
    leadSource: { findFirst: jest.Mock };
    pipeline: { findFirst: jest.Mock };
    pipelineStage: { findFirst: jest.Mock };
    $transaction: jest.Mock;
  };
  let createdLead: jest.Mock;

  beforeEach(async () => {
    createdLead = jest.fn().mockResolvedValue({ id: 'lead-new' });
    prisma = {
      tenantSettings: {
        findUnique: jest.fn().mockResolvedValue({ defaultCountryCode: 'EG' }),
      },
      lead: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      user: {
        findFirst: jest.fn(({ where }: { where: { id: string } }) =>
          Promise.resolve({ id: where.id, name: `User ${where.id}` }),
        ),
      },
      leadSource: { findFirst: jest.fn() },
      pipeline: { findFirst: jest.fn().mockResolvedValue({ id: 'p-1' }) },
      pipelineStage: { findFirst: jest.fn().mockResolvedValue({ id: 's-1' }) },
      $transaction: jest.fn((arg: unknown) =>
        typeof arg === 'function'
          ? (arg as (tx: unknown) => unknown)({
              lead: { create: createdLead },
              leadProjectInterest: { createMany: jest.fn() },
            })
          : Promise.all(arg as Promise<unknown>[]),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: LeadActivityService,
          useValue: { createActivity: jest.fn() },
        },
        { provide: DomainEventBus, useValue: { publish: jest.fn() } },
        {
          provide: AuditWriterService,
          useValue: { createAuditLog: jest.fn() },
        },
        {
          provide: CustomFieldsService,
          useValue: {
            resolveLeadValues: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: QuotaService,
          useValue: { assertCanCreateLeadInTransaction: jest.fn() },
        },
      ],
    }).compile();

    service = module.get(LeadsService);
  });

  it('applies the actor scope to every list query', async () => {
    await service.listLeads('tenant-1', {}, agentScope);

    const where = (
      prisma.lead.findMany.mock.calls[0] as [{ where: unknown }]
    )[0].where as { tenantId: string; AND: unknown[] };
    expect(where.tenantId).toBe('tenant-1');
    expect(where.AND).toContainEqual({ assignedUserId: 'agent-1' });
  });

  it('keeps search and stale filters when combined with scope', async () => {
    await service.listLeads(
      'tenant-1',
      { search: 'ahmed', staleOnly: true },
      teamScope,
    );

    const where = (
      prisma.lead.findMany.mock.calls[0] as [{ where: unknown }]
    )[0].where as { AND: unknown[] };
    expect(where.AND).toHaveLength(3);
  });

  it("returns 404 for a colleague's lead instead of leaking it", async () => {
    prisma.lead.findFirst.mockResolvedValue(null);

    await expect(
      service.getLead('lead-of-agent-2', 'tenant-1', agentScope),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.lead.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: 'lead-of-agent-2',
          tenantId: 'tenant-1',
          assignedUserId: 'agent-1',
        }) as Record<string, unknown>,
      }),
    );
  });

  it('assigns leads created by actors without lead.assign to themselves', async () => {
    prisma.lead.findFirst.mockResolvedValue(null);

    await service
      .createLead(
        'tenant-1',
        'agent-1',
        {
          fullName: 'New Client',
          primaryPhone: '01001234567',
          pipelineId: 'p-1',
          pipelineStageId: 's-1',
          assignedUserId: 'agent-2',
        },
        { scope: agentScope, canAssign: false },
      )
      .catch(() => undefined);

    expect(createdLead).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ assignedUserId: 'agent-1' }) as Record<
          string,
          unknown
        >,
      }),
    );
  });

  it('rejects assigning a new lead outside the manager team', async () => {
    await expect(
      service.createLead(
        'tenant-1',
        'manager-1',
        {
          fullName: 'New Client',
          primaryPhone: '01001234567',
          pipelineId: 'p-1',
          pipelineStageId: 's-1',
          assignedUserId: 'outsider',
        },
        { scope: teamScope, canAssign: true },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(createdLead).not.toHaveBeenCalled();
  });

  it('masks duplicate matches that belong to someone else', async () => {
    prisma.lead.findMany.mockResolvedValue([
      {
        id: 'mine',
        fullName: 'My Client',
        assignedUserId: 'agent-1',
        assignedUser: { name: 'Agent One' },
      },
      {
        id: 'theirs',
        fullName: 'Their Client',
        assignedUserId: 'agent-2',
        assignedUser: { name: 'Agent Two' },
      },
    ]);
    const duplicates = await (
      service as unknown as {
        detectDuplicates: (
          tenantId: string,
          phone: string,
          secondary: string | null,
          scope: LeadScope,
        ) => Promise<{ matches: unknown[] } | null>;
      }
    ).detectDuplicates('tenant-1', '201001234567', null, agentScope);

    expect(duplicates?.matches).toEqual([
      {
        id: 'mine',
        fullName: 'My Client',
        ownerName: 'Agent One',
        accessible: true,
      },
      { id: null, fullName: null, ownerName: 'Agent Two', accessible: false },
    ]);
  });
});
