# Plan 07 — Daily Work: Activities, Follow-ups, Kanban

**Goal:** give agents a daily loop inside the CRM — log every call/WhatsApp/meeting/visit, always have a next follow-up, get reminded, and move leads on a board.
**Order:** seventh (builds on Plan 06 lead scope).
**Status:** ☑ complete

---

## 1. Activity logging ✅

- `POST /leads/:id/activities` (`lead-activity.create`): `{ type: CALL|WHATSAPP|EMAIL|MEETING|SITE_VISIT, outcome?, durationSeconds?, note?, occurredAt?, nextFollowUp? }`.
- New activity types `MEETING_LOGGED`, `SITE_VISIT_LOGGED`; every logged attempt moves `Lead.lastContactedAt` and sets `Lead.firstContactedAt` once (speed-to-lead). Future `occurredAt` rejected.
- Response-time analytics now count meetings and visits; activity logging invalidates analytics.

**Accept:** logging a call stamps contact times and can schedule the next follow-up in the same transaction.

## 2. Follow-ups (tasks) ✅

- `Task` model (`apps/api/src/modules/tasks`), lean successor of the removed Phase-1 module: types CALL/WHATSAPP/MEETING/SITE_VISIT/EMAIL/FOLLOW_UP/OTHER, status OPEN/DONE/CANCELLED, overdue derived.
- `GET /tasks`, `GET /tasks/summary`, `GET/PATCH/DELETE /tasks/:id`, `POST /tasks`, `POST /tasks/:id/complete` (optional next follow-up), `POST /tasks/:id/cancel`. Permissions `task.read/create/update/delete`; visibility follows the lead scope (by assignee).
- `Lead.nextFollowUpAt` = earliest open follow-up; new lead filters `neverContacted`, `noFollowUp`; sortable by `nextFollowUpAt`.
- Reminders: shared `SchedulerModule` (one BullMQ repeatable queue) runs `task-reminders` every minute → `TASK_DUE` 15 min before, one `TASK_OVERDUE` after; claimed with conditional updates so each fires once; suspended tenants skipped.

**Accept:** a follow-up due in 2 minutes produced a "Follow-up Due Soon" notification within one scan (verified live).

## 3. Lead lifecycle ✅

- `POST /leads/:id/archive`, `POST /leads/:id/restore`, `DELETE /leads/:id` (soft, `lead.delete`), `POST /leads/bulk/archive|restore` (replaces the client-side loop).
- Status changes write `STATUS_ARCHIVED/RESTORED` + audit (`LEAD_*`); archive/delete cancel open follow-ups.

## 4. Fixes ✅

- `InAppNotificationChannel` now publishes `NotificationCreatedEvent` after commit → realtime notification badges actually update.
- `REMINDER` notifications map to the Follow-ups preference (was Marketing).
- Realtime: sockets join `tenant:<id>`; data-free `invalidate {entity: leads|tasks}` on lead and task events.
- TASK_* notification templates.

## 5. Web ✅

- Lead drawer: Call / WhatsApp (opens wa.me) / Meeting / Visit quick actions → log dialog with outcome chips that pre-pick the next follow-up; Follow-ups section (schedule, done, cancel); all interested projects; detailed timeline.
- `/today`: KPI tiles + overdue / due today / coming up / leads not contacted yet (scope-aware, manager sees assignees).
- Leads: List ↔ Board toggle (`?view=board`), per-stage columns with load-more, drag to move stage with optimistic rollback, closed stages collapsed; "Not contacted" / "No follow-up" chips; Follow-up column.
- Role editor knows the new permissions.

---

## Out of scope
Recurring tasks, calendar sync, task dependencies (still excluded by the MVP scope).

## Definition of done
Agents can run their whole day from Today + the lead drawer, reminders fire once, and every action lands on the lead timeline.
