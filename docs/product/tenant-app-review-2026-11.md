# Tenant App Review — November 2026

> Scope: the agency-facing product only (`apps/web` + `apps/api`). The platform admin plane is out of scope.
> Method: four parallel code reviews (leads/pipelines, dashboard/notifications/support/audit, catalog/team/data ops, cross-cutting UI/UX) plus a live walkthrough of the seeded `prime-estates` workspace on desktop (1440px) and mobile (375px).
> Base: `main` at `b8cc1a6` plus the uncommitted tenant-access / auth / rate-limit work. Nothing was changed while reviewing.
> Purpose: decide what to **fix, improve, add, remove** before building new features.

---

## 1. Verdict in one paragraph

The engineering foundation (multi-tenancy, RBAC, quotas, jobs, realtime, audit) is solid and worth keeping. The **product layer on top of it is thin and in places wrong**: the CRM records leads but does not help an agent work them. There is no follow-up, no call/meeting logging, no deals, no WhatsApp action, no kanban board, no Arabic, and the mobile experience is a horizontally-scrolling desktop table. Several headline numbers (Stale, Response, Contacted) are computed from a field that is never written. The navigation is organised around database tables rather than an agent's day. Fix the correctness bugs first, then rebuild the daily workflow (follow-up → client profile → deals), then reports.

---

## 2. What the live walkthrough showed

| Screen | Observation |
|---|---|
| Dashboard | "Total leads **0**" while the funnel says **50 leads** (KPIs are range-scoped to lead *creation*, the funnel is all-time). Funnel bars render almost empty on desktop and mobile. Activity column leaves a large blank area beside it. Stale = 50 of 50. |
| Leads list | Clean table, good filters. "Contacted" is amber on every row. No call/WhatsApp, no next follow-up, no budget. On mobile it is a 960px table — the phone number is off-screen. |
| Lead drawer | Edit / Assign / Move / Archive + notes. Activity items all read "Activity". No WhatsApp, no budget, no attachments, notes show author **email**. |
| Pipelines | **Not a board.** It is a stage-configuration screen. Agents have nowhere to drag leads between stages. |
| Projects | Name, location, developer, status, lead count. Nothing a salesperson can quote to a client. |
| Roles | Three system roles, read-only; a 52-checkbox matrix behind "View Permissions". |
| Support | Empty two-pane chat with the vendor, top-level in the nav. |
| Navigation | Lead Sources hidden (permission typo); Files, Imports, Exports, Audit, Support each have a top-level item; `/settings` (linked from the avatar menu) is a 404. |

---

## 3. Fix first — correctness bugs

Ordered by damage. All verified in code.

| # | Bug | Evidence | Effect |
|---|---|---|---|
| 1 | **Editing a lead deletes its other project interests.** Edit dialog sends one project; API does `deleteMany` + `createMany`. | `apps/web/src/features/leads/components/edit-lead-dialog.tsx:82-92`, `apps/api/src/modules/leads/leads.service.ts:413-427` | Silent data loss on the product's core concept. |
| 2 | **`lastContactedAt` is never written.** | only read in `leads.service.ts:36,500-504` | "Contacted = Never" everywhere; Stale KPI = "open and older than 7 days"; stale chip meaningless. |
| 3 | **Response KPI ≈ 0h by construction** — the `ASSIGNED` activity written at creation counts as the first response; call/WhatsApp events are never emitted. | `leads.service.ts:158-171`, `analytics/queries/analytics-timing.query.ts:6,28-52` | Misleading headline metric. |
| 4 | **Every agent sees and can reassign every lead** in the agency. | `packages/shared/src/bootstrap/tenant-bootstrap.constants.ts:42-50`, list filters only by tenant | Lead-theft risk; owners will ask about this first. |
| 5 | **Notification dedupe is lifetime** (entity+type+recipient). Re-assigning back or re-entering a stage never notifies again. Leads assigned at creation or via import never notify. | `notifications/utils/notification-dedupe.util.ts:10`, `channels/in-app-notification.channel.ts:88-95` | Agents miss new leads. |
| 6 | Stale filter + search: second `OR` overwrites the first. | `leads.service.ts:479-487` | Wrong results. |
| 7 | Phone normalization only strips spaces/dashes; `+20…`, `0020…`, `01…` are different numbers. | `common/utils/phone-normalization.util.ts:1-3` | Duplicates slip through. |
| 8 | Activity timeline labels: lead event types (`ASSIGNED`, `NOTE_*`, `FILE_*`…) not mapped. | `features/dashboard/activity-icons.ts:13-70` | Timeline is unreadable. |
| 9 | `/settings` route missing; feature exists. | `features/settings/*`, `topbar.tsx:242,260` | 404 from avatar menu. |
| 10 | Permission typos: `lead_source.read` → `lead-source.read`, `import.create` → `import-job.create`. | `config/routes.ts:89`, `config/quick-actions.ts:34` | Lead Sources and "Import CSV" quick action never shown. |
| 11 | Web permission catalog is a hand copy, missing the SUPPORT group. | `features/roles/utils/permission-catalog.ts` | Custom roles can't get support access. |
| 12 | Soft-deleted developer/project/role names can't be reused (unique index not partial). | migration `20260626143000…:215,224` | "Already exists" for something the user deleted. |
| 13 | Dashboard: Top performers ignores range and ranks by leads *received*; two conversion definitions; "Best rate" badge compares to row 1; archived won leads double-counted. | `analytics/services/team-analytics.service.ts:11-23`, `team-performance.tsx:22,68`, `status-distribution-panel.tsx:43-44` | Numbers owners will not trust. |
| 14 | Starter plan (`analytics: false`) lands on `/dashboard` → "Failed to load". | `apps/web/src/app/page.tsx:8`, `analytics.controller.ts:30` | Broken first screen for the cheapest plan. |
| 15 | Profile save calls `PATCH /users/:id` (needs `user.update`, agents lack it); no self-service password change; no forgot-password. | `settings/mutations.ts:13-23` | Agents can't manage their own account. |
| 16 | Every notification writes an audit row (`NOTIFICATION_CREATED`, unlabeled). | `in-app-notification.channel.ts:26-43` | Floods the audit page. |

---

## 4. Area-by-area decisions

Legend: **KEEP** as is · **IMPROVE** existing · **ADD** new · **REMOVE / MOVE** out of the main nav.

### Leads (core)
| Item | Decision | Notes |
|---|---|---|
| List, filters, search | IMPROVE | Add "My leads", default to open only, show next follow-up + budget + interest level, tap-to-call / WhatsApp. Card layout under `md`. |
| Detail drawer | IMPROVE → full **client profile page** (keep drawer as quick-peek) | See §6.2. |
| Create / edit | IMPROVE | Multi-project interests (fix bug 1), budget, requirements, `type="tel"`, inline duplicate link to existing lead. |
| Bulk actions | KEEP | Move archive to one bulk endpoint; add "export selection". |
| Notes | KEEP | Add author name, edit/delete in UI, ownership rule. Notes become one *type* of activity. |
| Attachments | ADD UI | Backend is complete; no web client. |
| Duplicate handling | IMPROVE | E.164 normalization, consistent warn vs reject, merge later. |

### Pipelines
| Item | Decision | Notes |
|---|---|---|
| Stage configuration | MOVE to Settings | Works well; it's admin config, not daily work. |
| Lead board (kanban) | ADD | Drag between stages, touch-friendly, won/lost asks for reason/deal. |

### Dashboard & reports
| Item | Decision | Notes |
|---|---|---|
| KPI row | IMPROVE | Role-scoped (agent = mine, manager = team, owner = all); fix Stale/Response/Conversion; all widgets follow range; custom range. |
| Funnel, sources, project interest | KEEP after fixes | Fix bar rendering; pipeline selector instead of default-only. |
| Stats strip, Developers panel, imports/exports in feed | REMOVE | Vanity numbers. |
| Reports section | ADD | Sales, leads/sources, marketing, team, activities/meetings — needs §6 models. |

### Catalog
| Item | Decision | Notes |
|---|---|---|
| Developers page | REMOVE from nav | One-field entity; create inline from project form. |
| Projects | IMPROVE → product hub | Unit types, price/area ranges (dated), delivery, payment plans, brochures, project detail page. See §6.4. |
| Lead Sources | ADD UI, MOVE to Settings | Egypt defaults: Facebook, Instagram, TikTok, WhatsApp, Property Finder, Aqarmap, Nawy, Dubizzle, Walk-in, Referral. |

### Team
| Item | Decision | Notes |
|---|---|---|
| Users | IMPROVE, MOVE to Settings › Team | Email invite instead of typed password, phone field, team/manager, targets. |
| Roles | IMPROVE, MOVE to Settings › Team | Presets + ~10 plain-language toggles incl. **lead visibility: own / team / all**; clone system roles; delete 8 dead keys; import catalog from `@crmpro/shared`; guard `GET /roles` with `role.read`. |

### Data ops
| Item | Decision | Notes |
|---|---|---|
| Files page | REMOVE from nav | Documents live on projects (brochures/price lists) and leads (attachments). Storage view in Settings. |
| Imports page | REMOVE from nav → "Import" wizard on Leads | Add column mapping (Facebook Lead Ads / Arabic headers), import projects/budget/notes. History in Settings › Data. |
| Exports page | REMOVE from nav → "Export current view" on Leads | Pass active filters (API already supports them). |

### Operations
| Item | Decision | Notes |
|---|---|---|
| Notifications | IMPROVE | Right triggers (see bug 5), manager alerts on wins and SLA breaches, follow-up reminders, no self-notify. |
| Audit | KEEP, owner-only, MOVE to Settings | Remove notification noise; add reassignment and catalog deletes. |
| Support chat | MOVE to topbar help menu | Owner/manager by default; tickets visible across the tenant. |
| Settings | ADD route back | Company, Team, Pipelines, Lead sources, Data, My account. |

### Cross-cutting UI/UX
| Item | Decision | Notes |
|---|---|---|
| Information architecture | IMPROVE | See §5. |
| Mobile | IMPROVE (highest impact) | Card lists, bottom-sheet forms, `tel` inputs, 44px touch targets, less padding. |
| Arabic + RTL | ADD (L) | next-intl, `dir="rtl"`, logical Tailwind classes (115 physical, 0 logical today), Arabic font, EGP formatting. Do it before string count grows. |
| Global search | ADD | ⌘K searches leads by name/phone, not just routes. |
| Design system | IMPROVE | Shared PageHeader / EmptyState / ErrorState / Pagination / ConfirmDialog (9–30 copies each today); semantic status tokens; load fonts; min 12–13px text; fix primary contrast. |
| Forms | IMPROVE | Schema validation (zod + react-hook-form), inline errors, optimistic stage/assign. |
| Freshness | IMPROVE | Realtime/focus refresh for leads; new assignment → toast. |
| Code health | REMOVE | Committed `tsconfig.tsbuildinfo`, dead helpers, deprecated aliases, `animate-in` classes without plugin. |

---

## 5. Proposed navigation

```text
Today            ← agent home: due/overdue follow-ups, new assignments, stale leads
Leads            ← list + board toggle, import/export inside
Clients*         ← optional: if leads and clients are split (see open question 2)
Projects         ← developers inline, units/payment plans, documents
Deals            ← closed and in-progress reservations
Reports          ← sales · leads & sources · marketing · team · activities
─────────
Settings         ← Company · Team (users, roles, targets) · Pipelines · Lead sources · Data · Audit · My account
Help (topbar)    ← support chat
```

Removes from the sidebar: Developers, Lead Sources, Files, Imports, Exports, Roles, Users, Audit, Support, Pipelines-config.

---

## 6. What to add — your requested features, mapped to the code

### 6.1 Follow-up engine (highest priority)
Today: tasks/automation were removed (`9017031`); no next-follow-up field; `CALL_LOGGED` / `WHATSAPP_LOGGED` enum values exist but nothing writes them.

Add:
- `Activity` (or re-introduced `Task`) model: type (call, WhatsApp, meeting, site visit, office visit, note), outcome (answered, no answer, interested, not interested, follow-up, meeting booked…), `dueAt`, `completedAt`, `assigneeId`, notes.
- Logging a touch **requires the next step** (date + type) unless the lead is closed. Writes `lastContactedAt`.
- **Today** screen: overdue, due today, new uncontacted, stale.
- Reminders (in-app first, push/WhatsApp later), SLA rules (new lead not contacted in X minutes → alert manager / reassign).
- One-tap call / WhatsApp (`wa.me` with templated message) that opens the log dialog on return.

### 6.2 Rich client profile
Today: name, two phones, email, budget min/max (not exposed by the API), unused `customFields`.

Add a full page with: contact (multiple phones, WhatsApp flag), **requirements** (areas, unit type, bedrooms, area range, budget, cash vs installments, max down payment, purpose: living/investment, delivery preference, timeline), personal (job, nationality, preferred language/time), source + campaign + **referrer**, all project interests with level, timeline of every activity, deals, attachments.

### 6.3 Deals + reports
No `Deal` model exists, so no honest sales report is possible.

Add `Deal`: lead, project, unit type/code, price, down payment, payment plan, commission (amount/%), agent(s) split, status (reserved, contracted, cancelled), dates. Won stage requires a deal; Lost requires a reason.

Reports on top: **Sales** (units, EGP value, commission by period/agent/project/developer) · **Leads & sources** (volume, conversion, cost per lead once campaigns exist) · **Marketing** (needs `Campaign`: source, platform, spend, period) · **Team** (activities, meetings, conversions, response time, targets vs actual) · **Activities/meetings** (by type, outcome, agent). Export to Excel/PDF.

### 6.4 Properties
Current product decision (`docs/product/competitive-positioning.md`, `prd.md`): no live unit inventory, because developer data goes stale.

Recommended middle path:
- Enrich **Project**: unit types (type, area range, starting price, **as-of date**), delivery date, finishing, amenities, location/map, brochures and price lists (dated files).
- **Payment-plan templates** per project (down payment %, years, frequency, maintenance %, delivery payment).
- If agencies do **resale**, add a separate `Listing`/`Unit` module (owner, exact unit, asking price) — that data is stable because the agency owns it.
- Decision needed — see open question 1.

### 6.5 Installments calculator
Stateless, small (S). Inputs: price (or pick project unit type), payment-plan template or manual (down payment %, years, frequency, maintenance). Output: schedule table, monthly/quarterly amount; share as PDF / WhatsApp text; optionally save to the lead.

### 6.6 Referrals
Add `referrerType` (client, broker, employee, other) + `referrerId`/name on the lead, a "Referral" source, referral commission on the deal, and a referrals report.

---

## 7. Suggested order of work

| Phase | Content | Why first |
|---|---|---|
| **0 — Hygiene** (days) | Commit or finish the pending WIP; fix bugs 1, 6, 7, 9, 10, 11, 12, 14, 16; remove dead code/artifacts. | Small, removes embarrassment. |
| **1 — Daily workflow** | Activity/follow-up engine, Today screen, call/WhatsApp actions, timeline labels, lead visibility scoping, notification triggers, mobile lead cards, nav restructure + Settings. | This is what makes it a CRM instead of a list. Fixes bugs 2–5. |
| **2 — Client & product data** | Client profile page, project enrichment + payment plans + documents, installments calculator, referrals, kanban board. | Gives agents something to sell with. |
| **3 — Deals & reports** | Deal model, won/lost flow, reports suite, campaigns, exports. | Owners buy on reports; needs phases 1–2 data. |
| **4 — Arabic/RTL + polish** | Can start in parallel after phase 1 freezes the screens; design-system extraction alongside. | Large but mechanical. |

---

## 8. Open questions for the owner

1. **Properties:** primary (off-plan) only, or resale too? This decides between "enriched projects" and a real `Unit/Listing` module.
2. **Lead vs client:** one record that moves through stages, or a separate Client that can have several leads/deals over time (repeat buyers, investors)?
3. **Lead visibility default** for agents: own only, or own + unassigned pool?
4. **Arabic:** Arabic-first, or bilingual with a per-user toggle?
5. **Reports priority:** which three reports would close the first sale?
