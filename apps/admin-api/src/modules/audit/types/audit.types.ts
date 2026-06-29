import type { AdminActorType } from '@crmpro/database';

export type AdminAuditActorSummary = {
  id: string;
  fullName: string;
  email: string;
};

export type AdminAuditLogResponse = {
  id: string;
  actorType: AdminActorType;
  action: string;
  entityType: string;
  entityId: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  fingerprint: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: AdminAuditActorSummary | null;
};
