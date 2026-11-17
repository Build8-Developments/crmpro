# Plan 10 — Workspace, Billing View, Custom Fields, Saved Views

**Goal:** let each agency make CRMPro its own — name and logo, its own lead fields, saved views — and see its plan and usage without asking support.
**Order:** tenth.
**Status:** ☑ complete

---

## 1. Workspace ✅

- `PATCH /tenant-settings` now also takes `workspaceName` (updates the tenant name; the sign-in slug never changes) and `logoFileAssetId` (an uploaded `TENANT_LOGO` image ≤ 2 MB; `null` removes it). `GET /tenant-settings` returns `workspaceName` and a short-lived signed `logoUrl`; the public workspace lookup returns the logo for the sign-in page.
- Web: the Workspace card is editable (name, logo upload/remove, timezone, country, currency, default language) for `tenant.manage`; shared `uploadFile()` helper for presigned uploads.

## 2. Billing overview (read-only) ✅

- `GET /billing/overview` (`billing.manage`): plan (active contract snapshot first), contract terms (price, InstaPay/bank/cash…, frequency, period, grace, auto-renew), usage vs limits (users, leads, projects, storage), included features.
- Web: Settings → Plan & usage with usage bars.

## 3. Custom fields ✅

- `CustomFieldDefinition` (TEXT, NUMBER, DATE, SELECT, MULTI_SELECT, BOOLEAN, URL; options; required; order; archive). Stable keys (generated from latin labels, random for Arabic). Max 30 active.
- `GET /custom-fields` (`lead.read`), create/update/reorder/archive/restore (`custom-field.manage`, audited).
- Lead create/update validate and coerce `customFields` server-side (unknown keys, bad options, types, required) with per-field error details; updates merge, `null` clears.
- Web: Settings → Custom fields; inputs rendered in New/Edit lead (edit only sends changed fields); values shown in the lead drawer.

## 4. Saved views ✅

- `SavedView` (filters + sort, personal or shared). `GET/POST/PATCH/DELETE /saved-views`; sharing needs `saved-view.share`; only the creator edits/deletes. Results always follow each viewer's lead scope.
- Web: "Views" menu on the leads toolbar (apply, save current, delete own, shared section).

**Accept (verified live):** agent cannot create fields (403); required/option errors come back per field; Arabic label gets a safe key; billing hidden from agents; agent cannot share views; workspace rename shows on the public sign-in lookup.

---

## Out of scope
Filtering/sorting by custom field values, custom fields on other entities, per-user column layouts.

## Definition of done
Agencies can rename/brand their workspace, add the fields they track, save their views and read their plan & usage on their own.
