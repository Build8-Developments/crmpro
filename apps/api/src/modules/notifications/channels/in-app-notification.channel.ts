import { Injectable } from '@nestjs/common';
import { AuditActorType, Prisma } from '@crmpro/database';
import { PrismaService } from '../../../common/prisma/prisma.service';
import {
  IN_APP_NOTIFICATION_CHANNEL,
  NotificationDeliveryChannel,
} from '../entities/notification-delivery.types';
import { NotificationDeliveryContext } from '../entities/notification.types';

@Injectable()
export class InAppNotificationChannel implements NotificationDeliveryChannel {
  readonly channelId = IN_APP_NOTIFICATION_CHANNEL;

  constructor(private readonly prisma: PrismaService) {}

  async deliver(context: NotificationDeliveryContext): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const notification = await tx.notification.create({
        data: {
          tenantId: context.tenantId,
          recipientUserId: context.recipientUserId,
          type: context.type,
          title: context.title,
          message: context.message,
          metadata: context.metadata,
          priority: context.priority,
          createdByUserId: context.createdByUserId ?? null,
          expiresAt: context.expiresAt ?? null,
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId: context.tenantId,
          actorType: context.createdByUserId
            ? AuditActorType.USER
            : AuditActorType.SYSTEM,
          actorUserId: context.createdByUserId ?? null,
          entityType: 'Notification',
          entityId: notification.id,
          action: 'NOTIFICATION_CREATED',
          metadata: {
            type: context.type,
            recipientUserId: context.recipientUserId,
            channel: this.channelId,
          } satisfies Prisma.InputJsonValue,
        },
      });
    });
  }
}
