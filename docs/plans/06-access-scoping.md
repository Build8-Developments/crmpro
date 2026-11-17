# Plan 06 — Access Scoping & Teams

**Goal:** agents see only their own leads, managers see their team, owners see everything — enforced in the API on every lead path, analytics and export included.
**Order:** sixth (security first: every later feature builds on the scope).
**Status:** ☑ complete

---

## 1. Teams ✅

- `Team { tenantId, name, leaderUserId?, deletedAt }` and `User.teamId?` (one team per user) — migration `20261117100000_lead_scoping_teams`.
- `apps/api/src/modules/teams`: `GET/POST /teams`, `GET/PATCH/DELETE /teams/:id`, `PUT /teams/:id/members` (replace membership, moves users between teams). Audited (`TEAM_*`).
- Users: `team` on list/detail responses, `teamId` filter, optional `teamId` on create.

**Accept:** a manager-led team can be created and staffed from Settings → Teams.

## 2. Scope permissions ✅

- New keys: `lead.read-team`, `lead.read-all`, `team.read`, `team.manage` (shared catalog, seed array, SQL migration for existing tenants).
- Defaults: Owner all keys; Manager `lead.read-team` + `team.*` (excluded from `lead.read-all`); Agent neither and **loses `lead.assign`**.
- Migration keeps today's behaviour for Owners and custom roles (granted `lead.read-all`), moves system Managers to team scope, removes `lead.assign` from system Agents.

**Accept:** fresh and existing tenants end up with the same grants.

## 3. Enforcement ✅

- `LeadScopeService` + `leadScopeWhere` / `isAssigneeInScope` / `buildLeadScopeSql` / `leadScopeCacheKey` (`apps/api/src/modules/leads/scope`).
- Applied to: leads list/detail/update/create, stage, assignment, notes (incl. note edit/delete by id), timeline, attachments, bulk actions, files list/download/delete/upload-to-lead, exports (scope frozen on the job), import/export job visibility, every analytics endpoint + cache key.
- Out-of-scope → 404. Duplicate warnings mask out-of-scope matches. Without `lead.assign` the creator owns the lead; scoped assigners stay inside their scope.
- Fix: `buildLeadsWhereInput` combines scope/stale/search under `AND` (stale + search used to overwrite each other's `OR`).
- Fix: `lastLoginAt` is now written on login.

**Accept:** isolation specs (`lead-scope.*.spec.ts`, `leads.service.scope.spec.ts`, `lead-assignment.scope.spec.ts`, `export-jobs.service.scope.spec.ts`, `teams.service.spec.ts`) green.

## 4. Web ✅

- Settings → Teams (list, create/edit with leader + member picker, delete) — gated by `team.read` / `team.manage`; settings nav now filters sections by permission.
- Team picker on "New user"; team shown in the users table.
- Leads: assignee filter and "Unassigned" chip hidden for own scope; agent picker in "New lead" only with `lead.assign`; scope-aware duplicate toast.
- Dashboard shows "Showing your leads / your team's leads" from the API's `scope` field.
- `apiClient.put`; new copy lives in `messages/en.json`.

**Accept:** logged in as `agent@primeestates.com` the leads list, dashboard and exports contain only that agent's leads; opening a colleague's lead URL shows not-found.

---

## Out of scope
Per-field masking for in-scope leads, multi-team membership, scoped pipeline stage counts (Plan 07 board).

## Definition of done
Every lead-reading code path takes a `LeadScope`, isolation tests prove it, and the seeded agent/manager/owner see exactly their scope.
