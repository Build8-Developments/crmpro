import { DealStatus, LeadStatus } from '@crmpro/database';
import { ProjectSellersService } from './project-sellers.service';

function build() {
  const prisma = {
    lead: { findMany: jest.fn().mockResolvedValue([]) },
    deal: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findMany: jest.fn().mockResolvedValue([]) },
    leadProjectInterest: { findMany: jest.fn().mockResolvedValue([]) },
  };
  return { prisma, service: new ProjectSellersService(prisma as never) };
}

describe('ProjectSellersService', () => {
  it('combines open-lead owners and live-deal agents, without the author', async () => {
    const { prisma, service } = build();
    prisma.lead.findMany.mockResolvedValue([
      { assignedUserId: 'owner-1' },
      { assignedUserId: 'author' },
    ]);
    prisma.deal.findMany.mockResolvedValue([
      { agentId: 'agent-1', lead: { assignedUserId: 'owner-9' } },
      // No credited agent: the lead owner sells it.
      { agentId: null, lead: { assignedUserId: 'owner-2' } },
      { agentId: 'owner-1', lead: { assignedUserId: null } },
    ]);
    prisma.user.findMany.mockResolvedValue([
      { id: 'agent-1' },
      { id: 'owner-1' },
    ]);

    const ids = await service.findSellerIds({
      tenantId: 'tenant-1',
      projectId: 'project-1',
      excludeUserId: 'author',
      limit: 500,
    });

    expect(prisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 'tenant-1',
          deletedAt: null,
          status: LeadStatus.OPEN,
          pipelineStage: { isClosed: false },
          leadProjectInterests: { some: { projectId: 'project-1' } },
        }) as unknown,
      }),
    );
    expect(prisma.deal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 'tenant-1',
          projectId: 'project-1',
          status: { not: DealStatus.CANCELLED },
        }) as unknown,
      }),
    );
    const userQuery = prisma.user.findMany.mock.calls[0][0] as {
      where: { tenantId: string; id: { in: string[] }; isActive: boolean };
      take: number;
    };
    expect(userQuery.where.tenantId).toBe('tenant-1');
    expect(userQuery.where.isActive).toBe(true);
    expect([...userQuery.where.id.in].sort()).toEqual([
      'agent-1',
      'owner-1',
      'owner-2',
    ]);
    expect(userQuery.take).toBe(500);
    expect(ids).toEqual(['agent-1', 'owner-1']);
  });

  it('skips the user lookup when nobody sells the project', async () => {
    const { prisma, service } = build();

    await expect(
      service.findSellerIds({
        tenantId: 'tenant-1',
        projectId: 'project-1',
        limit: 500,
      }),
    ).resolves.toEqual([]);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('lists the projects a user sells through open leads or live deals', async () => {
    const { prisma, service } = build();
    prisma.leadProjectInterest.findMany.mockResolvedValue([
      { projectId: 'p1' },
      { projectId: 'p2' },
    ]);
    prisma.deal.findMany.mockResolvedValue([
      { projectId: 'p2' },
      { projectId: 'p3' },
      { projectId: null },
    ]);

    const ids = await service.findProjectIdsSoldBy('tenant-1', 'user-1');

    expect(ids.sort()).toEqual(['p1', 'p2', 'p3']);
    expect(prisma.leadProjectInterest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          project: { tenantId: 'tenant-1', deletedAt: null },
          lead: expect.objectContaining({
            tenantId: 'tenant-1',
            assignedUserId: 'user-1',
            status: LeadStatus.OPEN,
          }) as unknown,
        },
      }),
    );
  });
});
