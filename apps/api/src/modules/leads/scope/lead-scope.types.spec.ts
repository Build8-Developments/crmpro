import {
  isAssigneeInScope,
  leadScopeAssigneeFilter,
  leadScopeCacheKey,
  leadScopeWhere,
  parseStoredLeadScope,
  SYSTEM_LEAD_SCOPE,
  toStoredLeadScope,
  type LeadScope,
} from './lead-scope.types';

const own: LeadScope = { kind: 'own', actorUserId: 'agent-1' };
const team: LeadScope = {
  kind: 'team',
  actorUserId: 'manager-1',
  userIds: ['manager-1', 'agent-1', 'agent-2'],
};

describe('lead scope helpers', () => {
  it('builds no filter for tenant-wide scope', () => {
    expect(leadScopeWhere(SYSTEM_LEAD_SCOPE)).toEqual({});
    expect(leadScopeAssigneeFilter(SYSTEM_LEAD_SCOPE)).toBeNull();
  });

  it('restricts own scope to the actor', () => {
    expect(leadScopeWhere(own)).toEqual({ assignedUserId: 'agent-1' });
    expect(isAssigneeInScope(own, 'agent-1')).toBe(true);
    expect(isAssigneeInScope(own, 'agent-2')).toBe(false);
    expect(isAssigneeInScope(own, null)).toBe(false);
  });

  it('lets team scope see team members and unassigned leads only', () => {
    expect(leadScopeWhere(team)).toEqual({
      OR: [
        { assignedUserId: { in: ['manager-1', 'agent-1', 'agent-2'] } },
        { assignedUserId: null },
      ],
    });
    expect(isAssigneeInScope(team, 'agent-2')).toBe(true);
    expect(isAssigneeInScope(team, null)).toBe(true);
    expect(isAssigneeInScope(team, 'outsider')).toBe(false);
  });

  it('never shares cache keys between scopes', () => {
    const keys = new Set([
      leadScopeCacheKey(SYSTEM_LEAD_SCOPE),
      leadScopeCacheKey(own),
      leadScopeCacheKey({ kind: 'own', actorUserId: 'agent-2' }),
      leadScopeCacheKey(team),
    ]);

    expect(keys.size).toBe(4);
    // Order of team members must not matter.
    expect(
      leadScopeCacheKey({ ...team, userIds: [...team.userIds].reverse() }),
    ).toBe(leadScopeCacheKey(team));
  });

  it('round-trips stored scopes and fails closed on garbage', () => {
    expect(parseStoredLeadScope(toStoredLeadScope(own))).toEqual(own);
    expect(parseStoredLeadScope(toStoredLeadScope(team))).toEqual(team);
    // Jobs created before scoping keep their original tenant-wide behaviour.
    expect(parseStoredLeadScope(undefined)).toEqual(SYSTEM_LEAD_SCOPE);

    const garbage = parseStoredLeadScope({ kind: 'team', userIds: 'nope' });
    expect(garbage.kind).toBe('own');
    expect(leadScopeWhere(garbage)).toEqual({
      assignedUserId: '00000000-0000-0000-0000-000000000000',
    });
  });
});
