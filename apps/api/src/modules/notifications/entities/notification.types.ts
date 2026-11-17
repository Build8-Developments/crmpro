import {
  NotificationPreferenceCategory,
  NotificationPriority,
  NotificationStatus,
  NotificationType,
  Prisma,
} from '@crmpro/database';

export interface NotificationJobPayload {
  tenantId: string;
  recipientUserId: string;
  type: NotificationType;
  metadata: Prisma.InputJsonValue;
  priority?: NotificationPriority;
  createdByUserId?: string | null;
  expiresAt?: string | null;
  dedupeKey?: string | null;
  requestId?: string;
}

export interface NotificationResponse {
  id: string;
  tenantId: string;
  recipientUserId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  priority: NotificationPriority;
  status: NotificationStatus;
  readAt: string | null;
  createdAt: string;
  expiresAt: string | null;
  createdByUserId: string | null;
}

export interface NotificationPreferenceResponse {
  category: NotificationPreferenceCategory;
  label: string;
  enabled: boolean;
  emailEnabled: boolean;
}

export interface NotificationDeliveryContext {
  tenantId: string;
  recipientUserId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata: Prisma.InputJsonValue;
  priority: NotificationPriority;
  createdByUserId?: string | null;
  expiresAt?: Date | null;
  dedupeKey?: string | null;
}

export interface NotificationTemplateInput {
  type: NotificationType;
  metadata: Record<string, unknown>;
}

export interface NotificationTemplateResult {
  title: string;
  message: string;
  priority: NotificationPriority;
}

export interface TriggerNotificationInput {
  tenantId: string;
  recipientUserId: string;
  type: NotificationType;
  metadata?: Record<string, unknown>;
  priority?: NotificationPriority;
  createdByUserId?: string | null;
  expiresAt?: Date | null;
  dedupeKey?: string | null;
}
