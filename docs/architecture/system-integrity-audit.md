# CRMPro System Integrity Audit — CRM API ↔ Admin API Alignment

**Date:** 2026-06-29  
**Scope:** Pre-production architecture review of shared-database, dual-API monorepo  
**Auditor role:** Principal backend architect  
**Status:** Findings only — no implementation performed

---

## Project architecture

```text
apps/
  api/          -> CRM API (tenant-facing)
  admin-api/    -> Admin control plane
packages/
  database/     -> shared Prisma schema + migrations + seed
  shared/       -> shared permissions/constants/types
```

**Stack:** NestJS, PostgreSQL, Prisma, BullMQ + Redis, JWT access + refresh, RBAC, S3 storage

Both APIs use `@crmpro/database` for Prisma models.

---

## High-level business model

CRMPro is a B2B SaaS CRM for real estate companies. Two systems:

### 1. Admin API (control plane)

Used by CRMPro internal staff. Responsibilities: platform admins, plans, contracts, tenants, tenant lifecycle, platform audit, platform analytics.

Admin roles: `SUPER_ADMIN`, `SUPPORT`, `BILLING`, `READONLY`.

### 2. CRM API (tenant-facing)

Used by tenant companies. Responsibilities: leads, pipelines, lead sources, files, import/export, analytics, notifications.

Tenant roles: Owner, Manager, Agent.

---

## Section 1 — System health score

| Area | Score | Rationale |
|------|-------|-----------|
| **Schema** | **7/10** | Clean admin/CRM separation; bridge models are intentional but under-constrained |
| **Lifecycle integrity** | **5/10** | Happy-path flows work; races, dead states, and dual plan truth weaken guarantees |
| **Security** | **6/10** | Admin auth is strong; CRM auth gaps, missing RBAC on files, no rate limiting |
| **Observability** | **5/10** | CRM monitoring exists; admin control plane is mostly write-only audit with no explorer |
| **Maintainability** | **5/10** | High drift between provisioning and seed; quotas/plan features duplicated but not centralized |

**Overall launch readiness: ~5.5/10** — safe for internal/staging use; not yet safe as a contract-enforced multi-tenant product without targeted hardening.

---

## Section 2 — Critical issues

Only true production blockers.

### [CRITICAL] Tenant provisioning race on `contractId`

**Issue:** `findProvisionableContract()` runs **outside** the provisioning transaction. Two concurrent `POST /tenants` calls with the same `contractId` can both see `tenantId === null`, create two tenants, and race on `tenantContract.tenantId` — one tenant is orphaned.

**Impact:** Broken "one contract → one tenant" invariant; billing/commercial data can point at the wrong workspace.

**Fix:** Re-validate contract inside `prisma.$transaction` with `SELECT … FOR UPDATE` or conditional update: `UPDATE tenant_contract SET tenantId = ? WHERE id = ? AND tenantId IS NULL AND status = 'ACTIVE'`.

---

### [CRITICAL] Plan quotas largely unenforced in CRM API

**Issue:** Only `maxStorageBytes` is enforced (`FilesService.validateTenantQuota`). `maxLeads`, `maxProjects`, and `maxUsers` are **reported** on admin `GET /tenants/:id/usage` but not checked on create/import paths.

**Impact:** Any tenant can exceed contracted limits indefinitely; plans are commercially meaningless in production.

**Fix:** Shared `@crmpro/shared` or `packages/database` quota service; enforce in `LeadsService.createLead`, `createLeadFromImport`, `ProjectsService.createProject`, and future user-invite flows.

---

### [CRITICAL] `featureFlags` are never enforced in CRM API

**Issue:** Plans store `featureFlags` (analytics, importExport, apiAccess, etc.). Zero references under `apps/api`.

**Impact:** Plan tiers do not gate product behavior; Enterprise vs Starter is cosmetic.

**Fix:** Central plan-entitlement check (guard or service) reading tenant's effective plan (see dual-truth issue below).

---

## Section 3 — High priority issues

Architecture debt / serious bugs.

### [HIGH] Dual source of truth: `Tenant.subscriptionPlanId` vs `TenantContract.planId`

**Issue:** Provisioning sets `Tenant.subscriptionPlanId` from contract once. Contract `planId` can later change on an ACTIVE contract via `PATCH /contracts/:id` without updating the tenant row. CRM reads entitlements from `tenant.subscriptionPlanId`.

**Impact:** Admin contract layer can be bypassed silently; tenant runs on wrong plan limits/features.

**Fix:** Either derive plan from active contract at runtime, or sync on contract plan change + block edits when linked.

---

### [HIGH] No "one ACTIVE contract per tenant" at database level

**Issue:** `assertTenantHasNoActiveContract()` only runs on activate when `tenantId` is already set; no partial unique index.

**Impact:** Data corruption possible via races, manual SQL, or future endpoints.

**Fix:** `CREATE UNIQUE INDEX … ON "TenantContract" ("tenantId") WHERE status = 'ACTIVE' AND "deletedAt" IS NULL`.

---

### [HIGH] Seed/dev tenants bypass contract layer

**Issue:** `seedTenants()` creates `prime-estates` / `sunrise-properties` with direct `subscriptionPlanId`. Contracts are seeded afterward and only one is linked.

**Impact:** Dev/prod parity illusion; tests may pass while production invariants differ.

**Fix:** Seed only via provisioning path, or mark seed tenants explicitly as `legacy_bypass`.

---

### [HIGH] Provisioning ↔ seed drift (operational templates)

| Area | Provisioning | Seed |
|------|--------------|------|
| Lead sources | Manual, Website, Facebook Ads, Referral (4) | + WhatsApp, Call Center, Walk-in (6) |
| Pipeline name | Default Sales Pipeline | Residential Sales |
| Stage 4 | Proposal Sent | Interested |
| `sortOrder` | 0–6 | 1–7 |
| Extra pipeline | None | Commercial Leasing |

**Impact:** New tenants ≠ seeded demo tenants; support/docs/Postman assumptions diverge.

**Fix:** Extract `packages/database/src/tenant-templates/` shared by seed + provisioning.

---

### [HIGH] CRM refresh token reuse not handled like admin

**Issue:** Admin-api on hash mismatch → `TOKEN_REUSE` (CRITICAL) → revoke **all** admin sessions. CRM-api on mismatch → log + `401` only; sessions stay valid.

**Impact:** Stolen refresh token remains usable until expiry if rotation races occur.

**Fix:** Mirror admin pattern in `apps/api` `auth.service.ts` refresh flow.

---

### [HIGH] Files module missing `PermissionsGuard`

**Issue:** `FilesController` uses only `JwtAuthGuard`. No `file.upload` / `file.read` / `file.delete` checks.

**Impact:** Any authenticated tenant user (e.g. Agent) can upload/delete files if they know endpoints — RBAC bypass.

**Fix:** Add `@UseGuards(JwtAuthGuard, PermissionsGuard)` + `@RequirePermission` per route.

---

### [HIGH] Tenant detail shows wrong "contract"

**Issue:** `GET /tenants/:id` loads latest non-archived contract by `createdAt`, not `status === ACTIVE`. Mapper treats it as the tenant contract.

**Impact:** Admin UI/API can show TERMINATED contract as current commercial agreement.

**Fix:** Filter `status: ACTIVE` or expose explicit `primaryContractId`.

---

### [HIGH] `reactivateTenant` has no contract/plan gates

**Issue:** Any non-`ACTIVE` status (including `CANCELLED`, `TRIAL`) → `ACTIVE` with no check for active contract or plan validity.

**Impact:** Reactivated tenants may have no valid commercial backing.

**Fix:** Require linked ACTIVE contract + active plan before reactivate.

---

### [HIGH] ACTIVE contracts are fully editable

**Issue:** `assertEditable` blocks only TERMINATED/archived. Price, plan, dates can change on ACTIVE contracts.

**Impact:** Commercial record mutability undermines audit trail; couples with plan drift above.

**Fix:** Restrict ACTIVE edits to notes/grace period, or version contracts.

---

### [HIGH] Background jobs ignore tenant suspension

**Issue:** Import/export/notification processors (`import.processor.ts`, etc.) process jobs without re-checking `tenant.status`.

**Impact:** Suspended tenant can still complete in-flight imports/exports/notifications after sessions revoked.

**Fix:** Check tenant status at job start; fail/cancel if `SUSPENDED`.

---

### [HIGH] No contract renewal / re-link API

**Issue:** `tenantId` on contract is set only at provisioning. No flow to attach a new ACTIVE contract to an existing tenant after terminate.

**Impact:** Manual ops or raw SQL required for renewals — breaks control-plane model.

**Fix:** Phase 5C-style contract reassignment with single-active invariant.

---

## Section 4 — Medium issues

Improvement opportunities.

| Issue | Detail |
|-------|--------|
| **`EXPIRED` contract status unreachable** | Enum + terminate/archive branches exist; no cron/manual transition |
| **`CANCELLED` tenant status unreachable** | CRM auth blocks it; admin-api never sets it |
| **Plan archive doesn't affect existing tenants** | `isActive: false` blocks new contracts; live tenants keep old `subscriptionPlanId` |
| **Terminate contract doesn't affect tenant** | Tenant stays ACTIVE; CRM access continues |
| **No rate limiting / brute-force protection** | Neither API uses Throttler or similar on login |
| **Admin `AUDIT_READ` permission with no read API** | `AuditModule` is empty scaffold; logs written but not queryable |
| **`PlatformAnalyticsModule` empty** | Permission exists; no implementation |
| **Global owner email uniqueness** | Provisioning rejects cross-tenant duplicate emails; schema allows `@@unique([tenantId, email])` only — product decision undocumented |
| **Denormalized `tenantId` without FK** | `PipelineStage`, `LeadActivity`, `LeadNote`, `FileUploadIntent`, `NotificationPreference` — integrity is app-enforced only |
| **No `(user.tenantId = role.tenantId)` DB constraint** | Wrong role assignment possible via bug/SQL |
| **Slug immutability + soft-delete** | `Tenant.slug @unique` blocks reuse after soft delete (documented MVP tradeoff) |
| **Suspend doesn't block workers** | Complements HIGH job issue; sessions revoked but queues keep running |
| **CRM auth tests missing suspension cases** | Enforcement exists in code but unverified by tests |

---

## Section 5 — Strengths

What is architecturally strong:

1. **Clean control-plane vs product-plane split** — `PlatformAdmin*` models are isolated from CRM `User*` / `Role*` / `Permission*`.
2. **Shared Prisma package** — Single schema/migrations avoids the most common monorepo failure mode.
3. **Contracts abstraction** — `TenantContract` correctly models B2B manual sales (plan ≠ contract ≠ tenant).
4. **Explicit lifecycle endpoints** — No generic `PATCH /tenants/:id`; suspend/reactivate/owner actions are deliberate.
5. **Admin auth is production-grade** — Rotating refresh, session tracking, `TOKEN_REUSE` handling, security events, fingerprint/IP metadata.
6. **CRM tenant suspension is enforced** — Login, refresh, and JWT strategy all check `SUSPENDED` / `CANCELLED`.
7. **Atomic provisioning transaction** — Roles, permissions, owner, lead sources, pipeline created in one TX (modulo pre-TX contract check).
8. **Storage quota enforcement** — `storageUsedBytes` accounting with nullable unlimited plans handled.
9. **RBAC coverage on most CRM modules** — Controllers consistently use `JwtAuthGuard` + `PermissionsGuard` (files excepted).
10. **Audit writes on admin mutations** — Tenant/contract/plan/admin actions produce `AdminAuditLog` entries.

---

## Section 6 — Recommended next actions

Prioritized roadmap.

### P0 — Before production launch

1. Fix provisioning race — in-transaction contract lock + conditional update.
2. Add DB partial unique index — one ACTIVE contract per `tenantId`.
3. Enforce plan quotas in CRM — leads, projects, users (at invite/provision).
4. Enforce `featureFlags` — gate analytics, import/export, etc.
5. Unify plan source of truth — contract-driven entitlements or sync on change.
6. Add `PermissionsGuard` to files routes.
7. CRM refresh token reuse — revoke-all-sessions on reuse detection.

### P1 — Commercial integrity

8. Centralize tenant templates — shared package for roles, lead sources, pipeline stages (eliminate seed/provision drift).
9. Contract renewal/reassignment API — link new ACTIVE contract; terminate old.
10. Fix tenant contract display — ACTIVE-only in `GET /tenants/:id`.
11. Gate reactivate on active contract + plan.
12. Restrict ACTIVE contract edits — or introduce contract versioning.
13. Worker tenant-status checks — cancel/skip jobs for suspended tenants.

### P2 — Operability & security hardening

14. Admin Audit Explorer — implement `AuditModule` read API (`AUDIT_READ`).
15. Login rate limiting — both APIs.
16. `EXPIRED` contract job — or remove dead enum until ready.
17. CRM auth tests — suspension, refresh reuse, cancelled tenant.
18. Platform analytics module — or remove permission until built.

---

## Category deep-dives

### 1. Schema consistency audit

Admin/CRM isolation is sound. Main risks:

- Optional `TenantContract.tenantId`
- Missing composite uniques (one ACTIVE contract per tenant)
- Dual plan fields (`Tenant.subscriptionPlanId` vs `TenantContract.planId`)
- Inconsistent soft-delete (`LeadSource` / `Pipeline` / `Role` hard-delete only)
- Denormalized `tenantId` columns without FK on several models

**Severity summary:** HIGH for contract/tenant constraints; MEDIUM for denormalized columns; LOW for slug reuse after soft delete.

---

### 2. Cross-system lifecycle audit

| Transition | Status |
|------------|--------|
| DRAFT → ACTIVE (contract) | OK |
| ACTIVE → TERMINATED | OK |
| TERMINATED → ACTIVE | Blocked |
| → EXPIRED | **Dead path** |
| Provision requires ACTIVE contract | OK (race weakens) |
| Suspend → CRM blocked | **OK** |
| Suspend → sessions revoked | **OK** |
| Suspend → jobs blocked | **No** |
| Reactivate → sessions restored | N/A (users must re-login) |
| Plan archive → new contracts | Blocked |
| Plan archive → existing tenants | **Unchanged** |
| Terminate contract → tenant access | **Unchanged** |

**Missing invariants:**

- One ACTIVE contract per tenant (app-only, raceable)
- Reactivate requires valid contract
- Contract expiry automation

---

### 3. Auth + RBAC audit

#### Admin API

| Check | Status |
|-------|--------|
| Route guards complete | Yes (business routes) |
| Public endpoints minimal | Yes (`login`, `refresh`) |
| Refresh rotation secure | Yes |
| Token reuse attack handled | Yes (`TOKEN_REUSE` → revoke all) |
| Session revoke coverage | Yes |

#### CRM API

| Check | Status |
|-------|--------|
| Permissions coverage | Mostly complete |
| Missing route guards | **Files controller** |
| Refresh token security | **No reuse escalation** |
| Session validation | Yes |
| Tenant suspension enforcement | **Yes** (login, refresh, JWT) |

**Privilege escalation risks:**

- Files RBAC bypass (any authenticated user)
- Agent-level access to file upload/delete without permission checks

**Stale token access:**

- Suspended tenant: blocked on JWT validation ✓
- Revoked session: blocked ✓
- Refresh token reuse: sessions not bulk-revoked ✗

---

### 4. Provisioning audit

**Provisioning creates (single transaction):**

- Tenant
- Contract link (`tenantContract.tenantId`)
- Roles (Owner, Manager, Agent)
- Role permissions (matches seed intent)
- Owner user
- Lead sources (4)
- Default pipeline + 7 stages

**Partial failure risk:** Pre-transaction contract validation creates TOCTOU race.

**Role permissions:** Match seed for Owner/Manager/Agent.

**Drift vs seed:**

| Area | Match? |
|------|--------|
| Role names | Yes |
| Owner/Manager/Agent permissions | Yes |
| Lead sources | **No** (4 vs 6) |
| Pipeline name | **No** |
| Stage names/order | **No** |
| Extra pipelines | **No** |

---

### 5. Contract ↔ Tenant ↔ Plan integrity audit

**Invariant:** Plan ≠ Contract ≠ Tenant

**Good:** No code path found that sets `tenant.subscriptionPlanId` without going through provisioning.

**Bad:** Contract `planId` can be PATCHed on ACTIVE contracts without updating tenant — indirect bypass of contract layer.

**Bad:** `Tenant.subscriptionPlanId` is a denormalized snapshot, not live contract state.

---

### 6. Usage/quota enforcement audit

| Limit | CRM enforced | Admin observable |
|-------|--------------|------------------|
| `maxStorageBytes` | **Yes** (`FilesService`) | Yes |
| `maxLeads` | **No** | Yes (`GET /tenants/:id/usage`) |
| `maxProjects` | **No** | Yes |
| `maxUsers` | **No** (no user create API yet) | Yes |
| `featureFlags` | **No** | Stored only |

---

### 7. Background jobs audit

**Queues:** import, export, cleanup, notification

| Check | Status |
|-------|--------|
| Tenant suspension impact | **Not checked mid-job** |
| Job retries | Standard BullMQ |
| Stale/orphan jobs | No tenant-status guard on resume |
| Cleanup correctness | Not audited in depth |

**Example:** Suspended tenant with active import job — job can still complete.

---

### 8. Security audit

| Area | Finding |
|------|---------|
| Unsafe admin actions | Lifecycle endpoints are permission-gated |
| Missing audit logs | Writes present on mutations |
| Missing security events | Admin auth has them; CRM auth partial |
| Password reset | Admin owner reset audited; CRM N/A |
| S3 access risks | Tenant-scoped via `FilesService` |
| Privilege escalation | Files controller RBAC gap |
| Impersonation | No impersonation endpoints (good) |
| Rate limiting | **None** |
| Brute-force protection | **None** |

---

### 9. Observability audit

#### Admin API

| Area | Status |
|------|--------|
| Logging coverage | HTTP logging present |
| Audit explorer | **Missing** (`AuditModule` empty) |
| Metrics | **Not implemented** |
| Platform analytics | **Scaffold only** |

#### CRM API

| Area | Status |
|------|--------|
| Monitoring endpoints | Present |
| Health checks | Present |
| Queue visibility | Present |

**Blind spot:** Cannot diagnose tenant-specific admin failures without direct DB access. Audit logs are write-only.

---

### 10. Drift audit

**Highest duplication risk:** `apps/admin-api/src/modules/tenants/constants/tenant-provisioning.constants.ts` vs `packages/database/prisma/seed.ts`

**Correctly centralized:**

- Permission keys in `@crmpro/shared`
- Prisma schema in `@crmpro/database`

**Should move to shared package:**

- Lead source defaults
- Pipeline name + stage definitions
- Role → permission mappings (partially duplicated as literals)
- Plan feature flag checks (not implemented anywhere)
- Quota enforcement logic (only storage implemented)

---

## Known cross-system dependency — resolved

**Question:** When Admin API suspends tenant (`tenant.status = SUSPENDED`), does CRM API auth reject access?

**Answer: Yes — implemented.**

Verified in:

- `apps/api/src/modules/auth/auth.service.ts` — login and `assertUserAndTenantAllowed` on refresh
- `apps/api/src/modules/auth/strategies/jwt.strategy.ts` — every guarded request

Admin suspend also revokes all `UserSession` rows transactionally.

**Remaining gap:** Background workers and quota enforcement are not affected by suspension.

---

## Current Admin API capabilities (audit baseline)

### Auth / RBAC

- Access token + rotating refresh token
- Session tracking, fingerprinting, IP logging
- Security events, audit logs
- Models: `PlatformAdmin`, `AdminSession`, `AdminRole`, `AdminPermission`, `AdminAuditLog`, `AdminSecurityEvent`, `AdminNote`

### Plans

- Starter, Growth, Enterprise, Custom
- Limits: `maxUsers`, `maxLeads`, `maxProjects`, `maxStorageBytes`, `featureFlags`

### Contracts

- `TenantContract` with plan, price, currency, payment method/frequency, discount, grace period, notes, status
- Statuses: DRAFT, ACTIVE, EXPIRED, TERMINATED

### Tenants

**Phase 5A:** list, get, provision (from ACTIVE contract)

**Phase 5B:** suspend/reactivate, update name, update owner, reset owner password, revoke owner sessions, usage endpoint

---

## Current CRM API capabilities (audit baseline)

**Modules:** Auth, Pipelines, Lead Sources, Leads, Developers, Projects, Files, Import Jobs, Export Jobs, Analytics, Notifications, Jobs, Monitoring

**Removed:** Automations, Tasks

**Lead system:** CRUD, stage movement, assignment, notes, activities, attachments, imports, exports

---

## References

- Admin API context: `docs/admin-api/project-context.md`
- Architecture overview: `docs/architecture/overview.md`
- Multitenancy: `docs/architecture/multitenancy.md`
- Permissions: `docs/architecture/permissions.md`
- Schema: `docs/database/schema.md`
