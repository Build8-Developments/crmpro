/**
 * Auth domain types aligned with admin-api sanitized admin + permissions payloads.
 */

export type AuthStatus = "bootstrapping" | "authenticated" | "unauthenticated";

export interface AuthUserRole {
  id: string;
  name: string;
}

/** GET /auth/me — SanitizedAdmin */
export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  roleId: string;
  isActive: boolean;
  lastLoginAt: string | null;
}

/** GET /auth/permissions */
export interface AdminAuthorization {
  permissions: string[];
  role: AuthUserRole | null;
}
