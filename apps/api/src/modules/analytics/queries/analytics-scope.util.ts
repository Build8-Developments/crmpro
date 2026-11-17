import { Prisma } from '@crmpro/database';
import {
  leadScopeAssigneeFilter,
  type LeadScope,
} from '../../leads/scope/lead-scope.types';

/**
 * Raw-SQL counterpart of `leadScopeWhere`: an `AND ...` fragment restricting
 * the lead alias to the actor's scope (empty for tenant-wide scope).
 */
export function buildLeadScopeSql(
  scope: LeadScope,
  leadAlias = 'l',
): Prisma.Sql {
  const filter = leadScopeAssigneeFilter(scope);

  if (filter === null) {
    return Prisma.empty;
  }

  const column = Prisma.raw(`${leadAlias}."assignedUserId"`);

  if (filter.includeUnassigned) {
    return Prisma.sql`AND (${column} = ANY(${filter.userIds}::uuid[]) OR ${column} IS NULL)`;
  }

  return Prisma.sql`AND ${column} = ANY(${filter.userIds}::uuid[])`;
}

/** Background jobs carry bulk lead data: scoped users only count their own. */
export function jobScopeWhere(scope: LeadScope): { createdByUserId?: string } {
  return scope.kind === 'all' || scope.actorUserId === null
    ? {}
    : { createdByUserId: scope.actorUserId };
}
