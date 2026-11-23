import { createHash } from 'node:crypto';
import type { Prisma } from '@crmpro/database';

/**
 * Which leads an actor may see and work on.
 *
 * - `all`:  every lead in the tenant (lead.read-all, or system work)
 * - `team`: leads assigned to anyone in the actor's team(s) + unassigned leads
 *           (lead.read-team)
 * - `own`:  leads assigned to the actor + unassigned leads (no scope key)
 *
 * Unassigned leads are visible to everyone so the pool stays workable; only a
 * manager (lead.assign) can hand them out.
 *
 * Out-of-scope leads must behave exactly like missing leads (404), so callers
 * never learn that a lead exists.
 */
export type LeadScope =
  | { kind: 'all'; actorUserId: string | null }
  | { kind: 'team'; actorUserId: string; userIds: string[] }
  | { kind: 'own'; actorUserId: string };

/** Scope for workers and internal flows that legitimately span the tenant. */
export const SYSTEM_LEAD_SCOPE: LeadScope = { kind: 'all', actorUserId: null };

/** The user ids whose leads are visible, or null when unrestricted. */
export function scopeUserIds(scope: LeadScope): string[] | null {
  switch (scope.kind) {
    case 'all':
      return null;
    case 'team':
      return scope.userIds;
    case 'own':
      return [scope.actorUserId];
  }
}

/** Prisma filter for the Lead model. */
export function leadScopeWhere(scope: LeadScope): Prisma.LeadWhereInput {
  const userIds = scopeUserIds(scope);
  if (userIds === null) return {};
  return {
    OR: [{ assignedUserId: { in: userIds } }, { assignedUserId: null }],
  };
}

/** Whether a lead assigned to `assignedUserId` is visible inside `scope`. */
export function isAssigneeInScope(
  scope: LeadScope,
  assignedUserId: string | null,
): boolean {
  const userIds = scopeUserIds(scope);
  return (
    userIds === null ||
    assignedUserId === null ||
    userIds.includes(assignedUserId)
  );
}

/** Stable cache-key fragment so scoped results never share a cache entry. */
export function leadScopeCacheKey(scope: LeadScope): string {
  switch (scope.kind) {
    case 'all':
      return 'scope:all';
    case 'own':
      return `scope:own:${scope.actorUserId}`;
    case 'team': {
      const digest = createHash('sha1')
        .update([...scope.userIds].sort().join(','))
        .digest('hex')
        .slice(0, 16);
      return `scope:team:${digest}`;
    }
  }
}

/** Serializable form stored on background jobs (exports). */
export type StoredLeadScope =
  | { kind: 'all' }
  | { kind: 'team'; actorUserId: string; userIds: string[] }
  | { kind: 'own'; actorUserId: string };

export function toStoredLeadScope(scope: LeadScope): StoredLeadScope {
  return scope.kind === 'all' ? { kind: 'all' } : scope;
}

const NOBODY = '00000000-0000-0000-0000-000000000000';

/**
 * Parses a stored scope. Missing means the job predates scoping (it ran
 * tenant-wide); anything malformed fails closed to "nobody's leads".
 */
export function parseStoredLeadScope(value: unknown): LeadScope {
  if (value === undefined || value === null) return SYSTEM_LEAD_SCOPE;

  if (typeof value === 'object') {
    const candidate = value as Record<string, unknown>;
    if (candidate.kind === 'all') return SYSTEM_LEAD_SCOPE;
    if (candidate.kind === 'own' && typeof candidate.actorUserId === 'string') {
      return { kind: 'own', actorUserId: candidate.actorUserId };
    }
    if (
      candidate.kind === 'team' &&
      typeof candidate.actorUserId === 'string' &&
      Array.isArray(candidate.userIds) &&
      candidate.userIds.every((id) => typeof id === 'string')
    ) {
      return {
        kind: 'team',
        actorUserId: candidate.actorUserId,
        userIds: candidate.userIds,
      };
    }
  }

  return { kind: 'team', actorUserId: NOBODY, userIds: [NOBODY] };
}
