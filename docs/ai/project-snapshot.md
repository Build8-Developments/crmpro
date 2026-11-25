# CRMPro — Project Snapshot

> Condensed handoff document for architects and AI assistants.  
> Last updated: June 2026.

---

## 1. Monorepo Structure

```
crmpro/
├── apps/
│   ├── api/           # Tenant CRM API (NestJS)
│   ├── admin-api/     # Platform admin API (NestJS)
│   ├── web/           # Tenant CRM frontend (Next.js) — scaffold only
│   ├── admin/         # Admin frontend (Next.js) — scaffold only
│   └── website/       # Public website, nomow.app (Next.js) — see docs/website/README.md
├── packages/
│   ├── shared/        # Shared constants, permissions, errors, bootstrap
│   └── database/      # Prisma schema, migrations, seed
├── docker/            # Local compose + production Dockerfiles
└── docs/              # Architecture, product, Postman collections
```

| App | Status |
|-----|--------|
| `apps/api` | Beta-ready backend — full CRM domain, workers, ~164 tests |
| `apps/admin-api` | Functional control plane — tenants, plans, contracts, admins |
| `apps/web` | Scaffold only (placeholder page) |
| `apps/admin` | Scaffold only (placeholder page) |
| `apps/website` | Coming-soon landing page with demo form (added Nov 2026) |

**Tooling:** pnpm workspaces, `concurrently` for multi-app dev.

**Not in repo:** `packages/ui`, `packages/theme` (mentioned in older docs only).

---

## 2. Tech Stack

### CRM API
NestJS, Prisma, PostgreSQL, Redis, BullMQ, JWT + refresh sessions, S3 storage, Swagger.

### Admin API
NestJS, Prisma, PostgreSQL (shared DB), JWT + admin sessions. No workers.

### CRM Web / Admin Web
Next.js 16, React 19, Tailwind 4. No shadcn, no shared package wiring yet.

**API prefix:** `api/v1` on both backends.  
**Deployment:** Docker Compose locally; Dockerfiles for api/web/admin in production folder.

---

## 3. Shared Packages

### `@crmpro/shared`
- Tenant and admin permission catalogs
- Default tenant bootstrap (roles, pipeline, lead sources)
- Global API error contract and mappers
- Lead stage helpers
- Contract grace-period utilities

### `@crmpro/database`
- Single Prisma schema shared by both APIs
- ~23 migrations
- Seed script (demo tenants, plans, users, leads, admin data)
- Re-exports Prisma client

---

## 4. Database Overview

### Platform domain
Platform admins, admin roles/permissions, admin sessions, admin audit, security events, subscription plans, tenant contracts.

### CRM domain
Tenants, users, roles, permissions, sessions, developers, projects, lead sources, pipelines, leads, activities, notes, files, import/export jobs, notifications, audit logs.

### Infra patterns
- Soft delete on most business entities
- Tenant-scoped data with slug-based login
- Job status lifecycle for import/export
- Notification types for lead events, import/export completion, etc.

### Key invariants
- One active contract per tenant (database enforced)
- Email unique per tenant
- Custom roles can be archived (soft delete)
- Notification dedupe keys prevent duplicate in-app alerts on worker retry

### Removed (do not assume present)
Tasks and automation modules were built then removed from schema.

---

## 5. CRM API Modules

| Module | Status | Purpose |
|--------|--------|---------|
| Auth | Stable | Login, refresh, logout, sessions, permissions, profile |
| Users | Stable | User CRUD, role change, deactivate, password reset |
| Roles | Stable | Custom roles, permission editing, archive |
| Leads | Stable | CRUD, assign, move stage, notes, activities, attachments |
| Leads Bulk | Stable | Bulk assign + bulk move stage (max 500) |
| Pipelines | Stable | Pipeline + stage management |
| Lead Sources | Stable | Source catalog CRUD |
| Developers | Stable | Developer catalog CRUD |
| Projects | Stable | Project CRUD linked to developers |
| Files | Stable | Presigned upload, complete, download, delete |
| Import Jobs | Stable | CSV lead import via worker |
| Export Jobs | Stable | Lead CSV export via worker |
| Analytics | Stable | Dashboard aggregations, plan-gated, cached |
| Notifications | Stable | In-app notifications + preferences |
| Audit | Stable | Business audit explorer (read) |
| Monitoring | Stable | Health, jobs health, metrics |

**Worker-only (no HTTP):** cleanup jobs, import/export/notification processors.

### Common infrastructure
Auth guards and RBAC, quota enforcement, plan entitlements, tenant access checks, audit writer, domain event bus, S3 storage, Redis cache, structured logging, global error filter, pagination/query utilities.

### Workers / queues
Import, export, notification delivery, and scheduled cleanup (stale jobs, upload intents, sessions, orphan S3).

---

## 6. CRM API Readiness

**Assessment: Beta Ready**

### Done
Full tenant CRM backend: auth, RBAC, leads workflow, files, import/export, analytics, notifications, audit, user/role management, bulk actions, Postman collection.

### Recently fixed (security/infra)
- Atomic refresh token rotation
- Role assignment privilege escalation protection
- Import/export job claiming (no duplicate processing)
- Stale job reaper (reclaim stuck jobs and requeue)
- Quota race conditions (transactional enforcement)
- Storage quota at upload intent reservation
- Standardized auth response shape (`{ success, data }`)
- Notification idempotency on worker retry

### Known gaps
- No lead archive/delete HTTP API (permission exists)
- No tenant settings or billing CRM endpoints (permissions exist)
- No team invite flow
- Import retry can duplicate leads (no row-level idempotency)
- Trial tenant policy mismatch between auth and workers
- Partial plan entitlement coverage on read/download paths
- No auth rate limiting
- Large god services in analytics, pipelines, leads
- Admin API refresh rotation still not atomic

---

## 7. Admin API

### Modules
| Module | Purpose |
|--------|---------|
| Auth | Admin login, refresh, sessions, security metadata |
| Admins | Platform admin user management + internal notes |
| Plans | Subscription plan templates (limits, features) |
| Contracts | Negotiated commercial terms per tenant |
| Tenants | Create, suspend, provision, owner management, usage |
| Audit | Admin audit log + security events explorer |

**Stub only:** Platform analytics module (not wired).

### Security
Admin sessions with fingerprint and IP metadata, security event logging, token reuse detection (revokes all sessions). Refresh rotation is **not yet atomic**. Auth response shape not yet aligned with CRM `{ success, data }` pattern.

### Readiness
Functional for internal ops. Hardening and analytics still needed.

---

## 8. Frontend Status

### CRM Web (`apps/web`)
Scaffold only. Next.js App Router with placeholder home page. No auth, routing, API client, or CRM screens. Target routes documented in `docs/web/routes.md`.

### Admin Web (`apps/admin`)
Scaffold only. Same minimal setup. Target routes in `docs/admin/routes.md`.

Neither frontend uses shared packages or calls APIs yet.

---

## 9. Current Priorities

1. CRM frontend foundation (auth, shell, API client, permissions)
2. CRM core screens (leads, dashboard, pipelines)
3. Backend gaps: lead archive/delete, tenant settings/billing APIs
4. Admin API hardening (atomic refresh, response shape)
5. Admin frontend (tenants, plans, contracts, audit)
6. Platform analytics implementation
7. Import row idempotency on reclaim
8. Align trial tenant policy across auth and workers

---

## 10. Architectural Decisions

- **Shared database** — both APIs use one Prisma schema and PostgreSQL
- **No admin → tenant API calls** — admin writes directly via Prisma
- **Separate RBAC** — tenant permissions vs admin permissions are independent systems
- **No public signup** — tenants created only via admin provisioning
- **Projects not units** — CRM models real estate projects, not unit inventory (MENA market)
- **Plans vs contracts** — plans are templates; contracts hold negotiated commercial terms
- **No online payments in MVP** — billing is informational only
- **Permissions not in JWT** — reloaded from DB each request
- **Soft delete** on major entities
- **Global error contract** on both APIs
- **Workers only in CRM API**
- **CRM is the product; admin is the control plane**

---

## 11. Open Questions

- Lead detail page vs drawer UX?
- Lead archive API design (status change vs soft delete)?
- Should trial tenants access the CRM?
- Billing module scope for tenant-facing API?
- Team invite flow design?
- Platform analytics metrics and endpoints?
- Import row deduplication strategy on job reclaim?
- Entitlement gating on export download after plan downgrade?
- Auth rate limiting approach?
- Reintroduce tasks or keep activities-only model?

---

## Further Reading

- `docs/ai/project-context.md` — product and architecture intent
- `docs/ai/coding-rules.md` — implementation rules for AI agents
- `docs/postman/README.md` — API testing and error contract
- `docs/web/routes.md` / `docs/admin/routes.md` — intended frontend routes
