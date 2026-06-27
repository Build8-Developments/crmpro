# CRMPro Postman

Local API testing collection for auth, pipelines, lead sources, developers, projects, and leads.

## Files

| File | Purpose |
| --- | --- |
| `crmpro-auth.postman_collection.json` | Requests, scripts, folder structure |
| `crmpro-local.postman_environment.json` | Local dev variables |

## Import

1. Open Postman
2. **Import** → drag both JSON files (or import the `docs/postman` folder)
3. Select environment **CRMPro Local** in the top-right dropdown
4. Start API: `pnpm --filter api start:dev`
5. Run **Auth → Login**

## Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `baseUrl` | `http://localhost:3000/api/v1` | API base (includes version prefix) |
| `tenantSlug` | `prime-estates` | Seeded tenant |
| `email` | `owner@primeestates.com` | Seeded owner user |
| `password` | `Password123!` | Seeded password |
| `accessToken` | *(empty)* | Auto-filled after login (Chunk 3+) |
| `refreshToken` | *(empty)* | Auto-filled after login (Chunk 3+) |
| `sessionId` | *(empty)* | Auto-filled when returned (Chunk 3+) |
| `pipelineId` | `4444...4402` (Commercial Leasing) | Seeded non-default pipeline; updated by **List Pipelines** |
| `stageId` | *(empty)* | Auto-filled by **List Pipelines** or **Create Stage** |
| `leadSourceId` | *(empty)* | Auto-filled by **List Lead Sources** or **Create Lead Source** |
| `developerId` | `6666...6601` (Palm Hills) | Seeded developer; updated by **List Developers** or **Create Developer** |
| `projectId` | `7777...7701` (Palm Hills New Cairo) | Seeded project; updated by **List Projects** or **Create Project** |
| `leadId` | *(empty)* | Auto-filled by **List Leads** or **Create Lead** |
| `userId` | `5555...5503` (Senior Agent) | Assign target user for **Assign Lead** |
| `targetStageId` | *(empty)* | Destination stage for **Move Lead Stage** (must differ from current, same pipeline) |

Switch `email` / `password` to test other seeded users (`manager@primeestates.com`, `agent@primeestates.com`) and compare **Get Permissions** responses.

## Auth endpoints

| Request | Method | Auth |
| --- | --- | --- |
| Login | `POST /auth/login` | Public |
| Refresh Token | `POST /auth/refresh` | Public |
| Logout | `POST /auth/logout` | Bearer |
| Logout All | `POST /auth/logout-all` | Bearer |
| Get Sessions | `GET /auth/sessions` | Bearer |
| Get Permissions | `GET /auth/permissions` | Bearer |
| Get Me | `GET /auth/me` | Bearer |

## Pipeline endpoints

Run **Auth → Login** first (owner or manager for writes).

| Request | Method | Permission |
| --- | --- | --- |
| List Pipelines | `GET /pipelines` | `pipeline.read` |
| Get Pipeline | `GET /pipelines/:id` | `pipeline.read` |
| Create Pipeline | `POST /pipelines` | `pipeline.create` |
| Update Pipeline | `PATCH /pipelines/:id` | `pipeline.update` |
| Delete Pipeline | `DELETE /pipelines/:id` | `pipeline.delete` |
| Create Stage | `POST /pipelines/:pipelineId/stages` | `pipeline.update` |
| Update Stage | `PATCH /pipelines/:pipelineId/stages/:stageId` | `pipeline.update` |
| Delete Stage | `DELETE /pipelines/:pipelineId/stages/:stageId` | `pipeline.update` |

List query example:

```text
GET /pipelines?page=1&limit=20&search=sales&sortBy=createdAt&sortOrder=desc
```

## Lead source endpoints

| Request | Method | Permission |
| --- | --- | --- |
| List Lead Sources | `GET /lead-sources` | `lead-source.read` |
| Get Lead Source | `GET /lead-sources/:id` | `lead-source.read` |
| Create Lead Source | `POST /lead-sources` | `lead-source.create` |
| Update Lead Source | `PATCH /lead-sources/:id` | `lead-source.update` |
| Delete Lead Source | `DELETE /lead-sources/:id` | `lead-source.delete` |

List query example:

```text
GET /lead-sources?page=1&limit=20&search=facebook&sortBy=name&sortOrder=asc
```

## Developer endpoints

| Request | Method | Permission |
| --- | --- | --- |
| List Developers | `GET /developers` | `developer.read` |
| Get Developer | `GET /developers/:id` | `developer.read` |
| Create Developer | `POST /developers` | `developer.create` |
| Update Developer | `PATCH /developers/:id` | `developer.update` |
| Delete Developer | `DELETE /developers/:id` | `developer.delete` |

List query example:

```text
GET /developers?page=1&limit=20&search=palm&sortBy=name&sortOrder=asc
```

## Project endpoints

| Request | Method | Permission |
| --- | --- | --- |
| List Projects | `GET /projects` | `project.read` |
| Get Project | `GET /projects/:id` | `project.read` |
| Create Project | `POST /projects` | `project.create` |
| Update Project | `PATCH /projects/:id` | `project.update` |
| Delete Project | `DELETE /projects/:id` | `project.delete` |

List query example:

```text
GET /projects?page=1&limit=20&search=palm&developerId=...&isActive=true&sortBy=name&sortOrder=asc
```

## Lead endpoints

Run **Auth → Login**, then **Pipelines → List Pipelines** (sets `stageId`) before create.

### Phase 1 — CRUD

| Request | Method | Permission |
| --- | --- | --- |
| List Leads | `GET /leads` | `lead.read` |
| Get Lead | `GET /leads/:id` | `lead.read` |
| Create Lead | `POST /leads` | `lead.create` |
| Update Lead | `PATCH /leads/:id` | `lead.update` |

Create/update responses wrap `{ lead, duplicateWarning }`. List/get return the lead object directly.

PATCH updates profile fields only (source, name, phones, email, status, project interests). Stage and assignment use workflow endpoints below.

### Phase 2 — Workflow actions

| Request | Method | Permission |
| --- | --- | --- |
| Move Lead Stage | `POST /leads/:id/move-stage` | `lead.update` |
| Assign Lead | `POST /leads/:id/assign` | `lead.assign` |
| Unassign Lead | `POST /leads/:id/assign` (`userId: null`) | `lead.assign` |

Workflow responses: `{ lead, activity }`.

List query example:

```text
GET /leads?page=1&limit=20&search=ahmed&pipelineId=...&stageId=...&status=OPEN&sortBy=createdAt&sortOrder=desc
```

## Token auto-save

**Login** includes a test script that:

- Asserts a successful status code (200 or 201)
- Parses JSON response
- Saves `accessToken`, `refreshToken`, `sessionId` **only if present**

Chunk 2 returned `{ success, message, user }` — no tokens.

Chunk 3+ login returns `accessToken` and `refreshToken` — both auto-save to the environment.

## Bearer token injection

Collection **pre-request script**:

- If `accessToken` is set → adds `Authorization: Bearer {{accessToken}}`
- If empty → no header (login and other public routes work unchanged)

Protected routes work after login once tokens are returned.

## List query params

Paginated list endpoints support:

| Param | Default | Notes |
| --- | --- | --- |
| `page` | `1` | Min 1 |
| `limit` | `20` | Min 1, max 100 |
| `search` | *(none)* | Trimmed, whitespace-normalized, case-insensitive partial match |
| `sortBy` | module default | See per-endpoint allowed fields below |
| `sortOrder` | `asc` | `asc` or `desc` |

**Pipelines** — `search` matches pipeline `name`. Sort: `name`, `createdAt` (default `createdAt` asc).

**Lead sources** — `search` matches source `name`. Sort: `name`, `createdAt` (default `name` asc).

**Developers** — `search` matches developer `name`. Sort: `name`, `createdAt`, `updatedAt` (default `name` asc). Soft-deleted rows excluded.

**Projects** — `search` matches project `name` and `location`. Filters: `developerId`, `isActive`. Sort: `name`, `createdAt`, `updatedAt`, `isActive` (default `name` asc). Soft-deleted rows excluded. List items include `developer` summary.

**Leads** — `search` matches `fullName`, phones, `email`. Filters: `pipelineId`, `stageId`, `sourceId`, `assignedUserId`, `status`, `projectId`. Sort: `createdAt`, `updatedAt`, `fullName`, `lastContactedAt` (default `createdAt` desc). Soft-deleted rows excluded.

## List response shape

Paginated list endpoints return:

```json
{
  "success": true,
  "data": {
    "items": [],
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 50,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
}
```

Query params: `?page=1&limit=20&search=...&sortBy=...&sortOrder=asc`

`GET /auth/sessions` still returns `{ items }` only (not yet paginated or searchable).

Single-resource endpoints return `data` as the object directly.

## Clear auth state

**Debug → Clear Auth Tokens** wipes `accessToken`, `refreshToken`, and `sessionId` from the environment.
