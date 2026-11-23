import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  NotificationPriority,
  NotificationType,
  ProjectUpdateType,
} from '@crmpro/database';
import { ProjectUpdatesService } from './project-updates.service';
import { PROJECT_UPDATE_AUDIT_ACTIONS } from './project-updates.constants';

const createdAt = new Date('2026-11-17T10:00:00Z');

function record(overrides: Record<string, unknown> = {}) {
  return {
    id: 'update-1',
    projectId: 'project-1',
    type: ProjectUpdateType.PRICE_CHANGE,
    title: 'New price list',
    body: null as string | null,
    createdAt,
    updatedAt: createdAt,
    project: { id: 'project-1', name: 'Mivida' },
    author: { id: 'user-1', name: 'Owner' } as {
      id: string;
      name: string;
    } | null,
    ...overrides,
  };
}

function build() {
  const prisma = {
    project: { findFirst: jest.fn() },
    projectUpdate: {
      create: jest.fn().mockResolvedValue(record()),
      findMany: jest.fn().mockResolvedValue([record()]),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };
  const client = {
    ...prisma,
    $transaction: jest.fn((callback: (tx: typeof prisma) => unknown) =>
      callback(prisma),
    ),
  };
  const audit = { createAuditLog: jest.fn().mockResolvedValue(undefined) };
  const notifications = { trigger: jest.fn().mockResolvedValue(undefined) };
  const sellers = {
    findSellerIds: jest.fn().mockResolvedValue(['agent-1', 'agent-2']),
    findProjectIdsSoldBy: jest.fn().mockResolvedValue(['project-1']),
  };
  const service = new ProjectUpdatesService(
    client as never,
    audit as never,
    notifications as never,
    sellers as never,
  );
  return { service, prisma, audit, notifications, sellers };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('ProjectUpdatesService', () => {
  describe('create', () => {
    it('only posts to live projects of the same tenant', async () => {
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

    it('audits the post and notifies sellers once each, author excluded', async () => {
      const { service, prisma, audit, notifications, sellers } = build();
      prisma.project.findFirst.mockResolvedValue({
        id: 'project-1',
        name: 'Mivida',
      });

      const update = await service.create('tenant-1', 'user-1', 'project-1', {
        title: 'New price list',
        type: ProjectUpdateType.PRICE_CHANGE,
      });
      await flush();

      expect(update.author).toEqual({ id: 'user-1', fullName: 'Owner' });
      expect(prisma.projectUpdate.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: 'tenant-1',
            projectId: 'project-1',
            authorUserId: 'user-1',
          }) as unknown,
        }),
      );
      expect(audit.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: PROJECT_UPDATE_AUDIT_ACTIONS.POSTED,
          entityId: 'update-1',
        }),
      );
      expect(sellers.findSellerIds).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          projectId: 'project-1',
          excludeUserId: 'user-1',
        }),
      );
      expect(notifications.trigger).toHaveBeenCalledTimes(2);
      expect(notifications.trigger).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          recipientUserId: 'agent-1',
          type: NotificationType.PROJECT_UPDATE,
          priority: NotificationPriority.HIGH,
          dedupeKey: 'project-update:update-1:PROJECT_UPDATE:agent-1',
          metadata: expect.objectContaining({
            projectId: 'project-1',
            projectName: 'Mivida',
            updateId: 'update-1',
            updateType: ProjectUpdateType.PRICE_CHANGE,
            title: 'New price list',
            href: '/projects?id=project-1',
          }) as unknown,
        }),
      );
    });

    it('sends general news at normal priority', async () => {
      const { service, prisma, notifications } = build();
      prisma.project.findFirst.mockResolvedValue({
        id: 'project-1',
        name: 'Mivida',
      });
      prisma.projectUpdate.create.mockResolvedValue(
        record({
          type: ProjectUpdateType.GENERAL,
          body: 'Site visit on Friday',
        }),
      );

      await service.create('tenant-1', 'user-1', 'project-1', {
        title: 'Open day',
      });
      await flush();

      expect(notifications.trigger).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: NotificationPriority.NORMAL,
          metadata: expect.objectContaining({
            message: 'Site visit on Friday',
          }) as unknown,
        }),
      );
    });

    it('still returns the update when notifying fails', async () => {
      const { service, prisma, sellers } = build();
      prisma.project.findFirst.mockResolvedValue({
        id: 'project-1',
        name: 'Mivida',
      });
      sellers.findSellerIds.mockRejectedValue(new Error('db down'));

      await expect(
        service.create('tenant-1', 'user-1', 'project-1', { title: 'X' }),
      ).resolves.toMatchObject({ id: 'update-1' });
      await flush();
    });
  });

  describe('listing', () => {
    it('hides other tenants and deleted rows, newest first with a cursor', async () => {
      const { service, prisma } = build();
      prisma.project.findFirst.mockResolvedValue({ id: 'project-1' });
      const cursorAt = new Date('2026-11-18T00:00:00Z');
      prisma.projectUpdate.findFirst.mockResolvedValue({
        id: 'update-0',
        createdAt: cursorAt,
      });
      prisma.projectUpdate.findMany.mockResolvedValue([
        record({ id: 'a' }),
        record({ id: 'b' }),
      ]);

      const page = await service.listForProject('tenant-1', 'project-1', {
        limit: 1,
        cursor: 'update-0',
      });

      expect(prisma.projectUpdate.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'update-0', tenantId: 'tenant-1' },
        }),
      );
      expect(prisma.projectUpdate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            projectId: 'project-1',
            tenantId: 'tenant-1',
            deletedAt: null,
            project: { tenantId: 'tenant-1', deletedAt: null },
            OR: [
              { createdAt: { lt: cursorAt } },
              { createdAt: cursorAt, id: { lt: 'update-0' } },
            ],
          }) as unknown,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          take: 2,
        }),
      );
      expect(page.items.map((item) => item.id)).toEqual(['a']);
      expect(page.nextCursor).toBe('a');
    });

    it('404s for a project of another tenant', async () => {
      const { service, prisma } = build();
      prisma.project.findFirst.mockResolvedValue(null);

      await expect(
        service.listForProject('tenant-2', 'project-1', {}),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.projectUpdate.findMany).not.toHaveBeenCalled();
    });

    it('rejects a cursor from another tenant', async () => {
      const { service, prisma } = build();
      prisma.projectUpdate.findFirst.mockResolvedValue(null);

      await expect(
        service.feed('tenant-1', 'user-1', { cursor: 'foreign' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('limits the "mine" feed to projects the caller sells, within sinceDays', async () => {
      const { service, prisma, sellers } = build();
      const now = new Date('2026-11-23T12:00:00Z');

      await service.feed(
        'tenant-1',
        'user-1',
        { scope: 'mine', sinceDays: 14, limit: 5 },
        now,
      );

      expect(sellers.findProjectIdsSoldBy).toHaveBeenCalledWith(
        'tenant-1',
        'user-1',
      );
      expect(prisma.projectUpdate.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'tenant-1',
            AND: [
              { projectId: { in: ['project-1'] } },
              { createdAt: { gte: new Date('2026-11-09T12:00:00Z') } },
            ],
          }) as unknown,
          take: 6,
        }),
      );
    });

    it('returns an empty "mine" feed without querying when the caller sells nothing', async () => {
      const { service, prisma, sellers } = build();
      sellers.findProjectIdsSoldBy.mockResolvedValue([]);

      const page = await service.feed('tenant-1', 'user-1', { scope: 'mine' });

      expect(page).toEqual({ items: [], nextCursor: null });
      expect(prisma.projectUpdate.findMany).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('only edits live updates of the tenant', async () => {
      const { service, prisma } = build();
      prisma.projectUpdate.findFirst.mockResolvedValue(null);

      await expect(
        service.update('tenant-2', 'user-1', 'update-1', { title: 'X' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.projectUpdate.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'update-1',
            tenantId: 'tenant-2',
            deletedAt: null,
            project: { tenantId: 'tenant-2', deletedAt: null },
          },
        }),
      );
      expect(prisma.projectUpdate.update).not.toHaveBeenCalled();
    });

    it('saves and audits the changed fields without notifying', async () => {
      const { service, prisma, audit, notifications } = build();
      prisma.projectUpdate.findFirst.mockResolvedValue(record());
      prisma.projectUpdate.update.mockResolvedValue(
        record({ title: 'Prices up 5%', body: 'From December' }),
      );

      const updated = await service.update('tenant-1', 'user-2', 'update-1', {
        title: 'Prices up 5%',
        body: 'From December',
        type: ProjectUpdateType.PRICE_CHANGE,
      });
      await flush();

      expect(prisma.projectUpdate.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'update-1' },
          data: { title: 'Prices up 5%', body: 'From December' },
        }),
      );
      expect(audit.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: PROJECT_UPDATE_AUDIT_ACTIONS.EDITED,
          actorUserId: 'user-2',
          metadata: expect.objectContaining({
            changes: {
              title: { from: 'New price list', to: 'Prices up 5%' },
              body: { from: null, to: 'text' },
            },
          }) as unknown,
        }),
      );
      expect(updated.title).toBe('Prices up 5%');
      expect(notifications.trigger).not.toHaveBeenCalled();
    });

    it('skips the write when nothing changed', async () => {
      const { service, prisma, audit } = build();
      prisma.projectUpdate.findFirst.mockResolvedValue(record());

      await service.update('tenant-1', 'user-1', 'update-1', {
        title: 'New price list',
      });

      expect(prisma.projectUpdate.update).not.toHaveBeenCalled();
      expect(audit.createAuditLog).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('only deletes live updates of the tenant', async () => {
      const { service, prisma } = build();
      prisma.projectUpdate.findFirst.mockResolvedValue(null);

      await expect(
        service.remove('tenant-2', 'user-1', 'update-1'),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.projectUpdate.update).not.toHaveBeenCalled();
    });

    it('soft-deletes and audits', async () => {
      const { service, prisma, audit } = build();
      prisma.projectUpdate.findFirst.mockResolvedValue(record());

      await expect(
        service.remove('tenant-1', 'user-1', 'update-1'),
      ).resolves.toEqual({ id: 'update-1' });
      expect(prisma.projectUpdate.update).toHaveBeenCalledWith({
        where: { id: 'update-1' },
        data: { deletedAt: expect.any(Date) as unknown },
      });
      expect(audit.createAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: PROJECT_UPDATE_AUDIT_ACTIONS.DELETED,
          entityType: 'ProjectUpdate',
          entityId: 'update-1',
        }),
      );
    });
  });
});
