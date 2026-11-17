import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { LeadStatus } from '@crmpro/database';
import type { LeadScope } from '../scope/lead-scope.types';
import { LeadAssignmentService } from './lead-assignment.service';

describe('LeadAssignmentService scope rules', () => {
  const teamScope: LeadScope = {
    kind: 'team',
    actorUserId: 'manager-1',
    userIds: ['manager-1', 'agent-1'],
  };
  const ownScope: LeadScope = { kind: 'own', actorUserId: 'agent-1' };

  let prisma: { lead: { findFirst: jest.Mock }; $transaction: jest.Mock };
  let service: LeadAssignmentService;

  beforeEach(() => {
    prisma = {
      lead: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'lead-1',
          tenantId: 'tenant-1',
          status: LeadStatus.OPEN,
          assignedUserId: 'agent-1',
          assignedUser: { id: 'agent-1', name: 'Agent One' },
        }),
      },
      $transaction: jest.fn(),
    };
    service = new LeadAssignmentService(
      prisma as never,
      { createActivity: jest.fn() } as never,
      { publish: jest.fn() } as never,
      { notifyLeadAssigned: jest.fn() } as never,
    );
  });

  it('blocks managers from handing leads to people outside their team', async () => {
    await expect(
      service.assignLead(
        'lead-1',
        'tenant-1',
        'manager-1',
        { userId: 'outsider' },
        teamScope,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('blocks own-scope actors from unassigning or reassigning to others', async () => {
    await expect(
      service.assignLead(
        'lead-1',
        'tenant-1',
        'agent-1',
        { userId: null },
        ownScope,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.assignLead(
        'lead-1',
        'tenant-1',
        'agent-1',
        { userId: 'agent-2' },
        ownScope,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('treats out-of-scope leads as missing', async () => {
    prisma.lead.findFirst.mockResolvedValue(null);

    await expect(
      service.assignLead(
        'lead-x',
        'tenant-1',
        'manager-1',
        { userId: 'agent-1' },
        teamScope,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.lead.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 'tenant-1',
          OR: [
            { assignedUserId: { in: ['manager-1', 'agent-1'] } },
            { assignedUserId: null },
          ],
        }) as Record<string, unknown>,
      }),
    );
  });
});
