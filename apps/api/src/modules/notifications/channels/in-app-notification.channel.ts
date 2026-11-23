import { Injectable } from '@nestjs/common';
import { Prisma } from '@crmpro/database';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { DomainEventBus } from '../../../common/events/domain-event-bus.service';
import { NotificationCreatedEvent } from '../../../common/events/domain-event.types';
import {
  IN_APP_NOTIFICATION_CHANNEL,
  NotificationDeliveryChannel,
} from '../entities/notification-delivery.types';
import { NotificationDeliveryContext } from '../entities/notification.types';

@Injectable()
export class InAppNotificationChannel implements NotificationDeliveryChannel {
  readonly channelId = IN_APP_NOTIFICATION_CHANNEL;

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: DomainEventBus,
  ) {}

  async deliver(context: NotificationDeliveryContext): Promise<void> {
    // No audit row per notification: notifications are a side effect of an
    // already-audited action, and one row each flooded the tenant audit log.
    const notificationId = await this.prisma.$transaction((tx) =>
      this.createNotificationIfAbsent(tx, context),
    );

    if (!notificationId) {
      return;
    }

    // Published after commit so a rollback cannot emit a phantom invalidation.
    void this.eventBus.publish(
      new NotificationCreatedEvent(
        context.tenantId,
        context.recipientUserId,
        context.createdByUserId ?? undefined,
      ),
    );
  }

  private async createNotificationIfAbsent(
    tx: Prisma.TransactionClient,
    context: NotificationDeliveryContext,
  ): Promise<string | null> {
    const data = {
      tenantId: context.tenantId,
      recipientUserId: context.recipientUserId,
      type: context.type,
      title: context.title,
      message: context.message,
      metadata: context.metadata,
      priority: context.priority,
      createdByUserId: context.createdByUserId ?? null,
      expiresAt: context.expiresAt ?? null,
      dedupeKey: context.dedupeKey ?? null,
    };

    if (!context.dedupeKey) {
      const notification = await tx.notification.create({
        data,
        select: { id: true },
      });

      return notification.id;
    }

    const created = await tx.notification.createMany({
      data: [data],
      skipDuplicates: true,
    });

    if (created.count === 0) {
      return null;
    }

    const notification = await tx.notification.findFirst({
      where: {
        tenantId: context.tenantId,
        dedupeKey: context.dedupeKey,
      },
      select: { id: true },
    });

    return notification?.id ?? null;
  }
}
