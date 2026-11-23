/**
 * Auth domain types aligned with CRM API sanitized user + permissions payloads.
 */

export type AuthStatus = "bootstrapping" | "authenticated" | "unauthenticated";

export interface AuthUserRole {
  id: string;
  name: string;
}

/** Workspace access, from GET /auth/me. */
export interface TenantAccessState {
  /** True while a contract terminated in read-only mode winds down. */
  readOnly: boolean;
  /** ISO; when a terminated contract stops giving access. */
  accessEndsAt: string | null;
}

export interface AuthUserTenant {
  id: string;
  name: string;
  slug: string;
  status: string;
  /** Present on GET /auth/me (not on the login response). */
  access?: TenantAccessState;
}

/** GET /auth/me */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  role: AuthUserRole;
  tenant: AuthUserTenant;
}

/** GET /auth/permissions */
export interface UserAuthorization {
  permissions: string[];
  role: AuthUserRole | null;
}

/** GET /public/workspaces/:slug */
export interface WorkspaceLookupResult {
  exists: true;
  name: string;
  slug: string;
  logoUrl: string | null;
}
