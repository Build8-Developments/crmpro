# Review — `feat/backend-web-features` vs our work (2026-11-17)

Branch: `origin/feat/backend-web-features` — 10 commits on top of `d6e82e0`
(648 files, +30.4k / −2.7k). Ours: `fix/phase-0-hygiene` (committed + the
uncommitted W1 workflow engine, evidence, profile, masking, stage icons…).

## Verdict

**Do not merge or cherry-pick commits.** The two lines redesign the same areas
differently, and the database history can't be combined:

- Both create `TenantSettings`, `Task`, `TaskType`, `TaskStatus` (different
  columns/values) and both add `Lead.firstContactedAt`.
- Migration timestamps collide (`20261117100000`, `20261117140000` exist on
  both sides with different content); their `…130000` does
  `CREATE TABLE "TenantSettings"` which fails on our database; their
  `20260902120000` would run out of order.
- Their later commits depend on their earlier ones (lead scope, task model,
  tenant-settings module, throttler), and plan 02 reformats ~60 files we
  changed heavily.

**Port feature by feature** onto our branch, re-expressing every schema change
as a new migration of ours dated after `20261117160000`. Many pieces are
genuinely good and save us real work — especially lead scoping + teams, the
scheduler, email/password reset/invites, the leads kanban, saved views, the
import wizard, the inbound API and a set of security fixes.

## What to take

| # | Feature (their commit) | Why | Changes needed | Effort |
|---|---|---|---|---|
| 1 | **Lead visibility scoping + Teams** (plan 06) | Approved for us, not built; theirs is thorough and tested across list/detail/bulk/files/exports/analytics | "Own" must include **unassigned** leads; thread scope through our W1 endpoints (bulk-by-filter, transfer preview, workload, **contact-access**, interactions, `/tasks`); re-apply file scoping by hand; Teams page under `/settings/teams`; case-insensitive team-name index | L |
| 2 | **Scheduler service + task reminders** (plan 07) | Exactly the "sweep" our W2 rules engine needs (BullMQ repeatable jobs, claim-once, per-tenant skip) | Add `reminderSentAt`/`overdueNotifiedAt` + `Task(status,dueAt)` index to **our** Task; use `upsertJobScheduler`; use our `TenantAccessService` | M |
| 3 | **Leads kanban** (`?view=board`, plan 07) | Approved item; drag between stages, optimistic, per-stage load-more | Drop on LOST → our lost-reason picker; `nextTaskDueAt`, heat, stage icons, masked contact | M |
| 4 | **Lead archive/restore endpoints** (plan 07) | Our `PATCH status=ARCHIVED` writes no timeline event and leaves tasks open | Use `TaskLifecycleService.cancelOpenTasks`; drop their `LeadScope` param until #1 lands | S |
| 5 | **Task notification templates, REMINDER→Follow-ups mapping, tenant socket "invalidate" room** (plan 07) | Our enum already has the types; our REMINDER mapping is wrong | Debounce the client refetch | S |
| 6 | **Mail service + queue** (plan 08) | Needed for reset/invites/email notifications; bilingual templates, retries | **Fail in production unless SMTP is configured** (the `log` default would print reset/invite links); don't keep raw HTML in failed jobs | S |
| 7 | **Password reset** (plan 08) | Solid: hashed single-use tokens, 30 min, no enumeration, throttled, revokes sessions | Re-check user active / not deleted / tenant accessible on consume; void tokens on deactivate/delete; `Referrer-Policy: no-referrer` | M |
| 8 | **Email invitations** (plan 08) | Users set their own password; seat quota checked | Peek token via POST (not in the URL path); status checks on accept; resend cooldown; ignore soft-deleted duplicates; rewire onto `/settings/users` | M |
| 9 | **Email notifications (opt-in)** (plan 08) | Safe channel design, tested | Move the toggle into our account notifications card | S |
| 10 | **Saved views** (plan 10) | Approved item; simple, scope-safe | Validate filters against our filter keys; store **columns + density** too (replace localStorage prefs); size limit | S–M |
| 11 | **Import wizard + XLSX** (plan 11) | Much better for Egyptian agencies: auto column mapping incl. Arabic headers, defaults, duplicate policy, Windows-1256, idempotent retries | **Remove round-robin assignment**; add our profile columns; reuse our phone normalizer; guard XLSX size/decompression; merge into our `leads.service` | L |
| 12 | **XLSX export + column registry** (plan 11) | | Build on our 22-column export; **add CSV/XLSX formula-injection escaping** (both sides lack it) | M |
| 13 | **API keys + inbound leads API** (plan 09) | Hashed keys, plan-gated, tenant from key, "same phone on open lead = resubmission" | Rate-limit per key in Redis (not per-IP in memory); use our phone normalizer; handle deleted/duplicate `externalId` (P2002); go through our lead-create path (W1 fields); **no auto-assign** — R13 handles new leads | M |
| 14 | **Security fixes** (plans 01/02) | Real holes on our side | `trust proxy` hop count (ours trusts client X-Forwarded-For → IP rate limits bypassable); admin permission guard fail-closed + `@PublicAdminRoute`; WebSocket auth hardening + socket CORS from allowlist; admin refresh token in httpOnly cookie (+ admin client); JWT secrets ≥32; Swagger off in prod | S–M |
| 15 | **Web hardening** (plan 04) | | Permission route guard + `/403`; `error.tsx`, `global-error.tsx`, `not-found.tsx`; realtime prod origin + refetch on reconnect; confirm dialogs for deactivate/revoke (reapply on our users page) | S |
| 16 | **Small fixes** | | Support draft key per conversation; `pnpm-workspace.yaml` bcrypt placeholder; `lastLoginAt` on login; import actions gated on `import-job.create`; contract audit inside the transaction; cleanup parks jobs of suspended tenants; Mailpit in docker-compose + Postgres healthcheck | S |
| 17 | **CI + scripts** (plan 02) | We have no CI | Take `.github/workflows/ci.yml`, `typecheck`/`lint:fix` scripts, turbo tasks; **re-run lint/prettier on our tree** instead of taking their reformatting diff | S |

## Already ours (skip theirs)

| Theirs | Ours | Better |
|---|---|---|
| Activity logging (`POST /leads/:id/activities`, generic outcomes) | `Interaction` + required next step + evidence | Ours |
| Follow-up `Task` model/API | Our `Task` with priority/origin/ruleKey/snooze reason/skip, lifecycle on close & reassign | Ours (theirs leaves tasks open on won/lost and with the old agent on reassign) |
| Today view | Spec'd W2 Today (bigger); reuse their page layout pieces | Build ours |
| Drawer quick actions / WhatsApp helper | Ours (theirs bypasses contact masking) | Ours |
| `neverContacted`/`noFollowUp` filters | Our manager filters | Ours |
| Workspace settings module | Our `TenantSettings` + `/organization` | Ours (add their SLA ideas as our spec §2.10 fields) |
| Workspace branding / logo (allows SVG, no FK) | Our logo flow (raster only, FK, audit) | Ours |
| `@nestjs/throttler` + in-memory login limiter | Our Redis rate limiter | Ours |
| CORS/env fail-closed | b8cc1a6 | Ours |
| Red suites / junk files / tsbuildinfo | 43ae413 + Phase 0 | Same |
| `/lead-sources` page | `/settings/lead-sources` | Ours |

## Skip (conflicts with a decision or not needed)

- **Round-robin auto-assignment** (`receivesLeads`, `lastAutoAssignedAt`, import + inbound hooks) — the owner decided assignment is the manager's job.
- **SLA service as written** — no working hours (23:00 lead breaches at 23:15), one threshold, REASSIGN action, and a backfill that would fire ~200 alerts when first enabled. Reuse its patterns (claim-once, timeline event, dedupe, leader escalation, `slaBreachedAt` + filter) inside our W2 R1.
- **Separate `task.*` / `lead-activity.create` permissions** and task deletion.
- **"Revoke all sessions on refresh reuse"** — two tabs would log a user out everywhere; at most revoke that one session.
- **Plan 02 formatting diff**, their `docs/plans`.

## Later (good, not on the current plan)

- **Custom fields** — complement our typed profile fields; fix their bug where archiving a field wipes its values on the next edit; add filter support.
- **Plan snapshots on contracts** — sound, but make malformed limits fail *closed*, point our usage page at the snapshot, decide how new feature flags reach old contracts.
- **Contract termination → immediate suspension** — conflicts with our grace window; **owner decision**.
- **Project updates feed** (price change / new phase / availability + brochures; API only, no UI).
- **Billing view extras** (price/payment terms) on our Plan & usage page.
- **i18n** — next-intl setup is small; string extraction was done on the old shell (would conflict everywhere); no Arabic file and no RTL styling yet. Take the setup when we start Arabic.
- **Two-way URL sync of filters** — redo with saved views on our filter schema.

## Found in OUR code while reviewing (fix regardless)

1. **Contact reveal ignores lead visibility** — any user with `lead.read` can reveal any lead's phone by id. Fixed by #1 (scope `LeadContactAccessService`).
2. **Agents still have `lead.assign`** (`AGENT_PERMISSION_KEYS`) → they can bulk-assign and transfer.
3. `trust proxy: true` (see #14), admin guard fails open, sockets `cors: { origin: true }`, admin WS typing to client-supplied `userId`.
4. Response-time analytics ignore `INTERACTION_LOGGED` — should read `Lead.firstContactedAt`.
5. Archiving via `PATCH` leaves open tasks and no timeline event (#4).
6. `REMINDER` notifications map to the Marketing preference (#5).
7. Support draft shared across conversations; `pnpm-workspace.yaml` placeholder breaks install.

## Suggested order

1. **Security & hygiene** — #14, #15, #16, #17, plus our findings 2–7. (S/M, low risk)
2. **Visibility scoping + Teams** — #1. (Approved item 1)
3. **W2** on top of #2, with SLA patterns, #4, #5; then the **Today** screen. (Approved item 2)
4. **Leads kanban** #3 and **saved views** #10. (Approved items 3–4)
5. **Email**: #6–#9.
6. **Import wizard / XLSX / inbound API**: #11–#13.
7. Then the remaining approved items (shared table, duplicate merge, mobile cards, deals & dashboard v2) and the "Later" list.

## Mechanics

- Never apply their migrations. Re-create each schema change as a migration of
  ours after `20261117160000` (`UserToken`, `User.invitedAt/inviteAcceptedAt/teamId`,
  `NotificationPreference.emailEnabled`, `Team`, `ApiKey`, `Lead.assignedAt/
  slaBreachedAt/externalId/importJobId/importRowNumber`, `SavedView`,
  `CustomFieldDefinition`, `ImportJob.duplicatePolicy/options/skippedRows`,
  `ProjectUpdate`, `TenantContract.planSnapshot`, new permission rows and enum
  values).
- Brand-new self-contained files (mail module, scheduler, CI workflow, error
  pages, inbound/api-keys) can be copied with
  `git show origin/feat/backend-web-features:<path>` and adapted; everything
  touching `leads.service.ts`, `files.service.ts`, settings or the shell is
  re-applied by hand.
- New dependencies: `nodemailer` (+types), `cookie-parser` (+types, admin-api),
  `exceljs` (unmaintained since 2023 — run `pnpm audit`, add a size guard),
  `next-intl` (when we do i18n). Skip `@nestjs/throttler`.
- New env vars: `MAIL_TRANSPORT`, `MAIL_FROM`, `SMTP_*`, `APP_WEB_URL`,
  `ENABLE_SWAGGER`, `REFRESH_COOKIE_CROSS_ORIGIN` (via config, not `process.env`).
