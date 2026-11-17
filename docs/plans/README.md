# CRMPro Roadmap

Post-audit workstreams (audit: August 2026). Executed strictly in order, one plan at a time.
Each plan file is self-contained with acceptance criteria and a definition of done.

| # | Plan | Focus | Status |
|---|---|---|---|
| 01 | [Security Hardening](./01-security-hardening.md) | rate limiting, CORS fail-closed, WebSocket auth, RBAC fail-closed, cookie parity, token reuse detection | ✅ complete |
| 02 | [Quality Gates](./02-quality-gates.md) | fix red tests, turbo test/lint/typecheck tasks, GitHub Actions CI | ✅ complete |
| 03 | [Commercial Correctness](./03-commercial-correctness.md) | plan snapshots, termination lifecycle, suspended-tenant workers, atomic audit | ✅ complete |
| 04 | [Frontend Finish](./04-frontend-finish.md) | dead routes, route guards, error boundaries, realtime prod config, i18n groundwork | ✅ complete |
| 05 | [Ops Foundation](./05-ops-foundation.md) | Dockerfiles, prod compose, backups, alerting — **deferred until hosting/VPS is chosen** | ☐ blocked |
| 06 | [Access Scoping & Teams](./06-access-scoping.md) | lead data scope (own/team/all), teams, scoped analytics/exports | ✅ complete |
| 07 | [Daily Work](./07-daily-work.md) | activity logging, follow-ups + reminders, Today view, Kanban, lead lifecycle API | ✅ complete |
| 08 | [Email & Invitations](./08-email-invites.md) | mail queue + Mailpit, password reset, email invites, email notifications | ✅ complete |
| 09 | [Distribution, SLA & Inbound API](./09-distribution-sla-inbound.md) | workspace settings, round-robin, speed-to-lead SLA, API keys + inbound webhook | ✅ complete |
| 10 | [Workspace & Customization](./10-workspace-customization.md) | workspace name/logo, billing view, custom fields, saved views | ✅ complete |
| 11 | [Import/Export & Project Updates](./11-import-export-project-updates.md) | Excel import wizard with Arabic header matching, retry-safe imports, XLSX export, project updates & files | ✅ complete |

## Working agreement

- Work one plan per focused session; tick boxes in the plan file as items land.
- Every plan ends with the relevant suites green and no new lint errors.
- Plan 05 intentionally last: no VPS/hosting exists yet, so deployment work is staged but not started. Its only non-deferred item is the local compose healthcheck fix (§6).
