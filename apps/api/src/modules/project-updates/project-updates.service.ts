import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationPriority,
  NotificationType,
  Prisma,
  ProjectUpdateType,
} from '@crmpro/database';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuditWriterService } from '../audit/audit-writer.service';
import { NotificationTriggerService } from '../notifications/notification-trigger.service';
import { buildNotificationDedupeKey } from '../notifications/utils/notification-dedupe.util';
import {
  CreateProjectUpdateDto,
  ProjectUpdatesFeedQueryDto,
  ProjectUpdatesPageQueryDto,
  UpdateProjectUpdateDto,
} from './dto/project-update.dto';
import { ProjectSellersService } from './project-sellers.service';
import {
  HIGH_PRIORITY_PROJECT_UPDATE_TYPES,
  PROJECT_UPDATE_AUDIT_ACTIONS,
  PROJECT_UPDATE_AUDIT_ENTITY,
  PROJECT_UPDATE_MAX_RECIPIENTS,
  PROJECT_UPDATE_MESSAGE_EXCERPT,
  PROJECT_UPDATE_TYPE_LABELS,
  PROJECT_UPDATES_DEFAULT_LIMIT,
  projectUpdateHref,
} from './project-updates.constants';

const DAY_MS = 24 * 60 * 60 * 1000;

const updateSelect = {
  id: true,
  projectId: true,
  type: true,
  title: true,
  body: true,
  createdAt: true,
  updatedAt: true,
  project: { select: { id: true, name: true } },
  author: { select: { id: true, name: true } },
} satisfies Prisma.ProjectUpdateSelect;

type ProjectUpdateRecord = Prisma.ProjectUpdateGetPayload<{
  select: typeof updateSelect;
}>;

export interface ProjectUpdateResponse {
  id: string;
  projectId: string;
  type: ProjectUpdateType;
  title: string;
  body: string | null;
  createdAt: string;
  updatedAt: string;
  project: { id: string; name: string };
  /** Null once the author's account is removed. */
  author: { id: string; fullName: string } | null;
}

export interface ProjectUpdatesPage {
  items: ProjectUpdateResponse[];
  /** Pass as `cursor` for the next (older) page; null on the last page. */
  nextCursor: string | null;
}

function toResponse(update: ProjectUpdateRecord): ProjectUpdateResponse {
  return {
    id: update.id,
    projectId: update.projectId,
    type: update.type,
    title: update.title,
    body: update.body,
    createdAt: update.createdAt.toISOString(),
    updatedAt: update.updatedAt.toISOString(),
    project: update.project,
    author: update.author
      ? { id: update.author.id, fullName: update.author.name }
      : null,
  };
}

function excerpt(text: string, max: number): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trimEnd()}…` : flat;
}

/**
 * Project news (price changes, new phases, availability). Everyone with
 * project.read sees it; posting, editing and deleting need project.update —
 * anyone with it may edit or delete any update of the tenant (as they can
 * edit the project itself). Authorship alone grants nothing. A new update
 * notifies the people selling the project (see ProjectSellersService); edits
 * and deletes do not notify.
 */
@Injectable()
export class ProjectUpdatesService {
  private readonly logger = new Logger(ProjectUpdatesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditWriter: AuditWriterService,
    private readonly notificationTrigger: NotificationTriggerService,
    private readonly sellers: ProjectSellersService,
  ) {}

  async listForProject(
    tenantId: string,
    projectId: string,
    query: ProjectUpdatesPageQueryDto,
  ): Promise<ProjectUpdatesPage> {
    await this.getProjectOrThrow(tenantId, projectId);
    return this.page(tenantId, { projectId }, query);
  }

  async feed(
    tenantId: string,
    userId: string,
    query: ProjectUpdatesFeedQueryDto,
    now = new Date(),
  ): Promise<ProjectUpdatesPage> {
    const and: Prisma.ProjectUpdateWhereInput[] = [];

    if (query.projectIds?.length) {
      and.push({ projectId: { in: query.projectIds } });
    }
    if (query.scope === 'mine') {
      const mine = await this.sellers.findProjectIdsSoldBy(tenantId, userId);
      if (mine.length === 0) return { items: [], nextCursor: null };
      and.push({ projectId: { in: mine } });
    }
    if (query.sinceDays) {
      and.push({
        createdAt: { gte: new Date(now.getTime() - query.sinceDays * DAY_MS) },
      });
    }

    return this.page(tenantId, and.length ? { AND: and } : {}, query);
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
          body: dto.body ?? null,
        },
        select: updateSelect,
      });

      await this.auditWriter.createAuditLog({
        tenantId,
        actorUserId,
        action: PROJECT_UPDATE_AUDIT_ACTIONS.POSTED,
        entityType: PROJECT_UPDATE_AUDIT_ENTITY,
        entityId: created.id,
        metadata: {
          name: created.title,
          projectId: project.id,
          projectName: project.name,
          type: created.type,
        },
        tx,
      });

      return created;
    });

    // After commit and off the request: one queue job per recipient.
    void this.notifySellers(tenantId, actorUserId, update).catch(
      (error: unknown) =>
        this.logger.error(
          `Project update ${update.id} notifications failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ),
    );

    return toResponse(update);
  }

  async update(
    tenantId: string,
    actorUserId: string,
    updateId: string,
    dto: UpdateProjectUpdateDto,
  ): Promise<ProjectUpdateResponse> {
    const existing = await this.getUpdateOrThrow(tenantId, updateId);

    const data: Prisma.ProjectUpdateUpdateInput = {};
    const changes: Record<string, { from: unknown; to: unknown }> = {};

    if (dto.type !== undefined && dto.type !== existing.type) {
      data.type = dto.type;
      changes.type = { from: existing.type, to: dto.type };
    }
    if (dto.title !== undefined && dto.title !== existing.title) {
      data.title = dto.title;
      changes.title = { from: existing.title, to: dto.title };
    }
    if (dto.body !== undefined && (dto.body ?? null) !== existing.body) {
      data.body = dto.body ?? null;
      // Bodies can be long: record that it changed, not both versions.
      changes.body = {
        from: existing.body === null ? null : 'text',
        to: dto.body ? 'text' : null,
      };
    }

    if (Object.keys(changes).length === 0) {
      return toResponse(existing);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.projectUpdate.update({
        where: { id: existing.id },
        data,
        select: updateSelect,
      });

      await this.auditWriter.createAuditLog({
        tenantId,
        actorUserId,
        action: PROJECT_UPDATE_AUDIT_ACTIONS.EDITED,
        entityType: PROJECT_UPDATE_AUDIT_ENTITY,
        entityId: saved.id,
        metadata: {
          name: saved.title,
          projectId: saved.project.id,
          projectName: saved.project.name,
          changes,
        },
        tx,
      });

      return saved;
    });

    return toResponse(updated);
  }

  async remove(
    tenantId: string,
    actorUserId: string,
    updateId: string,
  ): Promise<{ id: string }> {
    const existing = await this.getUpdateOrThrow(tenantId, updateId);

    await this.prisma.$transaction(async (tx) => {
      await tx.projectUpdate.update({
        where: { id: existing.id },
        data: { deletedAt: new Date() },
      });

      await this.auditWriter.createAuditLog({
        tenantId,
        actorUserId,
        action: PROJECT_UPDATE_AUDIT_ACTIONS.DELETED,
        entityType: PROJECT_UPDATE_AUDIT_ENTITY,
        entityId: existing.id,
        metadata: {
          name: existing.title,
          projectId: existing.project.id,
          projectName: existing.project.name,
          type: existing.type,
        },
        tx,
      });
    });

    return { id: existing.id };
  }

  /** Newest first; ties on createdAt are broken by id so pages never skip. */
  private async page(
    tenantId: string,
    filter: Prisma.ProjectUpdateWhereInput,
    query: ProjectUpdatesPageQueryDto,
  ): Promise<ProjectUpdatesPage> {
    const limit = query.limit ?? PROJECT_UPDATES_DEFAULT_LIMIT;
    const after = query.cursor
      ? await this.cursorWhere(tenantId, query.cursor)
      : null;

    const rows = await this.prisma.projectUpdate.findMany({
      where: {
        ...filter,
        tenantId,
        deletedAt: null,
        project: { tenantId, deletedAt: null },
        ...(after ? { OR: after } : {}),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      select: updateSelect,
    });

    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map(toResponse);

    return {
      items,
      nextCursor: hasMore ? (items[items.length - 1]?.id ?? null) : null,
    };
  }

  /** Rows strictly older than the cursor update (which may be deleted since). */
  private async cursorWhere(
    tenantId: string,
    cursorId: string,
  ): Promise<Prisma.ProjectUpdateWhereInput[]> {
    const cursor = await this.prisma.projectUpdate.findFirst({
      where: { id: cursorId, tenantId },
      select: { id: true, createdAt: true },
    });

    if (!cursor) {
      throw new BadRequestException('Invalid cursor');
    }

    return [
      { createdAt: { lt: cursor.createdAt } },
      { createdAt: cursor.createdAt, id: { lt: cursor.id } },
    ];
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

  private async getUpdateOrThrow(
    tenantId: string,
    updateId: string,
  ): Promise<ProjectUpdateRecord> {
    const update = await this.prisma.projectUpdate.findFirst({
      where: {
        id: updateId,
        tenantId,
        deletedAt: null,
        project: { tenantId, deletedAt: null },
      },
      select: updateSelect,
    });

    if (!update) {
      throw new NotFoundException('Project update not found');
    }

    return update;
  }

  /** In-app notice (plus opted-in email) to each person selling the project. */
  private async notifySellers(
    tenantId: string,
    authorUserId: string,
    update: ProjectUpdateRecord,
  ): Promise<void> {
    const recipientIds = await this.sellers.findSellerIds({
      tenantId,
      projectId: update.project.id,
      excludeUserId: authorUserId,
      limit: PROJECT_UPDATE_MAX_RECIPIENTS,
    });

    const typeLabel = PROJECT_UPDATE_TYPE_LABELS[update.type];
    const message = update.body
      ? excerpt(update.body, PROJECT_UPDATE_MESSAGE_EXCERPT)
      : `${typeLabel} on ${update.project.name}.`;
    const priority = HIGH_PRIORITY_PROJECT_UPDATE_TYPES.has(update.type)
      ? NotificationPriority.HIGH
      : NotificationPriority.NORMAL;

    for (const recipientUserId of recipientIds) {
      await this.notificationTrigger.trigger({
        tenantId,
        recipientUserId,
        type: NotificationType.PROJECT_UPDATE,
        createdByUserId: authorUserId,
        priority,
        // One notification per person per update, even if retried.
        dedupeKey: buildNotificationDedupeKey({
          entityType: 'project-update',
          entityId: update.id,
          type: NotificationType.PROJECT_UPDATE,
          recipientUserId,
        }),
        metadata: {
          projectId: update.project.id,
          projectName: update.project.name,
          updateId: update.id,
          updateType: update.type,
          title: update.title,
          message,
          href: projectUpdateHref(update.project.id),
        },
      });
    }
  }
}
