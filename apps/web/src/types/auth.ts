/**
 * Auth domain types.
 *
 * These are intentionally minimal for Phase 1. The real user shape will be
 * refined once the auth endpoints are wired in a later phase.
 */

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  /** Display label for the current role (roles are dynamic per tenant). */
  roleName: string;
  /** Flat list of permission keys granted to the user. */
  permissions: string[];
  avatarUrl?: string | null;
}
