import type { AuditActorType } from '@crmpro/database';

export type AuditActorSummary = {
  id: string;
  fullName: string;
  email: string;
};

export type AuditLogResponse = {
  id: string;
  actorType: AuditActorType;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  actor: AuditActorSummary | null;
};
