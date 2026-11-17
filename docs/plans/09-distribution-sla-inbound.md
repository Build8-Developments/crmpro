# Plan 09 — Distribution, Speed-to-lead, Inbound API

**Goal:** every lead reaches the right agent automatically, gets called fast, and can arrive from any external form or ad platform without duplicates.
**Order:** ninth.
**Status:** ☑ complete

---

## 1. Workspace settings ✅

- `TenantSettings` (1:1, created lazily + backfilled): timezone, default country, currency, default locale, `autoAssignEnabled`, `slaFirstResponseMinutes`, `slaAction (NOTIFY|REASSIGN)`.
- `GET /tenant-settings` (any member), `PATCH /tenant-settings` (`tenant.manage`, audited, timezone validated).

## 2. Round-robin distribution ✅

- `User.receivesLeads` (Owners opted out by the migration) + `lastAutoAssignedAt`; `PATCH /users/:id/lead-routing`.
- `LeadDistributionService` listens to `LeadCreatedEvent`: unassigned leads (manual, import, webhook) go to the eligible user assigned least recently. Per-tenant row lock (`TenantSettings FOR UPDATE`) keeps concurrent intake fair; conditional update backs off if someone assigned the lead first. Timeline + notification as for manual assignment.

## 3. Speed-to-lead SLA ✅

- `Lead.assignedAt` (SLA clock, reset on every assignment) and `Lead.slaBreachedAt`.
- Scheduler job `lead-sla` (every minute): assigned, open, never-contacted leads past the deadline are marked once (`SLA_BREACHED` activity) and escalated to the owner's team leader, or users with `lead.read-all` when there is none; `REASSIGN` hands the lead to the next agent once.
- Leads filter `slaBreached`; Today shows "missed the first-call SLA" for team/all scope; "Missed SLA" chip on Leads.

## 4. Inbound API ✅

- `ApiKey` (sha256 hash, prefix for display, revocable) — `GET/POST/DELETE /api-keys` (`api-key.manage`, Owner by default, plan flag `apiAccess`).
- `POST /inbound/leads` with `X-Api-Key`: tenant access + plan checked, throttled; idempotent `externalId`; phone match on an open lead → no duplicate, `LEAD_RESUBMITTED` on the timeline and the owner notified; source created by name, project matched by name. Documented in `docs/api/inbound-leads.md`.

## 5. Web ✅

- Settings → Lead distribution (auto-assign, receivers, SLA presets/custom, action) and Integrations (keys shown once, endpoint + curl, ownership rule).
- WhatsApp links use the workspace country dial code.

**Accept (verified live):** three webhook leads went Sales Manager → Senior Agent → Field Agent (Owner excluded); same phone and same externalId returned the existing lead; with a 1-minute SLA the team leader was alerted for the team member's lead and the owner for the others within ~90 s.

---

## Out of scope
Per-source/per-project routing rules, working-hours calendars for the SLA, native Meta/TikTok connectors (use the webhook via Zapier/Make).

## Definition of done
Leads arrive from anywhere, land with an owner within seconds, and nobody can sit on a new lead unnoticed.
