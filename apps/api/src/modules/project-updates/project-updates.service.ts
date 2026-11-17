import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationType, Prisma, ProjectUpdateType } from '@crmpro/database';
import { PERMISSIONS } from '@crmpro/shared/auth';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditWriterService } from '../audit/audit-writer.service';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';
import { buildNotificationDedupeKey } from '../notifications/utils/notification-dedupe.util';
import {
  CreateProjectUpdateDto,
  ProjectUpdatesQueryDto,
} from './dto/project-update.dto';

const DEFAULT_LIMIT = 20;
/** Cap on in-app fan-out per update. */
const MAX_RECIPIENTS = 500;

const updateSelect = {
  id: true,
  type: true,
  title: true,
  body: true,
  createdAt: true,
  project: { select: { id: true, name: true } },
  author: { select: { id: true, name: true } },
} satisfies Prisma.ProjectUpdateSelect;

type ProjectUpdateRecord = Prisma.ProjectUpdateGetPayload<{
  select: typeof updateSelect;
}>;

export interface ProjectUpdateResponse {
  id: string;
  type: ProjectUpdateType;
  title: string;
  body: string | null;
  createdAt: string;
  project: { id: string; name: string };
  author: { id: string; fullName: string };
}

function toResponse(update: ProjectUpdateRecord): ProjectUpdateResponse {
  return {
    id: update.id,
    type: update.type,
    title: update.title,
    body: update.body,
    createdAt: update.createdAt.toISOString(),
    project: update.project,
    author: { id: update.author.id, fullName: update.author.name },
  };
}

/**
 * Project news (price lists, launches, availability). Everyone who can read
 * projects sees the feed; posting needs project.update.
 */
@Injectable()
export class ProjectUpdatesService {
  private readonly logger = new Logger(ProjectUpdatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditWriter: AuditWriterService,
    private readonly notificationTrigger: NotificationTriggerService,
  ) {}

  async list(tenantId: string, query: ProjectUpdatesQueryDto) {
    const limit = query.limit ?? DEFAULT_LIMIT;
    let cursorDate: Date | undefined;

    if (query.before) {
      const cursor = await this.prisma.projectUpdate.findFirst({
        where: { id: query.before, tenantId },
        select: { createdAt: true },
      });
      cursorDate = cursor?.createdAt;
    }

    const items = await this.prisma.projectUpdate.findMany({
      where: {
        tenantId,
        deletedAt: null,
        project: { deletedAt: null },
        ...(query.projectId ? { projectId: query.projectId } : {}),
        ...(cursorDate ? { createdAt: { lt: cursorDate } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      select: updateSelect,
    });

    const hasMore = items.length > limit;
    const page = items.slice(0, limit).map(toResponse);

    return {
      items: page,
      nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null,
    };
  }

  async create(
    tenantId: string,
    actorUserId: string,
    projectId: string,
    dto: CreateProjectUpdateDto,
  ): Promise<ProjectUpdateResponse> {
    const project = await this.getProjectOrThrow(tenantId, projectId);

    const update = await this.prisma.$transaction(async (tx) => {
      const created = await tx.projectUpdate.create({
        data: {
          tenantId,
          projectId: project.id,
          authorUserId: actorUserId,
          type: dto.type ?? ProjectUpdateType.GENERAL,
          title: dto.title,
          body: dto.body || null,
        },
        select: updateSelect,
      });

      await this.auditWriter.createAuditLog({
        tenantId,
        actorUserId,
        action: 'PROJECT_UPDATE_POSTED',
        entityType: 'ProjectUpdate',
        entityId: created.id,
        metadata: { projectId: project.id, type: created.type },
        tx,
      });

      return created;
    });

    if (dto.notify !== false) {
      void this.notifyReaders(tenantId, actorUserId, update).catch(
        (error: Error) =>
          this.logger.error(
            `Project update ${update.id} notifications failed: ${error.message}`,
          ),
      );
    }

    return toResponse(update);
  }

  async remove(
    tenantId: string,
    actorUserId: string,
    projectId: string,
    updateId: string,
  ): Promise<{ id: string }> {
    const update = await this.prisma.projectUpdate.findFirst({
      where: { id: updateId, projectId, tenantId, deletedAt: null },
      select: { id: true },
    });

    if (!update) {
      throw new NotFoundException('Project update not found');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.projectUpdate.update({
        where: { id: update.id },
        data: { deletedAt: new Date() },
      });
      await this.auditWriter.createAuditLog({
        tenantId,
        actorUserId,
        action: 'PROJECT_UPDATE_DELETED',
        entityType: 'ProjectUpdate',
        entityId: update.id,
        metadata: { projectId },
        tx,
      });
    });

    return { id: update.id };
  }

  private async getProjectOrThrow(tenantId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, tenantId, deletedAt: null },
      select: { id: true, name: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  /** In-app (and opted-in email) notice to every active project reader. */
  private async notifyReaders(
    tenantId: string,
    authorUserId: string,
    update: ProjectUpdateRecord,
  ): Promise<void> {
    const recipients = await this.prisma.user.findMany({
      where: {
        tenantId,
        isActive: true,
        deletedAt: null,
        id: { not: authorUserId },
        role: {
          permissions: {
            some: { permission: { key: PERMISSIONS.PROJECT_READ } },
          },
        },
      },
      select: { id: true },
      take: MAX_RECIPIENTS,
    });

    for (const recipient of recipients) {
      await this.notificationTrigger.trigger({
        tenantId,
        recipientUserId: recipient.id,
        type: NotificationType.PROJECT_UPDATE,
        createdByUserId: authorUserId,
        dedupeKey: buildNotificationDedupeKey({
          entityType: 'project-update',
          entityId: update.id,
          type: NotificationType.PROJECT_UPDATE,
          recipientUserId: recipient.id,
        }),
        metadata: {
          projectId: update.project.id,
          projectName: update.project.name,
          projectUpdateId: update.id,
          updateType: update.type,
          title: update.title,
        },
      });
    }
  }
}
