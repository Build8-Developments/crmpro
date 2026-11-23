import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { MailService } from '../../mail/mail.service';
import { notificationEmail } from '../../mail/templates/auth-emails';
import { NotificationDeliveryChannel } from '../entities/notification-delivery.types';
import { NotificationDeliveryContext } from '../entities/notification.types';
import { NOTIFICATION_TYPE_TO_PREFERENCE } from '../notifications.constants';

export const EMAIL_NOTIFICATION_CHANNEL = 'email';

/**
 * Opt-in email copy of a notification (per category, `emailEnabled`).
 * Never throws: a mail problem must not make the worker retry the job and
 * re-run the in-app channel.
 */
@Injectable()
export class EmailNotificationChannel implements NotificationDeliveryChannel {
  readonly channelId = EMAIL_NOTIFICATION_CHANNEL;
  private readonly logger = new Logger(EmailNotificationChannel.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async deliver(context: NotificationDeliveryContext): Promise<void> {
    try {
      const category = NOTIFICATION_TYPE_TO_PREFERENCE[context.type];
      const preference = await this.prisma.notificationPreference.findUnique({
        where: {
          userId_category: { userId: context.recipientUserId, category },
        },
        select: { tenantId: true, enabled: true, emailEnabled: true },
      });

      if (
        !preference ||
        preference.tenantId !== context.tenantId ||
        !preference.enabled ||
        !preference.emailEnabled
      ) {
        return;
      }

      const recipient = await this.prisma.user.findFirst({
        where: {
          id: context.recipientUserId,
          tenantId: context.tenantId,
          isActive: true,
          deletedAt: null,
        },
        select: { email: true },
      });

      if (!recipient) {
        return;
      }

      const message = notificationEmail({
        title: context.title,
        message: context.message,
        url: this.mail.webUrl(this.resolvePath(context)),
      });

      await this.mail.send({ to: recipient.email, ...message });
    } catch (error) {
      this.logger.warn(
        `Email notification skipped for ${context.recipientUserId}: ${(error as Error).message}`,
      );
    }
  }

  /** Deep link: lead drawer when the notification is about a lead. */
  private resolvePath(context: NotificationDeliveryContext): string {
    const metadata =
      context.metadata && typeof context.metadata === 'object'
        ? (context.metadata as Record<string, unknown>)
        : {};
    const leadId = metadata.leadId;
    if (typeof leadId === 'string') return `/leads?id=${leadId}`;
    // Task reminders land on the day plan.
    if (typeof metadata.taskId === 'string') return '/today';
    return '/notifications';
  }
}
