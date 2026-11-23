export interface SanitizedUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  role: {
    id: string;
    name: string;
  };
  tenant: {
    id: string;
    name: string;
    slug: string;
    status: string;
    /** Only on GET /auth/me. */
    access?: TenantAccessSummary;
  };
}

/** readOnly while a contract terminated in READ_ONLY mode winds down. */
export interface TenantAccessSummary {
  readOnly: boolean;
  /** ISO; when a terminated contract stops giving access, else null. */
  accessEndsAt: string | null;
}
