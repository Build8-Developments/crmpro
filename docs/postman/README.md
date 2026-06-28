# CRMPro Postman

Local API testing collection for auth, CRM modules, tasks, calendar, analytics, notifications, automations, and monitoring.

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
| `noteId` | *(empty)* | Auto-filled by **Create Lead Note** |
| `fileId` | *(empty)* | Auto-filled by **Complete Upload** |
| `objectKey` | *(empty)* | Auto-filled by **Request Upload** |
| `importJobId` | *(empty)* | Auto-filled by **Create Lead Import Job** |
| `taskId` | *(empty)* | Auto-filled by **List Tasks** or **Create Task** |
| `notificationId` | *(empty)* | Auto-filled by **List Notifications** |
| `automationId` | *(empty)* | Auto-filled by **List Automations** |

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

### Phase 3 — Notes and timeline

| Request | Method | Permission |
| --- | --- | --- |
| List Lead Notes | `GET /leads/:id/notes` | `lead-note.read` |
| Create Lead Note | `POST /leads/:id/notes` | `lead-note.create` |
| Update Lead Note | `PATCH /lead-notes/:noteId` | `lead-note.update` |
| Delete Lead Note | `DELETE /lead-notes/:noteId` | `lead-note.delete` |
| Get Lead Activities | `GET /leads/:id/activities` | `lead.read` |

Notes list returns `{ items }` sorted **newest first** (non-paginated for MVP). Timeline returns paginated `{ items, pagination }` (newest first). Note create/update/delete append immutable timeline events; `NOTE_UPDATED` includes `previousPreview` and `newPreview` (120 chars max each).

### Phase 3 — Files (signed upload)

| Request | Method | Auth |
| --- | --- | --- |
| Request Upload | `POST /files/request-upload` | JWT |
| Upload to S3 (PUT) | presigned `uploadUrl` from step 1 | none |
| Complete Upload | `POST /files/complete-upload` | JWT |
| Get Download URL | `GET /files/:id/download-url` | JWT |
| Delete File | `DELETE /files/:id` | JWT |
| List Lead Attachments | `GET /leads/:id/attachments` | `lead.read` |

Upload flow: **request-upload** → **Upload to S3 (PUT)** → **complete-upload**. Step 1 declares a maximum `sizeBytes`; the S3 object must exist, be non-empty, and not exceed that size (it may be smaller). Content-Type on the PUT must match step 1. Quota is charged for the actual S3 object size. Returns `400 Upload not completed` if the PUT was skipped. Max declared size 25 MB. `LEAD_ATTACHMENT` requires `leadId` on complete. Use `category: IMPORT_FILE` (no `leadId`) for CSV lead imports.

### Phase 4 — Import Jobs (lead CSV)

| Request | Method | Auth |
| --- | --- | --- |
| Create Lead Import Job | `POST /import-jobs/leads` | `import-job.create` |
| Get Import Job | `GET /import-jobs/:id` | `import-job.read` |
| List Import Jobs | `GET /import-jobs` | `import-job.read` |

Flow: upload CSV via Files (`category: IMPORT_FILE`) → **Create Lead Import Job** with `fileAssetId` → poll **Get Import Job** until terminal status.

Required CSV headers: `fullName`, `primaryPhone`. Optional: `secondaryPhone`, `email`, `sourceName`, `assignedUserEmail`. Extra columns (e.g. `notes`) are ignored. Processing runs asynchronously after create; job returns immediately with `PENDING`/`PROCESSING`. Stale `PROCESSING` jobs are marked `FAILED` by the BullMQ cleanup worker.

Example CSV:

```csv
fullName,primaryPhone,email,sourceName
Ahmed Hassan,+201012345678,ahmed@gmail.com,Meta Ads
Sara Ali,+201122233344,sara@gmail.com,Referral
```

List query example:

```text
GET /leads?page=1&limit=20&search=ahmed&pipelineId=...&stageId=...&status=OPEN&sortBy=createdAt&sortOrder=desc
```

## Task endpoints

Run **Auth → Login** first. Optional: **Leads → List Leads** (sets `leadId`) and **Leads → Assign Lead** context for `userId`.

| Request | Method | Permission |
| --- | --- | --- |
| List Tasks | `GET /tasks` | `task.read` |
| Task Dashboard | `GET /tasks/dashboard` | `task.read` |
| Create Task | `POST /tasks` | `task.create` |
| Get Task | `GET /tasks/:id` | `task.read` |
| Update Task | `PATCH /tasks/:id` | `task.update` |
| Start Task | `PATCH /tasks/:id/start` | `task.update` |
| Complete Task | `PATCH /tasks/:id/complete` | `task.update` |
| Cancel Task | `PATCH /tasks/:id/cancel` | `task.update` |
| Assign Task | `PATCH /tasks/:id/assign` | `task.assign` |
| Delete Task | `DELETE /tasks/:id` | `task.delete` |

List query example:

```text
GET /tasks?page=1&limit=20&assignedUserId=...&leadId=...&priority=HIGH&status=PENDING&type=CALL&overdueOnly=true&from=2026-06-01&to=2026-12-31&sortBy=dueAt&sortOrder=asc
```

Task types: `CALL`, `MEETING`, `SITE_VISIT`, `EMAIL`, `FOLLOW_UP`, `DOCUMENT_COLLECTION`, `PAYMENT`, `REMINDER`, `CUSTOM`.

Priorities: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`. Statuses: `PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `OVERDUE`.

When linked to a lead, task create/complete/assign/cancel append **LeadActivity** timeline events.

## Calendar endpoints

Calendar reads the **Task** table only — no separate calendar entity.

| Request | Method | Permission |
| --- | --- | --- |
| Day View | `GET /calendar/day` | `task.read` |
| Week View | `GET /calendar/week` | `task.read` |
| Month View | `GET /calendar/month` | `task.read` |

Query params: `date` (ISO date), optional `assignedUserId`, `leadId`, `projectId`, `priority`.

Response shape: `[{ "date": "2026-07-01", "tasks": [] }]`.

## Analytics endpoints

Requires `analytics.read`.

| Request | Method |
| --- | --- |
| Overview | `GET /analytics/overview` |
| Pipeline Funnel | `GET /analytics/pipeline` |
| Lead Sources | `GET /analytics/sources` |
| Agent Performance | `GET /analytics/agents` |
| Project Performance | `GET /analytics/projects` |
| Developer Performance | `GET /analytics/developers` |
| Lead Trends | `GET /analytics/trends` |
| Status Distribution | `GET /analytics/status` |
| Recent Activity | `GET /analytics/recent-activity` |
| Task Analytics | `GET /analytics/tasks` |
| Export Dashboard | `GET /analytics/export?format=csv` |

Optional date range: `?from=2026-01-01&to=2026-12-31`.

## Notification endpoints

| Request | Method | Permission |
| --- | --- | --- |
| List Notifications | `GET /notifications` | `notification.read` |
| Unread Count | `GET /notifications/unread-count` | `notification.read` |
| Get Notification | `GET /notifications/:id` | `notification.read` |
| Mark Read | `PATCH /notifications/:id/read` | `notification.update` |
| Mark All Read | `PATCH /notifications/read-all` | `notification.update` |
| Delete Notification | `DELETE /notifications/:id` | `notification.delete` |

Task notification types: `TASK_ASSIGNED`, `TASK_DUE`, `TASK_OVERDUE`, `TASK_COMPLETED`.

## Automation endpoints

| Request | Method | Permission |
| --- | --- | --- |
| List Automations | `GET /automations` | `automation.read` |
| Create Automation | `POST /automations` | `automation.create` |
| Get Automation | `GET /automations/:id` | `automation.read` |
| Update Automation | `PATCH /automations/:id` | `automation.update` |
| Delete Automation | `DELETE /automations/:id` | `automation.delete` |
| Test Automation | `POST /automations/:id/test` | `automation.execute` |
| List Executions | `GET /automations/:id/executions` | `automation.read` |

Supported action types include `CREATE_TASK` (auto-create follow-up tasks from lead events).

## Monitoring endpoints

No `/api/v1` prefix — root-level routes:

| Request | Method |
| --- | --- |
| Global Health | `GET /health` |
| Jobs Health | `GET /jobs/health` |
| Metrics | `GET /metrics` |

Jobs health includes `taskReminder` worker. Metrics include `tasks` snapshot and `task` queue counts.

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

**Tasks** — `search` matches `title`, `description`. Filters: `assignedUserId`, `leadId`, `projectId`, `priority`, `status`, `type`, `overdueOnly`, `from`, `to` (due date range). Sort: `dueAt`, `createdAt`, `updatedAt`, `priority`, `title` (default `dueAt` asc). Soft-deleted rows excluded.

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
