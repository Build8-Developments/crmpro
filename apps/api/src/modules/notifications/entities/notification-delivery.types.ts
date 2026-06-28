import { NotificationDeliveryContext } from '../entities/notification.types';

export interface NotificationDeliveryChannel {
  readonly channelId: string;
  deliver(context: NotificationDeliveryContext): Promise<void>;
}

export const IN_APP_NOTIFICATION_CHANNEL = 'in_app';
