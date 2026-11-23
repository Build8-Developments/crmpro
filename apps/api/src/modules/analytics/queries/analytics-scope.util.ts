import { Prisma } from '@crmpro/database';
import {
  leadScopeWhere,
  scopeUserIds,
  type LeadScope,
} from '../../../common/auth/lead-scope/lead-scope.types';

/**
 * Raw-SQL counterpart of `leadScopeWhere`: a boolean expression restricting
 * the given assignee column to the actor's scope. Unassigned leads are always
 * visible, so a restricted scope keeps `IS NULL` rows. Returns `TRUE` for an
 * unrestricted scope so it can always be used as `AND ${fragment}`.
 */
export function buildLeadScopeSql(
  scope: LeadScope,
  column = 'l."assignedUserId"',
): Prisma.Sql {
  const userIds = scopeUserIds(scope);
  if (userIds === null) {
    return Prisma.sql`TRUE`;
  }

  const assignee = Prisma.raw(column);
  return Prisma.sql`(${assignee} = ANY(${userIds}::uuid[]) OR ${assignee} IS NULL)`;
}

/**
 * Raw-SQL filter for rows that reference a lead (e.g. `LeadActivity`):
 * keeps only rows whose lead is in scope. `TRUE` when unrestricted.
 */
export function buildLeadRefScopeSql(
  scope: LeadScope,
  leadIdColumn = 'la."leadId"',
): Prisma.Sql {
  if (scopeUserIds(scope) === null) {
    return Prisma.sql`TRUE`;
  }

  return Prisma.sql`EXISTS (
    SELECT 1 FROM "Lead" scoped_lead
    WHERE scoped_lead."id" = ${Prisma.raw(leadIdColumn)}
      AND ${buildLeadScopeSql(scope, 'scoped_lead."assignedUserId"')}
  )`;
}

/**
 * Adds the scope filter to a Lead where-clause via `AND`, so existing `OR`s
 * (and assignee filters) are never overwritten. Unrestricted scopes return
 * the where-clause unchanged.
 */
export function withLeadScope(
  where: Prisma.LeadWhereInput,
  scope: LeadScope,
): Prisma.LeadWhereInput {
  if (scopeUserIds(scope) === null) {
    return where;
  }

  const existing =
    where.AND === undefined
      ? []
      : Array.isArray(where.AND)
        ? where.AND
        : [where.AND];

  return { ...where, AND: [...existing, leadScopeWhere(scope)] };
}

/**
 * Relation filter for models that belong to a lead (LeadActivity,
 * LeadProjectInterest, ...): `{ lead: ... }` when restricted, `{}` otherwise.
 */
export function leadRelationScope(scope: LeadScope): {
  lead?: Prisma.LeadWhereInput;
} {
  return scopeUserIds(scope) === null ? {} : { lead: leadScopeWhere(scope) };
}

/**
 * Import/export jobs carry bulk lead data: scoped callers only see the jobs
 * they created (same rule as the import-jobs / export-jobs APIs).
 */
export function jobScopeWhere(scope: LeadScope): { createdByUserId?: string } {
  return scope.kind === 'all' || scope.actorUserId === null
    ? {}
    : { createdByUserId: scope.actorUserId };
}
