import {
  SYSTEM_LEAD_SCOPE,
  isAssigneeInScope,
  leadScopeCacheKey,
  leadScopeWhere,
  parseStoredLeadScope,
  scopeUserIds,
  toStoredLeadScope,
  type LeadScope,
} from './lead-scope.types';

const own: LeadScope = { kind: 'own', actorUserId: 'agent-1' };
const team: LeadScope = {
  kind: 'team',
  actorUserId: 'leader-1',
  userIds: ['leader-1', 'agent-1', 'agent-2'],
};
const all: LeadScope = { kind: 'all', actorUserId: 'owner-1' };

describe('lead scope', () => {
  it('lets "all" see everything', () => {
    expect(leadScopeWhere(all)).toEqual({});
    expect(scopeUserIds(all)).toBeNull();
    expect(isAssigneeInScope(all, 'anyone')).toBe(true);
  });

  it('lets an agent see their own leads and the unassigned pool only', () => {
    expect(leadScopeWhere(own)).toEqual({
      OR: [{ assignedUserId: { in: ['agent-1'] } }, { assignedUserId: null }],
    });
    expect(isAssigneeInScope(own, 'agent-1')).toBe(true);
    expect(isAssigneeInScope(own, null)).toBe(true);
    expect(isAssigneeInScope(own, 'agent-2')).toBe(false);
  });

  it('lets a team leader see the team and the unassigned pool', () => {
    expect(isAssigneeInScope(team, 'agent-2')).toBe(true);
    expect(isAssigneeInScope(team, null)).toBe(true);
    expect(isAssigneeInScope(team, 'outsider')).toBe(false);
  });

  it('never shares a cache key between scopes', () => {
    const keys = new Set([all, own, team].map(leadScopeCacheKey));
    expect(keys.size).toBe(3);
    // Team keys don't depend on member order.
    expect(
      leadScopeCacheKey({ ...team, userIds: [...team.userIds].reverse() }),
    ).toBe(leadScopeCacheKey(team));
  });

  it('round-trips stored scopes and fails closed on garbage', () => {
    expect(parseStoredLeadScope(toStoredLeadScope(own))).toEqual(own);
    expect(parseStoredLeadScope(toStoredLeadScope(team))).toEqual(team);
    expect(parseStoredLeadScope(toStoredLeadScope(all))).toEqual(
      SYSTEM_LEAD_SCOPE,
    );
    // Jobs created before scoping existed ran tenant-wide.
    expect(parseStoredLeadScope(null)).toEqual(SYSTEM_LEAD_SCOPE);

    const garbage = parseStoredLeadScope({ kind: 'team', userIds: 'nope' });
    expect(isAssigneeInScope(garbage, 'agent-1')).toBe(false);
    expect(scopeUserIds(garbage)).not.toBeNull();
  });
});
