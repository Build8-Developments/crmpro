# Project Context

> Evidence-backed onboarding snapshot for CRMPro.
>
> Investigated: 2026-09-10
> Repository: `/Users/seif/code/personal/crmpro`
> Branch: `main`
> HEAD: `b8cc1a6ab8f77d511d7bcc038dfdd162c038077f`
> Upstream state observed: `main...origin/main [ahead 2]`

## Snapshot and scope

This document describes the code and checked-in configuration that were inspected in the current
working tree. It is not a claim that every source file was read, that a deployment exists, or that
the current dirty tree builds. Major claims below are tied to implementation, configuration,
migrations, or inspected commit diffs.

The repository was already dirty when onboarding began:

- unstaged work in both auth modules, including admin refresh-token rotation;
- staged work consolidating worker tenant checks into `TenantAccessService`;
- untracked Redis-backed rate-limit modules in both APIs;
- the pre-existing root `PROJECT_CONTEXT.md` itself was untracked.

The detailed paths are recorded by `git status --short --branch`; the important architectural
effect of that work is summarized under [Current development state](#current-development-state).
Do not discard, restage, or rewrite those changes based on this document.

Onboarding remained read-only except for regenerating this file. I did not install dependencies,
build, lint, test, start containers or applications, migrate or query a database, contact Redis or
S3, or inspect secret values. Local environment files were inspected by variable name only.

The repository instruction in [`AGENTS.md`](AGENTS.md#L1) requires agents to read
[`docs/ai/project-context.md`](docs/ai/project-context.md) first. That document is useful for
product intent, but its repository map and MVP list are stale. Read it for intent, then use this
file for the verified implementation snapshot.

## System overview

CRMPro is a multi-tenant SaaS CRM for real-estate marketing agencies in the MENA region. Its
central product choice is to model client interest in **projects**, not building/unit inventory.
The current Prisma schema has developers, projects, leads, and lead-project interests, but no
building, unit, price-availability, or inventory hierarchy
([`schema.prisma`](packages/database/prisma/schema.prisma#L336-L482)).

There are two actor planes:

- **Tenant CRM:** agency users use `apps/web`, backed by `apps/api`.
- **Platform control plane:** CRMPro operators use `apps/admin`, backed by `apps/admin-api`.

The runtime is a modular monolith split into four processes, not a microservice estate. The two
Nest applications are independently startable, but both directly use the same PostgreSQL schema.
They also share Redis for Socket.IO fan-out; the tenant API additionally uses it for BullMQ and
caching. The only normal API-to-API call is the admin system module reading the tenant API's health
and internal monitoring snapshot
([`system.service.ts`](apps/admin-api/src/modules/system/system.service.ts#L205-L279)).

## Repository map and architecture

The workspace boundary is declared by
[`pnpm-workspace.yaml`](pnpm-workspace.yaml) and orchestrated by
[`turbo.json`](turbo.json):

| Unit | Responsibility | Entry point / evidence |
| --- | --- | --- |
| `apps/api` | Tenant REST API, auth/RBAC, CRM domain, files, jobs, analytics, notifications, audit, support, monitoring, Socket.IO | [`main.ts`](apps/api/src/main.ts#L10-L42), [`app.module.ts`](apps/api/src/app.module.ts#L36-L86) |
| `apps/admin-api` | Platform auth/RBAC, admins, plans, contracts, tenant provisioning and support, analytics, audit/security, system monitoring, Socket.IO | [`main.ts`](apps/admin-api/src/main.ts#L8-L33), [`app.module.ts`](apps/admin-api/src/app.module.ts#L20-L49) |
| `apps/web` | Tenant Next.js 16 App Router UI, 16 page routes in the current tree | [root layout](apps/web/src/app/layout.tsx), [protected layout](apps/web/src/app/%28protected%29/protected-layout-client.tsx) |
| `apps/admin` | Operator Next.js 16 App Router UI, 17 page routes in the current tree | [root layout](apps/admin/src/app/layout.tsx), [protected routes](apps/admin/src/app/%28protected%29) |
| `packages/database` | One Prisma schema, 25 forward migrations, seed, and a one-line Prisma Client re-export | [manifest](packages/database/package.json), [schema](packages/database/prisma/schema.prisma), [entry](packages/database/src/index.ts) |
| `packages/shared` | Tenant/admin permission catalogues, bootstrap defaults, API error contract, Redis config parser, lead and billing helpers | [manifest](packages/shared/package.json), [entry](packages/shared/src/index.ts) |
| `docker` | Local Postgres/Redis/Adminer definitions and empty production Dockerfile placeholders | [local Compose](docker/docker-compose.local.yml), [production directory](docker/production) |
| `docs` | Product intent and older architecture/API snapshots; many implementation claims are stale | [documentation discrepancies](#documentation-discrepancies-and-historical-context) |

The current working tree contains about 1,068 TypeScript/TSX files under `apps/` and
`packages/` (excluding dependencies and build output). That is a scale indicator, not a claim
that all were inspected.

### Runtime topology

```text
Tenant browser                              Operator browser
      | same-origin /api/v1                       | same-origin /api/v1
      v                                           v
apps/web :3001                              apps/admin :3002
      | Next rewrite to :3000                     | Next rewrite to :3100
      v                                           v
apps/api :3000                              apps/admin-api :3100
  | REST /api/v1                                | REST /api/v1
  | Swagger /api/docs                           | no Swagger
  | Socket.IO                                   | Socket.IO
  | four in-process BullMQ workers              | no workers
  |                                              |
  +---------------- PostgreSQL ------------------+
  +------------------- Redis --------------------+
  |
  +-- S3-compatible object storage (presigned direct uploads/downloads)
```

Both frontends rewrite `/api/:path*` to their backend, with
`API_PROXY_TARGET` defaults of ports 3000 and 3100
([`web/next.config.ts`](apps/web/next.config.ts),
[`admin/next.config.ts`](apps/admin/next.config.ts)). There are no Next `route.ts` handlers and
no `middleware.ts` in either app, so these are proxying UIs rather than BFFs.

Socket clients connect directly to a resolved backend URL and receive invalidation signals; the
actual data is re-fetched over HTTP
([`web/use-realtime.ts`](apps/web/src/hooks/use-realtime.ts),
[`admin/use-realtime.ts`](apps/admin/src/hooks/use-realtime.ts)). Both Nest processes use the
Socket.IO Redis adapter with the same default channel namespace
([`api RedisIoAdapter`](apps/api/src/common/adapters/redis-io.adapter.ts#L18-L44),
[`admin RedisIoAdapter`](apps/admin-api/src/common/adapters/redis-io.adapter.ts#L18-L44)).

### Major backend components

`apps/api/src/modules` contains 21 module directories:

- domain/API: auth, users, roles, leads, lead attachments, lead sources, pipelines, developers,
  projects, files, imports, exports, analytics, notifications, audit, support;
- operational: jobs, cleanup, monitoring, realtime;
- public workspace lookup.

Its shared infrastructure lives under `apps/api/src/common`: authentication, tenant access,
quotas, plan entitlements, Prisma, storage, Redis/cache, events, logging, pagination/query helpers,
validation/error handling, and the in-progress rate limiter.

`apps/admin-api/src/modules` contains 11 module directories: auth, admins, plans, contracts,
tenants, audit, platform analytics, search, system, support, and realtime. The admin API has its
own auth/RBAC model; it does not reuse tenant users, roles, sessions, or audit records.

The tenant API registers four BullMQ workers in the HTTP process:
`ImportProcessor`, `ExportProcessor`, `CleanupProcessor`, and `NotificationProcessor`
([`workers.module.ts`](apps/api/src/modules/jobs/workers.module.ts#L13-L30)). There is no separate
worker entry point or independently scalable worker deployable.

### Frontend structure

Both UIs use React 19, Next.js 16 App Router, Tailwind 4, shadcn/Radix-style primitives, TanStack
Query/Table, Zustand, and Sonner. Feature slices generally follow:

```text
features/<feature>/
  api.ts
  hooks.ts
  mutations.ts
  types.ts
  components/
  hooks/ or stores/ or utils/ as needed
```

Route files are usually thin delegators; feature page components own fetching and UI composition.
Queries are gated on authenticated state and use central query-key factories
([`leads/hooks.ts`](apps/web/src/features/leads/hooks.ts#L41-L128)). Mutations normally go through
`useApiMutation`, which standardizes invalidation and toasts
([`use-api-mutation.ts`](apps/web/src/lib/query/use-api-mutation.ts#L37-L76)).

`apps/admin` imports `ADMIN_PERMISSIONS` from `@crmpro/shared`. `apps/web` has no workspace
package dependency and uses permission strings directly, which has already allowed a drift bug
described under [Current work and risks](#current-work-and-risks).

## Representative execution flow

### Manual lead creation

A representative protected write is `POST /api/v1/leads`:

1. Nest's global validation pipe transforms and whitelists the DTO.
2. `JwtAuthGuard` invokes the tenant JWT strategy.
3. The strategy validates token shape/signature/expiry, reloads the user, checks user/tenant/role
   consistency, calls `TenantAccessService`, and verifies the database session is present,
   unrevoked, and unexpired
   ([`jwt.strategy.ts`](apps/api/src/modules/auth/strategies/jwt.strategy.ts#L35-L87)).
4. `PermissionsGuard` loads the user's current database permissions and requires
   `lead.create`
   ([`leads.controller.ts`](apps/api/src/modules/leads/leads.controller.ts#L31-L66)).
5. The controller passes `user.tenantId` and `user.id`; it never accepts tenant ownership from
   the request body.
6. `LeadsService.createLead` validates every related entity in the tenant, normalizes phone/name
   data, and checks for phone duplicates.
7. One transaction locks/checks quota, creates the lead and project interests, and appends
   lead-activity records
   ([`leads.service.ts`](apps/api/src/modules/leads/leads.service.ts#L86-L175)).
8. After commit, a `LeadCreatedEvent` is published for cache/analytics invalidation.

Tenant isolation in this path is explicit in each query, for example
[`LeadAccessService`](apps/api/src/modules/leads/services/lead-access.service.ts#L13-L31). There
is no automatic tenant filter underneath it.

### Lead CSV import

The materially different asynchronous path is:

1. The browser asks for a presigned upload URL, uploads directly to S3, and completes the upload.
   Storage quota is reserved at upload intent and checked again against actual object size
   ([`files.service.ts`](apps/api/src/modules/files/files.service.ts#L143-L304)).
2. `POST /api/v1/import-jobs/leads` creates an `ImportJob`, enqueues its database ID, and writes
   an audit log
   ([`import-jobs.service.ts`](apps/api/src/modules/import-jobs/import-jobs.service.ts#L99-L126)).
3. `ImportProcessor` consumes the BullMQ job in the same API process
   ([`import.processor.ts`](apps/api/src/modules/jobs/processors/import.processor.ts#L25-L89)).
4. In the current staged work, the service rechecks full tenant/billing access, atomically claims
   a pending job with `updateMany`, loads the file, parses rows, and creates each lead through the
   normal tenant/quota rules
   ([`import-jobs.service.ts`](apps/api/src/modules/import-jobs/import-jobs.service.ts#L129-L178)).
5. Final database status is `COMPLETED`, `PARTIAL_SUCCESS`, or `FAILED`; completion publishes a
   domain event and may enqueue an in-app notification.

The CSV parser uses a whole-buffer synchronous parse and rows are handled sequentially. Import
recovery has no row-level checkpoint or import idempotency key; a stale-job replay starts again
from row zero and relies on tenant-wide phone duplicate detection.

### Tenant provisioning

`POST /api/v1/tenants` on the admin plane is the authoritative onboarding path:

1. Fast-fail checks validate slug, owner email, and contract.
2. The owner password is hashed before the transaction.
3. Inside one transaction, the contract row is selected `FOR UPDATE` and revalidated.
4. The tenant is created as `ACTIVE`, the contract is conditionally linked, default Owner /
   Manager / Agent roles and permissions are created, then the owner user, default lead sources,
   default pipeline/stages, and admin audit record are created
   ([`tenant-provisioning.service.ts`](apps/admin-api/src/modules/tenants/services/tenant-provisioning.service.ts#L38-L96),
   [contract lock](apps/admin-api/src/modules/tenants/services/tenant-provisioning.service.ts#L151-L217),
   [bootstrap](apps/admin-api/src/modules/tenants/services/tenant-provisioning.service.ts#L272-L416)).

This is transactional and protects one-contract/one-tenant provisioning races. There is no public
tenant signup endpoint.

## Development and configuration

### Toolchain

- pnpm `11.22.0` is pinned in the root manifest.
- Turborepo `2.10.11` defines `build`, `lint`, `dev`, and `start`; there is no root/test
  task.
- Both APIs are NestJS 11 on Express.
- Both UIs use Next.js `16.2.9`, React `19.2.4`, and Tailwind 4.
- Prisma Client/CLI/adapter are `^7.10.0`; the APIs use `@prisma/adapter-pg` over a `pg.Pool`
  ([tenant Prisma service](apps/api/src/common/prisma/prisma.service.ts#L14-L24)).

The checked-in commands are in [root `package.json`](package.json) and the package manifests.
Common commands discovered, but **not executed during this onboarding**, are:

```bash
pnpm install
pnpm dev:all
pnpm dev:web-stack
pnpm dev:admin-stack
pnpm dev:api
pnpm dev:admin-api
pnpm build
pnpm lint
pnpm --filter api test
pnpm --filter admin-api test
pnpm db:generate
pnpm db:migrate
pnpm db:deploy
pnpm db:seed
```

Important command behavior:

- both workspace packages resolve imports from `dist`, so they must be generated/built first;
- API `prebuild`, `prestart`, and `prestart:dev` scripts build both shared packages;
- Turbo `dev` depends on upstream builds;
- both backend `lint` scripts include `--fix` and therefore modify files;
- there is no dedicated `typecheck` script; type checking is mainly a build side effect;
- every Prisma command loads `apps/api/.env`, even when initiated for admin work
  ([database manifest](packages/database/package.json#L13-L22),
  [Prisma config](packages/database/prisma.config.ts#L1-L14));
- `db:reset` is destructive and runs the seed;
- `dev:admin-api-stack` calls `concurrently`, but no manifest or lockfile entry declares it;
- `apps/api` exposes `test:e2e`, but its referenced `test/jest-e2e.json` and entire test
  directory are absent.

### Configuration loading

Both backends use global `ConfigModule.forRoot` with a mapping function and Joi boot validation
([tenant app module](apps/api/src/app.module.ts#L36-L42),
[admin app module](apps/admin-api/src/app.module.ts#L20-L26)). The current HEAD explicitly fails
closed for missing Redis configuration and empty CORS allowlists
([`b8cc1a6`](#documentation-discrepancies-and-historical-context)).

Required tenant API settings:

- `DATABASE_URL`;
- `REDIS_URL` or `REDIS_HOST` (optional explicit port/password);
- `JWT_ACCESS_SECRET`, `CORS_ORIGINS`;
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`.

The tenant API also supports access/refresh lifetimes, cross-origin refresh-cookie behavior, Bull
queue/concurrency/retry settings, cleanup schedules, logging switches, monitoring key, analytics
and notification cache TTLs, and an optional S3 endpoint. The authoritative list and defaults are
[`env.validation.ts`](apps/api/src/config/env.validation.ts) and
[`configuration.ts`](apps/api/src/config/configuration.ts), not the example alone.

Required admin API settings:

- `DATABASE_URL`;
- `REDIS_URL` or `REDIS_HOST`;
- `JWT_ACCESS_SECRET`, `CORS_ORIGINS`.

It also accepts tenant API URL/internal monitoring key, stuck-job timeout, access/refresh
lifetimes, and API version
([`admin env.validation.ts`](apps/admin-api/src/config/env.validation.ts),
[`admin configuration.ts`](apps/admin-api/src/config/configuration.ts)).

Frontend settings are `NEXT_PUBLIC_API_URL`, `API_PROXY_TARGET`, and
`NEXT_PUBLIC_APP_ENV`. The live source additionally reads the legacy name
`NEXT_PUBLIC_SSE_URL` as the preferred Socket.IO URL, even though SSE was removed.

Local ignored files exist for both APIs and both frontends. Values were not read. Names-only
inspection found:

- the admin API local file still declares obsolete `JWT_REFRESH_SECRET`, which current source
  does not validate or use;
- both frontend local files declare `NEXT_PUBLIC_SSE_URL`;
- the admin frontend local file does not declare `API_PROXY_TARGET`, so the checked-in default
  applies.

Only the four `.env.example` files are tracked. A high-signal scan of current tracked non-example
files found no AWS access-key ID, common GitHub/OpenAI token prefix, or private-key header. This is
not a full secret audit of Git history.

## Infrastructure and persistence

### Checked-in infrastructure

[`docker/docker-compose.local.yml`](docker/docker-compose.local.yml) defines:

- PostgreSQL 17 with a named volume;
- Redis 8 with AOF enabled and a named volume;
- Adminer;
- one bridge network.

It does **not** define any application container, a worker container, or an S3/MinIO service.
Because Redis carries BullMQ queues as well as caches and Socket.IO pub/sub, it is stateful
application infrastructure; flushing it can destroy queued/repeatable job state.

The Compose file requires six interpolation variables with no checked-in defaults:
`POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT`, `REDIS_PORT`, and
`ADMINER_PORT`. Commit `b3e8566` removed the former `docker/env`; a fresh clone therefore
cannot use the root `docker:up` command without supplying them. The Postgres healthcheck also
uses the host-facing `POSTGRES_PORT` inside the container, so it is incorrect whenever the host
port is not 5432.

All three files under `docker/production/` are zero bytes, there is no admin-api Dockerfile,
production Compose file, Kubernetes manifest, Terraform, or CI/CD configuration. Checked-in
deployment material is therefore scaffolding, not evidence of a live or reproducible deployment.

### Database model

The declared PostgreSQL schema has 35 models, 22 enums, and 25 Prisma migrations. Both APIs import
the same generated client from `@crmpro/database`; there is no duplicate admin schema.

Conceptually:

```text
Platform/global
  SubscriptionPlan -> TenantContract -> Tenant
  PlatformAdmin -> AdminRole -> AdminPermission
  PlatformAdmin -> AdminSession / AdminAuditLog / AdminSecurityEvent / AdminNote

Tenant-scoped
  Tenant
    -> Role -> RolePermission -> Permission
    -> User -> UserSession
    -> Developer -> Project
    -> LeadSource
    -> Pipeline -> PipelineStage
    -> Lead -> LeadProjectInterest -> Project
            -> LeadActivity
            -> LeadNote
            -> FileAsset
    -> FileUploadIntent / ImportJob / ExportJob
    -> Notification / NotificationPreference
    -> AuditLog / TenantNote
    -> SupportConversation -> SupportMessage
```

The schema uses one shared database and logical row scoping by `tenantId`, not schema-per-tenant
and not Postgres row-level security. The Prisma extension only logs slow queries
([`prisma-extension.factory.ts`](apps/api/src/common/prisma/prisma-extension.factory.ts#L38-L58));
it does not inject tenant filters.

Consequential constraints:

- `User` email is unique per tenant; tenant slug is globally unique.
- Role names, developers, projects, lead sources, and pipeline names are tenant-unique.
- phone duplicate detection is an application policy backed by indexes, not a unique constraint.
- `Notification(tenantId, dedupeKey)` is unique when a dedupe key is supplied.
- one active non-deleted contract per tenant is enforced by a partial unique index in
  [migration `20260630180000`](packages/database/prisma/migrations/20260630180000_one_active_contract_per_tenant/migration.sql),
  not representable in the Prisma schema.
- several hot child tables carry denormalized `tenantId` without a Tenant foreign key; their
  consistency is application-enforced.
- soft deletion is inconsistent. For example, Tenant and Role soft-delete, but their unique
  slug/name constraints are not partial, so those identifiers cannot be reused after soft delete.

Migrations are forward-only Prisma migrations. A running database was not inspected. In
particular, this onboarding does not prove that any environment has all 25 migrations or the raw
partial index applied.

The seed is large and creates demo tenant and platform data with fixed credentials. It has no
`NODE_ENV` safety guard and prints those credentials. Never run it against a non-disposable
database merely because the command is available
([`seed.ts`](packages/database/prisma/seed.ts#L1677-L1746)).

### Object storage

The tenant API requires S3-compatible configuration at boot. Upload/download URLs are presigned,
so browser file bytes do not normally pass through Nest. Object keys are tenant-prefixed and
validated on completion. Export files are server-generated and uploaded by the API.

No local object-storage service is defined in Compose, and the existence of AWS configuration does
not establish a production bucket, lifecycle policy, encryption policy, or backup/retention setup.

## Authentication, authorization, and API conventions

### Identity and sessions

Both planes use short-lived signed JWT access tokens plus database-backed, revocable sessions.
Both refresh tokens are opaque `<session id>.<random secret>` values whose secret is Argon2-hashed
in the session row
([`tenant token.service.ts`](apps/api/src/modules/auth/token.service.ts#L21-L63),
[`admin token.service.ts`](apps/admin-api/src/modules/auth/token.service.ts#L19-L64)).

| Concern | Tenant plane | Admin plane |
| --- | --- | --- |
| Access token | JWT with user, tenant, role, session IDs | JWT with admin, role, session IDs |
| Refresh transport | `crm_refresh` httpOnly cookie scoped to `/api/v1/auth` | JSON response/request body |
| Frontend refresh storage | cookie, inaccessible to JS | `localStorage` |
| Refresh lifetime default | 7 days | 30 days |
| Rotation | compare-and-swap at HEAD | compare-and-swap only in current unstaged work; HEAD was unconditional |
| Bad-hash reuse | reject/log; does not revoke all sessions | logs critical reuse and revokes all admin sessions |
| Request revocation | database session checked on every request | database session checked on every request |

The tenant frontend keeps only the access token, user, and permissions in an in-memory Zustand
store and serializes concurrent refresh attempts
([`web client.ts`](apps/web/src/lib/api/client.ts#L45-L84)). The admin frontend has a special
auth-response parser because admin auth tokens are top-level rather than under `data`, and stores
the refresh token in localStorage
([`admin client.ts`](apps/admin/src/lib/api/client.ts),
[`refresh-token.ts`](apps/admin/src/lib/api/refresh-token.ts)).

### Authorization and tenant isolation

Tenant and platform permissions are separate catalogues: 52 tenant keys and 16 admin keys in
[`permissions.ts`](packages/shared/src/auth/permissions.ts). Tenant roles are dynamic database
rows; Owner, Manager, and Agent are provisioning defaults, not authorization identities.

Normal tenant controllers use `JwtAuthGuard` plus `PermissionsGuard` and route-level
`@RequirePermission`. Admin controllers use their separate JWT/admin-permissions guards.
Permissions are reloaded from the database, not embedded in access JWTs. Both permission guards
allow a route when it has no permission metadata, so omission of the decorator is security
significant
([`PermissionsGuard`](apps/api/src/common/auth/guards/permissions.guard.ts#L20-L55),
[`AdminPermissionsGuard`](apps/admin-api/src/common/auth/guards/admin-permissions.guard.ts#L23-L70)).

Plan features are separately enforced by `PlanEntitlementGuard`. Analytics is class-gated;
import/export creation is gated by the `importExport` feature. The guard also allows routes with
no plan metadata
([`plan-entitlement.guard.ts`](apps/api/src/common/entitlements/guards/plan-entitlement.guard.ts#L19-L43)).

Tenant identity must come from the validated user context. The established service convention is
to pass `tenantId` explicitly and include it in every tenant-owned query. This is effective only
when followed consistently; there is no RLS, tenant-aware repository, or Prisma middleware as a
structural backstop.

### Realtime trust boundary

HTTP authentication is database-backed and revocable. WebSocket authentication is weaker: both
gateways call `jwtService.verifyAsync` and join rooms directly, without reloading the user/admin,
checking the session, tenant access, or current role
([`tenant gateway`](apps/api/src/modules/realtime/realtime.gateway.ts#L29-L46),
[`admin gateway`](apps/admin-api/src/modules/realtime/realtime.gateway.ts#L29-L47)).
The gateways also declare `origin: true`, rather than using the HTTP CORS allowlist.

Notifications and support messages publish in-process domain events after database writes. The
tenant realtime service converts them into Socket.IO invalidations. Notification publication was
wired in commit `43ae413`
([`in-app-notification.channel.ts`](apps/api/src/modules/notifications/channels/in-app-notification.channel.ts#L18-L59),
[`realtime.service.ts`](apps/api/src/modules/realtime/realtime.service.ts#L17-L49)).
Socket.IO's Redis adapter fans those room emissions across API processes, but the domain event bus
itself is in-process and non-durable.

### HTTP API conventions

Both backends use REST/JSON and the global `/api/v1` prefix. The tenant API exposes Swagger at
`/api/docs`; the admin API has no Swagger dependency or setup.

The normal success envelope is:

```json
{ "success": true, "data": {} }
```

Paginated lists nest `items` and `pagination` under `data`
([`paginated-response.type.ts`](apps/api/src/common/pagination/types/paginated-response.type.ts),
[`pagination.util.ts`](apps/api/src/common/pagination/utils/pagination.util.ts)).

Both APIs normalize exceptions through a global filter and shared mapper:

```json
{
  "success": false,
  "error": { "code": "FORBIDDEN", "message": "...", "details": null }
}
```

The shared mapper handles HTTP exceptions and selected Prisma error codes without exposing
unexpected exception internals
([`error-mapper.ts`](packages/shared/src/errors/error-mapper.ts#L16-L143)).
Admin login/refresh are deliberate exceptions to the normal success envelope: their tokens are at
the top level.

Both APIs use class-validator/class-transformer. The tenant API silently strips unknown properties;
the admin API additionally sets `forbidNonWhitelisted: true`
([`tenant validation`](apps/api/src/common/filters/validation-pipe.config.ts#L9-L22),
[`admin validation`](apps/admin-api/src/common/filters/validation-pipe.config.ts#L9-L24)).

Monitoring routes in `apps/api` are under the global prefix:
`/api/v1/health`, `/api/v1/jobs/health`, `/api/v1/metrics`, and
`/api/v1/internal/monitoring/snapshot`
([`monitoring.controller.ts`](apps/api/src/modules/monitoring/monitoring.controller.ts)).
The internal snapshot has a shared-key guard; public health is unauthenticated and performs
Postgres, Redis, storage, queue, and scheduler checks.

## Tests and verification

The current working tree contains:

- 64 tenant API spec files;
- 16 admin API spec files;
- approximately 283 textual `it(`/`test(` cases;
- no frontend, shared-package, or database-package tests;
- no integration test harness, browser/E2E suite, testcontainers setup, or current
  `jest-e2e.json`;
- no CI definition.

Four spec files belong to the untracked rate-limit work, and a staged tenant-status spec deletion
changes counts relative to HEAD. At HEAD there are 63 tenant API and 14 admin API spec files.

The backend tests are Jest/ts-jest unit tests with mocked Prisma and collaborators. Representative
coverage includes tenant refresh rotation, tenant access/grace windows, quota locking, error
mapping, notification idempotency, job claiming, analytics queries, provisioning, contracts, and
audit. The latest committed notification fix (`43ae413`) states that it established a green full
suite, but that statement was not independently reproduced here and the tree has changed since.

The explicit isolation cases required by
[`docs/architecture/multitenancy.md`](docs/architecture/multitenancy.md#L564-L598) remain thin:
there are mock-level assertions for some reads/cache keys, but no integration tests proving
read/update/delete/import/cache isolation against a real database. The central lead access service
has no direct spec. Given convention-based tenant scoping, this is a material gap.

No quality command was run during onboarding because builds, tests, lint, and dependency setup can
write generated/cache files, and `lint` explicitly fixes source files. Therefore:

- current build status: **unverified**;
- current test status: **unverified**;
- current lint status: **unverified**;
- current database/runtime behavior: **unverified**.

## Conventions for future changes

Written rules come primarily from [`docs/ai/coding-rules.md`](docs/ai/coding-rules.md), but source
patterns are the deciding evidence when the docs disagree.

Observed backend conventions:

- kebab-case files, PascalCase classes, camelCase methods;
- Nest modules with thin controllers and service-owned rules;
- DTOs at boundaries with class-validator decorators;
- Prisma is the repository layer; there is no separate `repositories/` abstraction;
- pass tenant ID from `@CurrentUser()`, never from body/query/header ownership;
- scope every tenant query and related-entity validation;
- use `PERMISSIONS.X` / `ADMIN_PERMISSIONS.X`, never role names;
- use transactions for multi-step writes and pass the transaction client into quota/audit helpers;
- write audit records in the business transaction where consistency matters;
- publish in-process domain events after commit to avoid phantom notifications;
- map errors through Nest exceptions/shared error contracts rather than ad hoc bodies.

Observed frontend conventions:

- route files delegate to feature page components;
- feature-local `api.ts`, hooks, mutations, types, components, stores, and URL-state helpers;
- TanStack Query keys come from central factories;
- mutation success invalidates related feature keys and surfaces toasts;
- tables use URL/state-controlled search, filters, sorting, and pagination;
- Tailwind 4 tokens live in `globals.css`; there is no `packages/theme`;
- permission checks are UX gates only; backend authorization remains mandatory.

Important maintenance constraints:

- do not simplify the duplicated
  [`prisma-adapter.factory.ts`](apps/api/src/common/prisma/prisma-adapter.factory.ts). It
  deliberately serializes queries on a transaction's pinned `pg` client for Prisma/pg
  compatibility while leaving top-level pool concurrency intact;
- do not treat Redis as disposable cache state; it contains BullMQ data;
- do not use `prisma db push` casually. The one-active-contract partial index exists only in raw
  migration SQL and is absent from the Prisma data model;
- do not run `db:reset` or the seed without validating the target database;
- expect `pnpm lint` to modify files;
- preserve the current staged/unstaged work and inspect both index and worktree diffs before
  editing overlapping auth, tenant-access, job, notification, or rate-limit code.

## Documentation discrepancies and historical context

### Material documentation discrepancies

The docs establish valuable product intent—projects instead of units, backend-owned business
logic, dynamic roles, tenant isolation—but are not a reliable current implementation map.

- [`docs/ai/project-context.md`](docs/ai/project-context.md#L142-L211) and
  [`docs/architecture/overview.md`](docs/architecture/overview.md#L110-L229) describe
  `apps/crm`, a single API, and `packages/theme`. Actual paths are `apps/web`, two APIs, and no
  theme package.
- The same AI context lists workflow automation, tasks/calendar, settings, and billing overview as
  current MVP modules
  ([lines 286-307](docs/ai/project-context.md#L286-L307)). Automation/tasks were removed; there is
  no tenant settings route or tenant billing API.
- [`docs/ai/project-snapshot.md`](docs/ai/project-snapshot.md#L8-L49) says both frontends are
  scaffolds and there is no shadcn wiring. Both are substantial applications with component
  systems and live API clients.
- [`docs/admin-api/project-context.md`](docs/admin-api/project-context.md#L464-L486) says admin API
  implementation has not started. The current admin API has 11 modules and 13 controllers.
- [`docs/web/current-web-state.md`](docs/web/current-web-state.md#L120-L156) says every protected
  page, auth, permissions, notifications, and API data are placeholders. Only lead sources remains
  a placeholder page; settings is now an orphaned feature with no route.
- [`docs/architecture/system-integrity-audit.md`](docs/architecture/system-integrity-audit.md#L59-L209)
  is a 2026-06-29 findings snapshot. Several issues it calls critical/high are now fixed:
  contract provisioning locking, quota and entitlement enforcement, active-contract uniqueness,
  FilesController RBAC, worker tenant checks, and contract-plan synchronization. Other issues
  remain; do not mark the entire audit resolved.
- [`docs/api/conventions.md`](docs/api/conventions.md) documents a pagination envelope different
  from the implementation. [`docs/postman/README.md`](docs/postman/README.md#L402-L425) has the
  current list shape, but its claim that monitoring routes omit `/api/v1` is wrong
  ([lines 343-353](docs/postman/README.md#L343-L353)).
- [`docs/database/schema.md`](docs/database/schema.md) predates the contracts, notifications,
  support, and tenant-note domains. `docs/database/conventions.md` is empty.
- There is no general repository/app README; the only README is under `docs/postman`.

No document under `docs/` has been updated after 2026-07-01, while code changed through
2026-09-09. `AGENTS.md` still routes agents only to the stale AI context.

### Consequential history

The following findings were checked against commit diffs, not inferred only from messages:

| Commit | Verified change | Why it matters now |
| --- | --- | --- |
| `9017031` | Removed the task and automation modules, services, schema surface, and queues shortly after they were introduced | Do not infer tasks/automation from stale docs or surviving enum values |
| `87aaca5` | Moved Prisma schema/migrations/seed from `apps/api` into `@crmpro/database` and rewired imports/scripts | One database package is the schema source for both APIs |
| `b393554` | Deleted scaffold READMEs and the API E2E files while leaving the `test:e2e` script | Explains the permanently broken E2E command |
| `b3e8566` | Deleted `docker/env` | Compose interpolation lost its checked-in source |
| `c03d891` | Added the substantial admin UI/control-plane operations, support chat, platform analytics, and system monitoring | Refutes “admin is a scaffold/stub” docs |
| `9d8c0e1` | Replaced SSE with Socket.IO/Redis and also deleted the tenant settings route | Explains legacy `NEXT_PUBLIC_SSE_URL` and the orphaned settings feature |
| `d6e82e0` | Upgraded Prisma, added the transaction adapter workaround, and moved dependency build ordering into Turbo | The proxy wrapper and dev task graph are intentional |
| `43ae413` | Published notification-created events after commit and updated failing test expectations | The old context's “dead realtime notification path” claim is now false |
| `b8cc1a6` | Centralized Redis parsing and made Redis, CORS, and refresh-cookie configuration fail closed | Older CORS/Redis defect descriptions are now false |

Commit messages in this repository can be broader or narrower than the diff. For example, the
commit that removed `.gitignore` files also created the empty Docker scaffolding, and two
2026-08-22 commits share the same generic refactor title while changing different subsystems.
Inspect diffs before attributing rationale.

## Current development state

At investigation start, `main` contained 57 commits from `aee0e42` (2026-06-25) through
`b8cc1a6` (2026-09-09), and was two commits ahead of `origin/main`.

The two local commits after the previous onboarding snapshot are:

- `43ae413`: completed realtime notification delivery and adjusted the unit-test baseline;
- `b8cc1a6`: hardened Redis/CORS/cookie configuration and removed dead config surface.

Concurrent uncommitted work changes behavior further:

1. **Tenant access consolidation (staged):** removes `TenantStatusService`, routes import/export/
   notification worker checks through `TenantAccessService`, introduces a typed inactive
   exception, allows `TRIAL` and never-contracted tenants, and applies contract grace checks to
   workers. This is a policy change, not only refactoring.
2. **Admin refresh rotation (unstaged):** replaces unconditional session update with a
   compare-and-swap and adds lost-race tests. The current file has the safer behavior, but it is not
   committed and was not run here.
3. **Auth rate limiting (partly untracked/unstaged):** both APIs have duplicated Redis/Lua limiter
   implementations and tests. The admin login/refresh controller uses the guard; the tenant
   controller currently does not. Both config files lack the claimed `app.name` and
   `rateLimit.*` mappings, so defaults are used. Treat this as incomplete work until compiled,
   tested, and reconciled.

## Current work and risks

### Confirmed findings

1. **Tenant isolation has no structural backstop.** No RLS, automatic Prisma tenant extension, or
   integration isolation suite exists. A missed `tenantId` predicate can become a cross-tenant
   leak.
2. **WebSocket authorization is weaker than HTTP.** Gateways verify JWT signature/expiry only,
   skip database session/user/tenant checks, and allow any origin. The admin typing event also
   trusts a client-supplied user ID.
3. **Frontend protection is client-only and mostly navigation-only.** Protected layouts redirect
   unauthenticated users, while `canAccessRoute` is used in sidebar/command/quick-action filtering,
   not as a general page guard. Direct URLs render and rely on backend 403 responses.
4. **The admin refresh token is kept in localStorage for 30 days by default.** It is readable by
   injected JavaScript on the higher-privilege plane. The current rotation race fix does not change
   that storage model.
5. **`/settings` is a live missing route with an orphaned implementation.**
   Navigation/topbar code still targets it, and
   [`SettingsPage`](apps/web/src/features/settings/components/settings-page.tsx#L13) exists, but
   `apps/web/src/app/(protected)/settings/page.tsx` does not.
6. **Lead sources UI is both hidden and unfinished.**
   [route config](apps/web/src/config/routes.ts#L85-L92) uses
   `lead_source.read`, while the backend key is `lead-source.read`; exact-set comparison hides
   the nav entry for every normal role. The route itself renders the only remaining
   [`PagePlaceholder`](apps/web/src/app/%28protected%29/lead-sources/page.tsx).
7. **No production packaging or CI exists.** Production Dockerfiles are empty, admin-api has none,
   and no workflow runs builds/tests/lint.
8. **Test coverage stops at mocked backend units.** No frontend, integration, database, migration,
   or E2E verification covers the actual trust boundaries.
9. **Local bootstrap is not reproducible from tracked files.** Compose variables are missing,
   there is no local S3 service, and the Postgres healthcheck confuses host/container ports.
10. **The seed is unsafe for a non-disposable target.** It has no environment guard and creates
    fixed, printed tenant and platform credentials.
11. **Server-generated file upload precedes quota/DB commit.**
    [`createServerGeneratedFile`](apps/api/src/modules/files/files.service.ts#L352-L410) uploads to
    S3 before the quota transaction; quota or database failure leaves an orphan for later cleanup.
12. **Stale import replay is not row-idempotent.** A recovered job can reprocess from row zero;
    phone duplicate detection prevents some duplicate rows but can distort success/failure totals.
13. **Schema surface overstates implementation.** Task-related activity/notification enum values
    remain after task deletion, and export enums advertise projects/developers/activities plus
    XLSX/PDF while the HTTP export path currently exposes lead CSV only.
14. **Guard metadata is allow-by-default.** Forgetting `@RequirePermission` or
    `@RequirePlanFeature` leaves an authenticated route without that check. No global auth guard
    exists.
15. **Unauthenticated health is an active dependency probe.** Each request checks multiple
    backends, including object storage; this may be an amplification/availability concern.
16. **Code is duplicated across planes.** The Prisma adapter workaround and many frontend
    primitives/query helpers exist twice, increasing drift risk. Duplication has already left stale
    admin comments/defaults and legacy SSE naming.
17. **Repository clutter remains.** Four unreferenced one-off files sit at `apps/api` root,
    stale `.gitkeep` files remain in populated directories, and a committed
    `apps/web/tsconfig.tsbuildinfo` build artifact is present.

### Suspected concerns requiring verification

- **Prisma drift risk:** because the one-active-contract index exists only in raw SQL,
  `prisma db push` or a generated drift migration may propose dropping it. Verify with
  `prisma migrate diff` against a disposable fully migrated database before using those paths.
- **Provisioning owner-email race:** the application checks owner email globally before the
  transaction, while the database uniqueness constraint is only `(tenantId, email)`. A real
  concurrency test would establish whether the intended global rule can be violated.
- **Current WIP health:** the staged/unstaged tenant-access, refresh, and rate-limit changes may
  have compile, wiring, or behavior gaps. Only a clean review plus targeted tests can resolve this.
- **Operational claims:** backup, restore, deployment, S3 lifecycle, production observability,
  scaling, and live migration state are unverified because no environment/IaC evidence exists.

## Coverage and open questions

### Investigation phase coverage

| Phase | Coverage |
| --- | --- |
| Boundary/current state | Confirmed root, branch, HEAD, upstream relation, history count, and dirty index/worktree |
| Reconnaissance | Enumerated maintained roots, entry points, controllers, page routes, tests, hidden config names, and infra definitions |
| Documentation archaeology | Read primary AI context first; inspected architecture, product, API, admin, web, database, Postman, and prior context material |
| Application architecture | Traced all process entry points/module registration and representative frontend/backend boundaries |
| Data flows | Traced manual lead creation, CSV import, tenant provisioning, auth/session, notification/support realtime, and monitoring |
| Dependencies/tooling | Read root/workspace/app/package manifests and targeted source for architecture-shaping dependencies |
| Environment/configuration | Read examples, Joi schemas, mapping functions, and names-only local config; secret values intentionally unverified |
| Docker/infrastructure | Inspected local Compose and production placeholders; no runtime/container state queried |
| Database | Inspected the full schema shape, migration inventory, consequential raw migrations, Prisma services, and selected queries; live DB unverified |
| Authentication/authorization | Traced both HTTP auth/session/RBAC paths and Socket.IO handshake boundaries |
| API conventions | Enumerated controller routes and inspected validation, pagination, errors, version prefix, and Swagger setup |
| Testing | Inspected scripts/config and representative specs; no test/build/lint command executed |
| Git history | Inspected bounded history and diffs for consequential auth, database, realtime, admin, Docker, and scope decisions |
| Conventions | Cross-checked written rules against representative backend and frontend implementations |
| Debt/risk | Recorded confirmed findings separately from concerns that require runtime/concurrency/drift evidence |
| Cross-check/write/verify | Major claims cross-checked before writing; final link/secret/status audit still recorded below |

### Open product/architecture questions

- Is `TRIAL` access without a contract the intended durable policy, or only a convenience for
  tenants created outside provisioning?
- Should platform refresh tokens move to an httpOnly same-origin cookie?
- Should WebSocket handshakes reuse the full HTTP identity/session/tenant checks?
- Is global owner-email uniqueness a business invariant? If so, it needs database-safe enforcement.
- Should tenant settings/billing remain out of scope, or should the orphaned settings page be
  restored and backed by explicit APIs?
- Should tasks remain removed? If yes, should legacy task enum/preference values be migrated away?
- Is Redis intentionally shared for durable queues, transient caches, Socket.IO, and auth
  throttling, or should workloads be separated?
- What is the production deployment, backup/restore, object-storage lifecycle, and CI strategy?

### Explicit limits

- No secret values were read or reproduced.
- No current runtime, network service, container, database, Redis, S3 bucket, or browser was
  inspected.
- No dependency/lockfile was read line by line.
- Large analytics, pipeline, import/export, seed, and UI internals were followed selectively along
  representative paths, not exhaustively.
- Product documents and route specifications were used for intent and discrepancy checks, not
  treated as proof of behavior.
- Git history review was targeted, not a line-by-line audit of all 57 commits.
- The current tree is concurrent work; conclusions spanning committed and uncommitted code are
  labeled accordingly.

## Verification record

Before delivery:

- all relative Markdown file references were checked against the working tree;
- a targeted secret/token/private-key scan found no credential material in this file;
- trailing whitespace was checked and removed;
- the final Git status was compared with the initial status, accounting for the pre-existing dirty
  files; this onboarding changed only the already-untracked `PROJECT_CONTEXT.md`;
- no test, build, lint, runtime, service, or migration command was executed or presented as
  executed evidence.
