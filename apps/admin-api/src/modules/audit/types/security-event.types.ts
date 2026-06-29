import type {
  AdminSecurityEventType,
  SecuritySeverity,
} from '@crmpro/database';

export type SecurityEventAdminSummary = {
  id: string;
  fullName: string;
  email: string;
};

export type AdminSecurityEventResponse = {
  id: string;
  eventType: AdminSecurityEventType;
  severity: SecuritySeverity;
  ipAddress: string | null;
  userAgent: string | null;
  fingerprint: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  admin: SecurityEventAdminSummary | null;
};
