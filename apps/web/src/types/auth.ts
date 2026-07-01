/**
 * Auth domain types aligned with CRM API sanitized user + permissions payloads.
 */

export type AuthStatus = "bootstrapping" | "authenticated" | "unauthenticated";

export interface AuthUserRole {
  id: string;
  name: string;
}

export interface AuthUserTenant {
  id: string;
  name: string;
  slug: string;
  status: string;
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
