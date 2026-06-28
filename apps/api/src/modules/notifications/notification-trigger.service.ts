import { Injectable } from '@nestjs/common';
import {
  NotificationPriority,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { NotificationPreferencesService } from './notification-preferences.service';
import { NotificationQueueService } from './notification-queue.service';
import { TriggerNotificationInput } from './entities/notification.types';
import { resolvePriority } from './mappers/notification.mapper';

@Injectable()
export class NotificationTriggerService {
  constructor(
    private readonly preferencesService: NotificationPreferencesService,
    private readonly queueService: NotificationQueueService,
  ) {}

  async trigger(input: TriggerNotificationInput): Promise<void> {
    const enabled = await this.preferencesService.isEnabled(
      input.tenantId,
      input.recipientUserId,
      input.type,
    );

    if (!enabled) {
      return;
    }

    await this.queueService.enqueue({
      tenantId: input.tenantId,
      recipientUserId: input.recipientUserId,
      type: input.type,
      metadata: (input.metadata ?? {}) as Prisma.InputJsonValue,
      priority: resolvePriority(input.priority),
      createdByUserId: input.createdByUserId ?? null,
      expiresAt: input.expiresAt?.toISOString() ?? null,
    });
  }

  async notifyLeadAssigned(params: {
    tenantId: string;
    recipientUserId: string;
    leadId: string;
    leadName: string;
    actorUserId: string;
  }): Promise<void> {
    await this.trigger({
      tenantId: params.tenantId,
      recipientUserId: params.recipientUserId,
      type: NotificationType.LEAD_ASSIGNED,
      createdByUserId: params.actorUserId,
      metadata: {
        leadId: params.leadId,
        leadName: params.leadName,
      },
      priority: NotificationPriority.HIGH,
    });
  }

  async notifyImportCompleted(params: {
    tenantId: string;
    recipientUserId: string;
    importJobId: string;
    successfulRows: number;
    failedRows: number;
  }): Promise<void> {
    await this.trigger({
      tenantId: params.tenantId,
      recipientUserId: params.recipientUserId,
      type: NotificationType.IMPORT_COMPLETED,
      metadata: {
        importJobId: params.importJobId,
        successfulRows: params.successfulRows,
        failedRows: params.failedRows,
      },
    });
  }

  async notifyExportCompleted(params: {
    tenantId: string;
    recipientUserId: string;
    exportJobId: string;
    rowCount: number;
    exportType: string;
  }): Promise<void> {
    await this.trigger({
      tenantId: params.tenantId,
      recipientUserId: params.recipientUserId,
      type: NotificationType.EXPORT_COMPLETED,
      metadata: {
        exportJobId: params.exportJobId,
        rowCount: params.rowCount,
        exportType: params.exportType,
      },
    });
  }

  async notifyLeadStageChanged(params: {
    tenantId: string;
    recipientUserId: string;
    leadId: string;
    leadName: string;
    fromStageName: string;
    toStageName: string;
    closeType?: string | null;
    actorUserId: string;
  }): Promise<void> {
    await this.trigger({
      tenantId: params.tenantId,
      recipientUserId: params.recipientUserId,
      type: NotificationType.LEAD_STAGE_CHANGED,
      createdByUserId: params.actorUserId,
      metadata: {
        leadId: params.leadId,
        leadName: params.leadName,
        fromStageName: params.fromStageName,
        toStageName: params.toStageName,
        closeType: params.closeType ?? null,
      },
    });

    if (params.closeType === 'WON') {
      await this.trigger({
        tenantId: params.tenantId,
        recipientUserId: params.recipientUserId,
        type: NotificationType.LEAD_WON,
        createdByUserId: params.actorUserId,
        metadata: {
          leadId: params.leadId,
          leadName: params.leadName,
        },
        priority: NotificationPriority.HIGH,
      });
    }

    if (params.closeType === 'LOST') {
      await this.trigger({
        tenantId: params.tenantId,
        recipientUserId: params.recipientUserId,
        type: NotificationType.LEAD_LOST,
        createdByUserId: params.actorUserId,
        metadata: {
          leadId: params.leadId,
          leadName: params.leadName,
        },
      });
    }
  }

  async notifyFileDeleted(params: {
    tenantId: string;
    recipientUserId: string;
    fileId: string;
    fileName: string;
    actorUserId: string;
  }): Promise<void> {
    await this.trigger({
      tenantId: params.tenantId,
      recipientUserId: params.recipientUserId,
      type: NotificationType.FILE_DELETED,
      createdByUserId: params.actorUserId,
      metadata: {
        fileId: params.fileId,
        fileName: params.fileName,
      },
    });
  }
}
