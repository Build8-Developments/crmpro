import type { NotificationType } from '@crmpro/database';

export function buildNotificationDedupeKey(params: {
  entityType: string;
  entityId: string;
  type: NotificationType;
  recipientUserId: string;
  suffix?: string;
}): string {
  const base = `${params.entityType}:${params.entityId}:${params.type}:${params.recipientUserId}`;

  return params.suffix ? `${base}:${params.suffix}` : base;
}

export function toNotificationJobId(
  tenantId: string,
  dedupeKey: string,
): string {
  return `notification-${tenantId}-${dedupeKey.replace(/:/g, '-')}`;
}
