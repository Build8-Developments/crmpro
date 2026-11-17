import { NotFoundException } from '@nestjs/common';
import { NotificationType, ProjectUpdateType } from '@crmpro/database';
import { ProjectUpdatesService } from './project-updates.service';

const record = {
  id: 'update-1',
  type: ProjectUpdateType.PRICE_CHANGE,
  title: 'New price list',
  body: null,
  createdAt: new Date('2026-11-17T10:00:00Z'),
  project: { id: 'project-1', name: 'Mivida' },
  author: { id: 'user-1', name: 'Owner' },
};

function build() {
  const prisma = {
    project: { findFirst: jest.fn() },
    projectUpdate: {
      create: jest.fn().mockResolvedValue(record),
      findMany: jest.fn().mockResolvedValue([record]),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findMany: jest
        .fn()
        .mockResolvedValue([{ id: 'agent-1' }, { id: 'agent-2' }]),
    },
  };
  const client = {
    ...prisma,
    $transaction: jest.fn((callback: (tx: typeof prisma) => unknown) =>
      callback(prisma),
    ),
  };
  const notifications = { trigger: jest.fn().mockResolvedValue(undefined) };
  const service = new ProjectUpdatesService(
    client as never,
    { createAuditLog: jest.fn() } as never,
    notifications as never,
  );
  return { service, prisma, notifications };
}

describe('ProjectUpdatesService', () => {
  it('only posts to projects of the same tenant', async () => {
    const { service, prisma } = build();
    prisma.project.findFirst.mockResolvedValue(null);

    await expect(
      service.create('tenant-2', 'user-9', 'project-1', { title: 'Hi' }),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.project.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'project-1', tenantId: 'tenant-2', deletedAt: null },
      }),
    );
    expect(prisma.projectUpdate.create).not.toHaveBeenCalled();
  });

  it('notifies every active project reader except the author', async () => {
    const { service, prisma, notifications } = build();
    prisma.project.findFirst.mockResolvedValue({
      id: 'project-1',
      name: 'Mivida',
    });

    const update = await service.create('tenant-1', 'user-1', 'project-1', {
      title: 'New price list',
      type: ProjectUpdateType.PRICE_CHANGE,
    });
    await new Promise((resolve) => setImmediate(resolve));

    expect(update.author).toEqual({ id: 'user-1', fullName: 'Owner' });
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 'tenant-1',
          id: { not: 'user-1' },
          role: {
            permissions: { some: { permission: { key: 'project.read' } } },
          },
        }) as unknown,
      }),
    );
    expect(notifications.trigger).toHaveBeenCalledTimes(2);
    expect(notifications.trigger).toHaveBeenCalledWith(
      expect.objectContaining({
        recipientUserId: 'agent-1',
        type: NotificationType.PROJECT_UPDATE,
        metadata: expect.objectContaining({ projectName: 'Mivida' }) as unknown,
      }),
    );
  });

  it('can post silently', async () => {
    const { service, prisma, notifications } = build();
    prisma.project.findFirst.mockResolvedValue({
      id: 'project-1',
      name: 'Mivida',
    });

    await service.create('tenant-1', 'user-1', 'project-1', {
      title: 'Typo fix',
      notify: false,
    });
    await new Promise((resolve) => setImmediate(resolve));

    expect(notifications.trigger).not.toHaveBeenCalled();
  });

  it('scopes the feed to the tenant and pages with a cursor', async () => {
    const { service, prisma } = build();
    prisma.projectUpdate.findFirst.mockResolvedValue({
      createdAt: new Date('2026-11-18T00:00:00Z'),
    });

    const page = await service.list('tenant-1', {
      limit: 1,
      before: 'update-0',
    });

    expect(prisma.projectUpdate.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: 'tenant-1',
          deletedAt: null,
          createdAt: { lt: new Date('2026-11-18T00:00:00Z') },
        }) as unknown,
        take: 2,
      }),
    );
    expect(page.items).toHaveLength(1);
    expect(page.nextCursor).toBeNull();
  });

  it('only deletes updates of the given tenant project', async () => {
    const { service, prisma } = build();
    prisma.projectUpdate.findFirst.mockResolvedValue(null);

    await expect(
      service.remove('tenant-2', 'user-1', 'project-1', 'update-1'),
    ).rejects.toThrow(NotFoundException);
    expect(prisma.projectUpdate.update).not.toHaveBeenCalled();
  });
});
