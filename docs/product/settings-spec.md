# Settings — Account vs Organization (Spec)

> Status: **S1 implemented** (2026-11-16): `TenantSettings`, `settings.*` permissions, `/me` and `/organization` APIs, `/account` and `/settings` areas, admin pages moved, Plan & usage, logo on sign-in. `UserPreferences` and the S2–S4 settings are not built yet.
> Inputs: a module-by-module survey of `apps/api` for hard-coded policies, plus a review of the current `/settings` page.
> Related: [`tenant-app-review-2026-11.md`](tenant-app-review-2026-11.md).

---

## 1. Problem

1. **No organization can configure anything about itself.** `Tenant` stores only `name`, `slug`, `status`, plan and storage usage. There is no tenant-side endpoint that updates `Tenant`; only the platform admin can rename a workspace. There is no logo (`public.service.ts:23` returns `logoUrl: null`).
2. **Every business policy is a constant in code** — stale threshold, duplicate handling, default stages, phone country, timezone (everything is UTC), password rules, session lifetimes, retention, notification recipients (§4).
3. **`/settings` mixes "me" and "the company".** Profile, Security and Notifications are per-user; Workspace is per-organization and read-only. They sit in one tab list.
4. **Self-service is broken.** Saving your own name calls `PATCH /users/:id` (needs `user.update`, which agents don't have). There is no change-password endpoint and no forgot-password flow.

---

## 2. Principles

- **Two separate places:**
  - **My account** (`/account/...`) — things only about me. Every user has it. Opened from the avatar menu.
  - **Organization settings** (`/settings/...`) — things that apply to everyone in the workspace. Permission-gated. Opened from a gear at the bottom of the sidebar.
- **Admin pages move into Organization settings.** Users, Roles, Pipelines, Lead sources, Imports/Exports history and Audit leave the main sidebar (as already proposed in the app review). The main sidebar stays for daily work.
- **Settings are typed and validated**, with safe defaults, created at provisioning — never an untyped JSON blob that can drift.
- **One source of truth per policy.** Today the stale threshold is defined three times (`analytics.constants.ts:26`, `leads.service.ts:543`, web `lead-formatters.ts:4`). After this work it is read from settings everywhere.
- **Platform limits bound org choices.** Plan/contract/quotas are set by the platform admin; the org can see them but not change them. Security settings can only be made *stricter* than the platform floor.
- **Every settings change is audited** (who, what, old → new).

---

## 3. Information architecture

```text
Avatar menu
└─ My account                         /account
   ├─ Profile          name, phone, avatar
   ├─ Preferences      language*, timezone override*, date format*, default dashboard range
   ├─ Security         change password, active sessions / sign out everywhere
   └─ Notifications    per-category on/off (security alerts mandatory)

Sidebar gear (settings.read)
└─ Organization settings              /settings
   ├─ General          name, logo, country, timezone, currency, default language*, week start
   ├─ Team             users · roles · (teams & targets later) · deactivation policy
   ├─ Leads & sales    pipelines · lead sources · stale threshold · duplicate policy ·
   │                   lead visibility · reassignment · auto-assignment · closed-lead reopening
   ├─ Data             import rules · export columns · import/export history
   ├─ Notifications    org-level alert rules (who gets told about what)
   ├─ Security         password minimums · session lifetime
   ├─ Plan & usage     plan, contract status, quotas used / limits, features (read-only)
   └─ Audit log
```

`*` depends on the Arabic/i18n work; the field can exist before the UI is translated.

Mobile: both areas render as a list of sections → section page (no side-by-side tabs). The current horizontal tab strip clips at narrow widths.

---

## 4. Setting inventory

Legend — **Owner**: who controls it. **Phase**: see §7. **Wired in**: where the code must read it.

### 4.1 General (organization identity & locale)

| Setting | Default | Wired in | Phase |
|---|---|---|---|
| Workspace name | from provisioning | header, login page, exports | S1 |
| Logo | none | login page (`public.service.ts:23`), sidebar, PDF/exports later; needs `FileAssetCategory.LOGO` | S1 |
| Slug | read-only (changing it breaks logins) | — | — |
| Country | Egypt | phone normalization default country (`packages/shared/src/leads/phone-normalization.util.ts:13`) | S2 |
| Timezone | `Africa/Cairo` | analytics day/week/month bucketing (`analytics-range.util.ts:19-21`, `analytics-date.util.ts:36-69`, `trend-analytics.service.ts`), "today" lists, reminders | S2 |
| Currency | EGP | budgets, prices, deals, installments calculator | S2 |
| Week starts on | Saturday | analytics weekly buckets (`analytics-date.util.ts:56`) | S2 |
| Default language | English → Arabic once translated | notification templates, exports, new users' default | S4 |

### 4.2 Team

| Setting | Default | Wired in | Phase |
|---|---|---|---|
| Users, Roles | (existing pages, moved here) | — | S1 |
| When a user is deactivated, their open leads… | stay assigned | `users.service.ts:268-305` → keep / unassign / reassign to chosen user | S2 |
| Invite by email instead of typed password | — | needs email delivery | later |
| Teams, managers, targets | — | needs new model | Phase 1+ |

### 4.3 Leads & sales

| Setting | Default | Wired in | Phase |
|---|---|---|---|
| Pipelines, Lead sources | (existing, moved here) | — | S1 |
| Stale after N days without contact | 7 | three current constants → one setting | S2 |
| Duplicate phone on manual create | warn | `leads.service.ts:113,393,744-790` → warn / block | S2 |
| Duplicate phone on import | reject row | `leads.service.ts:268-276` → reject / skip / import & flag | S2 |
| Stage template for new pipelines | current bootstrap stages | `pipelines.service.ts:61-79` (also fixes the "Interested" vs "Proposal" mismatch) | S2 |
| Allow reopening closed (won/lost) leads | no | `lead-stage.service.ts:150`, `lead-assignment.service.ts:197` | S2 |
| Agents can see | all leads | lead list/detail/search/export queries → own only / own + unassigned / all | S3 (with Phase 1 scoping) |
| Agents can reassign leads | yes | today via role permission `lead.assign`; surface as a clear toggle | S3 |
| New-lead assignment | manual | `leads.service.ts:100`, import → manual / round-robin / default owner per source | S3 |
| First-response SLA (minutes) + working hours | off | SLA alerts, response-time analytics | S3 (with follow-up engine) |

### 4.4 Data

| Setting | Default | Wired in | Phase |
|---|---|---|---|
| Unknown source name in import | drop to empty | `import-jobs.service.ts:506-523` → use fallback source / create source / leave empty | S2 |
| Unknown assignee email in import | leave unassigned | `import-jobs.service.ts:527-550` → unassigned / fallback user | S2 |
| Export columns & date format | fixed 11 cols, ISO UTC | `export-jobs.constants.ts:9-21`, `lead-export.service.ts:122` | S3 |
| Retention: notifications / audit / soft-deleted leads / export files | forever | new cleanup jobs; org picks a window ≤ platform max | later |

### 4.5 Notifications (organization rules)

| Setting | Default | Wired in | Phase |
|---|---|---|---|
| Notify managers on Won / Lost | off | `notification-trigger.service.ts` | S3 |
| Notify on new unassigned lead (to managers) | on | same | S3 |
| Notify assignee when lead assigned at creation / import | on | currently never fires (`leads.service`, import) | S3 |

Per-user on/off stays in **My account → Notifications**; org rules decide *who is eligible*, user preferences decide *whether they want it*. Security alerts cannot be turned off (`update-notification-preferences.dto.ts:14` currently allows it).

### 4.6 Security

| Setting | Default | Wired in | Phase |
|---|---|---|---|
| Minimum password length / complexity | platform floor (8, upper+lower+digit) | `users.constants.ts:1`; org can only raise | S2 |
| Refresh-session lifetime | 7 days | `config/configuration.ts:130-134`; org can only shorten | S2 |
| Two-factor sign-in | — | — | later |

### 4.7 Plan & usage (read-only for the org)

Plan name, contract status/end date/grace, features (`analytics`, `importExport`), and usage vs limits for users, leads, projects, storage (`quota.service.ts`, `Tenant.storageUsedBytes`). Includes a "contact us to upgrade" action (support conversation).

### 4.8 My account (per user)

| Item | Status today | Needed |
|---|---|---|
| Name, phone, avatar | name only, and only with `user.update` | `PATCH /me` for every user |
| Change password | missing | `POST /me/password` (current + new; revoke other sessions) |
| Forgot password | missing | email flow (later, needs email) |
| Sessions | exists | keep |
| Notification preferences | exists | make SECURITY mandatory |
| Language / timezone override / date format / default dashboard range | missing | `UserPreferences` |

### 4.9 Deliberately NOT settings

Rate limits, signed-URL lifetimes, queue concurrency/retries, cache TTLs, pagination limits, cleanup schedules, notification dedupe keys, system role names, Won/Lost stage rules. These are engineering/platform concerns.

---

## 5. Data model

```prisma
model Tenant {
  // existing fields …
  logoFileId String? @db.Uuid          // FileAsset with category LOGO
  settings   TenantSettings?
}

/// One row per tenant, created at provisioning with defaults.
model TenantSettings {
  tenantId                    String   @id @db.Uuid
  // General
  countryCode                 String   @default("EG")      // ISO-3166 alpha-2
  timezone                    String   @default("Africa/Cairo")
  currency                    String   @default("EGP")     // ISO-4217
  weekStartsOn                Int      @default(6)         // 0=Sun … 6=Sat
  defaultLanguage             String   @default("en")
  // Leads & sales
  staleLeadDays               Int      @default(7)
  duplicateOnCreate           DuplicatePolicy @default(WARN)
  duplicateOnImport           DuplicatePolicy @default(REJECT)
  allowReopenClosedLeads      Boolean  @default(false)
  onUserDeactivated           DeactivatedLeadsPolicy @default(KEEP)
  // Data
  importUnknownSource         ImportUnknownSourcePolicy @default(LEAVE_EMPTY)
  importFallbackSourceId      String?  @db.Uuid
  importFallbackAssigneeId    String?  @db.Uuid
  // Security (bounded by platform floor/ceiling)
  passwordMinLength           Int      @default(8)
  sessionLifetimeDays         Int      @default(7)
  updatedAt                   DateTime @updatedAt
  updatedByUserId             String?  @db.Uuid
}

model UserPreferences {
  userId          String  @id @db.Uuid
  language        String?            // null = org default
  timezone        String?            // null = org timezone
  dashboardRange  String  @default("30d")
}
```

Why typed columns instead of a JSON `settings` field: validation at the DB, discoverable in Prisma Studio, safe defaults for existing tenants via the migration, and no silent drift between API and UI. New settings = a column + a migration, which is the right amount of friction.

A backfill migration inserts a `TenantSettings` row with defaults for every existing tenant; provisioning (`tenant-provisioning.service.ts`) creates it for new ones.

---

## 6. API & permissions

| Endpoint | Purpose | Permission |
|---|---|---|
| `GET /me`, `PATCH /me` | own profile (name, phone, avatar) | authenticated |
| `POST /me/password` | change own password | authenticated |
| `GET/PATCH /me/preferences` | own preferences | authenticated |
| `GET /organization` | name, logo URL, slug, status | authenticated |
| `PATCH /organization` | name | `settings.manage` |
| `POST /organization/logo` (upload intent) / `DELETE` | logo | `settings.manage` |
| `GET /organization/settings` | all org settings | authenticated (values drive behaviour everyone sees) |
| `PATCH /organization/settings` | update; audited with before/after | `settings.manage` |
| `GET /organization/usage` | plan, contract summary, quotas & usage | `settings.read` |

- **New permissions:** `settings.read`, `settings.manage`. Owner gets both; Manager gets `settings.read`. Do **not** reuse `tenant.manage` — see §8.1.
- A `TenantSettingsService.get(tenantId)` with short Redis caching (invalidated on PATCH) is what every module calls; no module reads constants for these policies any more.
- Validation: timezone must be a valid IANA zone; currency an ISO code; security values clamped to platform bounds.

---

## 7. Delivery plan

| Step | Content |
|---|---|
| **S1 — Foundation & split** | `TenantSettings` + `UserPreferences` tables and backfill; `settings.*` permissions; `/me` endpoints (profile, password); `/organization` (name, logo); usage endpoint. New `/account` area and new `/settings` shell with **General**, **Team** (users/roles moved), **Leads & sales** (pipelines/lead sources moved), **Plan & usage**, **Audit**. Sidebar regrouped; old routes redirect. Logo on login page. |
| **S2 — Wire existing behaviour** | Stale days, duplicate policies, new-pipeline stage template, reopen closed leads, deactivation policy, import fallbacks, password minimum, session lifetime, country for phone normalization, timezone + week start in analytics. Each replaces a hard-coded constant. |
| **S3 — With Phase 1 features** | Lead visibility, reassignment toggle, auto-assignment, SLA + working hours, org notification rules, export columns. These need the follow-up engine / scoping work from the app review. |
| **S4 — With i18n** | Default language, user language, localized templates/exports. |

---

## 8. Found while surveying (fix independently)

1. **Cross-tenant data exposure.** `GET /api/v1/jobs/health` and `GET /api/v1/metrics` (`monitoring.controller.ts:22-40`) are guarded only by `tenant.manage`, which every tenant Owner and Manager has, but they return platform-wide job and runtime metrics. Move them behind `InternalMonitoringGuard` (the admin plane already uses the internal snapshot). **Fix before any real customer is onboarded.**
2. **Stage template mismatch.** New pipelines get an "Interested" stage (`pipelines.service.ts:61-79`); new tenants' default pipeline has "Proposal" (`tenant-bootstrap.constants.ts:85`).
3. **Security notifications can be disabled** by users (`update-notification-preferences.dto.ts:14`).

---

## 9. Open questions

1. Should Managers be able to change any org settings (e.g. Leads & sales) or only view them?
2. Week start for your customers: Saturday or Sunday?
3. Is changing the workspace **slug** ever allowed (it is the login identifier)?
4. Do any target customers operate outside Egypt now (affects whether Country/Currency need to be in S1)?
