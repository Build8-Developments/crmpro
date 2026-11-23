import { Prisma } from '@crmpro/database';
import type { LeadScope } from '../../../common/auth/lead-scope/lead-scope.types';
import {
  buildLeadRefScopeSql,
  buildLeadScopeSql,
  jobScopeWhere,
  leadRelationScope,
  withLeadScope,
} from './analytics-scope.util';

const ALL: LeadScope = { kind: 'all', actorUserId: null };
const TEAM: LeadScope = {
  kind: 'team',
  actorUserId: 'lead-1',
  userIds: ['lead-1', 'agent-2'],
};
const OWN: LeadScope = { kind: 'own', actorUserId: 'agent-1' };

describe('buildLeadScopeSql', () => {
  it('is TRUE for an all scope', () => {
    const fragment = buildLeadScopeSql(ALL);

    expect(fragment.sql).toBe('TRUE');
    expect(fragment.values).toEqual([]);
  });

  it('keeps team members and unassigned leads for a team scope', () => {
    const fragment = buildLeadScopeSql(TEAM);

    expect(fragment.sql).toBe(
      '(l."assignedUserId" = ANY(?::uuid[]) OR l."assignedUserId" IS NULL)',
    );
    expect(fragment.values).toEqual([['lead-1', 'agent-2']]);
  });

  it('keeps the actor and unassigned leads for an own scope', () => {
    const fragment = buildLeadScopeSql(OWN);

    expect(fragment.sql).toBe(
      '(l."assignedUserId" = ANY(?::uuid[]) OR l."assignedUserId" IS NULL)',
    );
    expect(fragment.values).toEqual([['agent-1']]);
  });

  it('supports a custom column', () => {
    expect(buildLeadScopeSql(OWN, 'x."assignedUserId"').sql).toBe(
      '(x."assignedUserId" = ANY(?::uuid[]) OR x."assignedUserId" IS NULL)',
    );
  });

  it('composes into a raw query as a bound parameter', () => {
    const query = Prisma.sql`SELECT 1 FROM "Lead" l WHERE ${buildLeadScopeSql(OWN)}`;

    expect(query.sql).toBe(
      'SELECT 1 FROM "Lead" l WHERE (l."assignedUserId" = ANY(?::uuid[]) OR l."assignedUserId" IS NULL)',
    );
    expect(query.values).toEqual([['agent-1']]);
  });
});

describe('buildLeadRefScopeSql', () => {
  it('is TRUE for an all scope', () => {
    expect(buildLeadRefScopeSql(ALL).sql).toBe('TRUE');
  });

  it('checks the referenced lead for restricted scopes', () => {
    const fragment = buildLeadRefScopeSql(OWN);

    expect(fragment.sql).toContain('EXISTS');
    expect(fragment.sql).toContain('scoped_lead."id" = la."leadId"');
    expect(fragment.sql).toContain('scoped_lead."assignedUserId" IS NULL');
    expect(fragment.values).toEqual([['agent-1']]);
  });
});

describe('withLeadScope', () => {
  it('returns the where unchanged for an all scope', () => {
    const where = { tenantId: 't', OR: [{ assignedUserId: null }] };

    expect(withLeadScope(where, ALL)).toBe(where);
  });

  it('ANDs the scope without clobbering existing OR / AND', () => {
    const where = {
      tenantId: 't',
      OR: [{ lastContactedAt: null }],
      AND: { status: 'OPEN' as const },
    };

    expect(withLeadScope(where, OWN)).toEqual({
      tenantId: 't',
      OR: [{ lastContactedAt: null }],
      AND: [
        { status: 'OPEN' },
        {
          OR: [
            { assignedUserId: { in: ['agent-1'] } },
            { assignedUserId: null },
          ],
        },
      ],
    });
  });
});

describe('leadRelationScope', () => {
  it('is empty for an all scope', () => {
    expect(leadRelationScope(ALL)).toEqual({});
  });

  it('filters the related lead for a team scope', () => {
    expect(leadRelationScope(TEAM)).toEqual({
      lead: {
        OR: [
          { assignedUserId: { in: ['lead-1', 'agent-2'] } },
          { assignedUserId: null },
        ],
      },
    });
  });
});

describe('jobScopeWhere', () => {
  it('is empty for an all scope', () => {
    expect(jobScopeWhere(ALL)).toEqual({});
    expect(jobScopeWhere({ kind: 'all', actorUserId: 'owner-1' })).toEqual({});
  });

  it('limits team and own scopes to jobs the actor created', () => {
    expect(jobScopeWhere(TEAM)).toEqual({ createdByUserId: 'lead-1' });
    expect(jobScopeWhere(OWN)).toEqual({ createdByUserId: 'agent-1' });
  });
});
