import { createHash } from 'node:crypto';
import type { Prisma } from '@crmpro/database';

/**
 * Which leads an actor may see and work on.
 *
 * - `all`:  every lead in the tenant (lead.read-all, or internal/system work)
 * - `team`: leads assigned to anyone in the actor's team(s), plus unassigned
 *           leads so managers can distribute them (lead.read-team)
 * - `own`:  only leads assigned to the actor (default for agents)
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

export function leadScopeWhere(scope: LeadScope): Prisma.LeadWhereInput {
  switch (scope.kind) {
    case 'all':
      return {};
    case 'team':
      return {
        OR: [
          { assignedUserId: { in: scope.userIds } },
          { assignedUserId: null },
        ],
      };
    case 'own':
      return { assignedUserId: scope.actorUserId };
  }
}

/** Whether a lead assigned to `assignedUserId` is visible inside `scope`. */
export function isAssigneeInScope(
  scope: LeadScope,
  assignedUserId: string | null,
): boolean {
  switch (scope.kind) {
    case 'all':
      return true;
    case 'team':
      return assignedUserId === null || scope.userIds.includes(assignedUserId);
    case 'own':
      return assignedUserId === scope.actorUserId;
  }
}

/**
 * Assignee filter for raw SQL / aggregate queries. `null` means unrestricted.
 */
export function leadScopeAssigneeFilter(
  scope: LeadScope,
): { userIds: string[]; includeUnassigned: boolean } | null {
  switch (scope.kind) {
    case 'all':
      return null;
    case 'team':
      return { userIds: scope.userIds, includeUnassigned: true };
    case 'own':
      return { userIds: [scope.actorUserId], includeUnassigned: false };
  }
}

/** Stable, short cache-key fragment so scoped results never share a cache entry. */
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

/** Serializable form stored on background jobs (e.g. exports). */
export type StoredLeadScope =
  | { kind: 'all' }
  | { kind: 'team'; actorUserId: string; userIds: string[] }
  | { kind: 'own'; actorUserId: string };

export function toStoredLeadScope(scope: LeadScope): StoredLeadScope {
  if (scope.kind === 'all') {
    return { kind: 'all' };
  }

  return scope;
}

/** Parses a stored scope; anything unrecognised fails closed to "own nobody". */
export function parseStoredLeadScope(value: unknown): LeadScope {
  if (value === undefined || value === null) {
    // Jobs created before scoping existed ran tenant-wide.
    return SYSTEM_LEAD_SCOPE;
  }

  if (typeof value === 'object') {
    const candidate = value as Record<string, unknown>;

    if (candidate.kind === 'all') {
      return SYSTEM_LEAD_SCOPE;
    }

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

  return { kind: 'own', actorUserId: '00000000-0000-0000-0000-000000000000' };
}
