# CRMPro — AI Coding Rules

# Purpose

This document defines coding rules and architectural constraints for all AI agents working on CRMPro.

Examples of AI agents:

- Cursor Agent
- Claude Code
- ChatGPT coding assistants

The goal is to ensure AI-generated code remains:

- consistent
- maintainable
- secure
- aligned with project architecture

These rules are mandatory unless explicitly overridden by a human developer.

---

# Project Overview

CRMPro is a multi-tenant SaaS CRM for real estate marketing agencies.

Monorepo structure:

```text
/apps
  /crm
  /admin
  /api

/packages
  /shared
  /theme
```

Tech stack:

Frontend:

- Next.js
- React
- Tailwind
- shadcn/ui

Backend:

- NestJS
- Prisma
- PostgreSQL
- Redis

---

# Primary Rule

AI must optimize for:

- maintainability
- clarity
- correctness
- long-term scalability

Do not optimize for cleverness.

Prefer boring, clean, predictable code.

---

# Documentation Priority

When project documentation exists, AI must follow it.

Priority order:

1. Human explicit instruction
2. `/docs/ai`
3. `/docs/architecture`
4. `/docs/product`
5. Existing codebase patterns

If documentation conflicts with generated assumptions:

Documentation wins.

---

# Architecture Rules

---

## Rule 1 — Respect Module Boundaries

Backend modules should remain isolated.

Examples:

- auth
- tenants
- users
- roles
- leads
- projects
- audit logs

Avoid tight coupling.

Bad:
Leads service directly contains role management logic.

Good:
Use clear service boundaries.

---

## Rule 2 — Backend Owns Business Logic

Critical business logic belongs in backend.

Never place business rules primarily in frontend.

Frontend responsibilities:

- render UI
- collect input
- call APIs

Backend responsibilities:

- validation
- authorization
- business rules
- persistence

Bad:
React component decides whether user may assign lead.

Good:
Backend validates assignment permission.

---

## Rule 3 — Thin Controllers, Fat Services

Controllers should stay minimal.

Controllers should only handle:

- route definitions
- request parsing
- validation
- response formatting

Services should handle:

- orchestration
- business logic
- workflows

Bad:
Complex logic inside controller.

Good:
Controller delegates to service.

---

# Multi-Tenancy Rules

These rules are critical.

Violations may cause severe security issues.

---

## Rule 4 — Assume Business Data Is Tenant-Scoped

Unless explicitly documented otherwise, assume entities are tenant-owned.

Examples:

- users
- roles
- leads
- projects
- notes
- audit logs

Default assumption:

Entity requires tenant context.

---

## Rule 5 — Never Query Tenant Data Without Tenant Filtering

Bad:

```ts
prisma.lead.findMany();
```

Unsafe.

Good:

```ts
prisma.lead.findMany({
  where: {
    tenantId,
  },
});
```

Mandatory.

---

## Rule 6 — Never Trust Client-Provided Tenant Ownership

Never trust:

- tenantId in body
- tenantId in query params
- tenantId in frontend state

Tenant ownership must be derived from authenticated session.

---

# Authorization Rules

---

## Rule 7 — Permissions Over Role Names

Never hardcode role names in business logic.

Bad:

```ts
if (user.role === 'admin')
```

Bad because tenant roles are customizable.

Good:

```ts
if (hasPermission(user, Permission.LEAD_CREATE))
```

Permissions are the source of truth.

---

## Rule 8 — Backend Authorization Is Mandatory

Frontend permission checks improve UX only.

They are not security.

Protected backend actions must validate:

- authentication
- tenant scope
- permissions

---

# Database Rules

---

## Rule 9 — Prefer Explicit Relations

Schema relationships should be explicit and readable.

Prefer clarity over overly abstract schemas.

Good:
Clear foreign keys and relation names.

Bad:
Ambiguous relationships.

---

## Rule 10 — Prefer UUID IDs

Use UUIDs for primary identifiers unless there is a strong reason otherwise.

Avoid sequential IDs for external entities.

---

## Rule 11 — Preserve Auditability

Important actions should be traceable.

Examples:

- create
- update
- delete
- assign
- permission changes

When implementing important mutations, consider audit logging.

Ask:

Should this action be logged?

Usually yes.

---

# API Rules

---

## Rule 12 — Keep API Consistent

Follow consistent API conventions.

Prefer predictable resource naming.

Examples:

Good:

- /auth
- /users
- /leads
- /projects

Avoid inconsistent naming.

---

## Rule 13 — Validate Inputs at Boundaries

Never trust incoming data.

Validate at API boundaries.

Examples:

- DTO validation
- schema validation
- sanitization

Validation should happen before business logic.

---

# Frontend Rules

---

## Rule 14 — Keep Components Small and Composable

Prefer smaller reusable components.

Avoid giant components.

Bad:
1000-line page component.

Good:
Composed sections and reusable UI pieces.

---

## Rule 15 — Prefer Server Components by Default

In Next.js apps:

Default to server components unless client interactivity is required.

Use client components only when needed.

Examples:

- local state
- event handlers
- browser APIs
- hooks

Avoid unnecessary `"use client"`.

---

## Rule 16 — Centralize Permission Checks

Do not scatter permission checks across random components.

Bad:

```tsx
if (user.permissions.includes(...))
```

everywhere.

Preferred:
Central permission utilities.

Examples:

- hooks
- guards
- helper functions
- wrapper components

---

## Rule 17 — Reuse Shared Contracts

If types, enums, or schemas are shared between frontend and backend:

Use shared packages.

Avoid duplicating:

- enums
- event names
- status definitions

Shared code belongs in:

```text
/packages/shared
```

---

# Styling Rules

---

## Rule 18 — Use Existing Design System

UI must follow project design system.

Theme is centralized in:

```text
/packages/theme
```

Use existing:

- spacing
- colors
- typography
- radius
- shadows

Avoid introducing random styling.

---

## Rule 19 — Prefer shadcn/ui Patterns

Use consistent UI primitives.

Examples:

- Dialog
- Sheet
- Table
- Form
- Tabs

Avoid inventing inconsistent UI patterns.

---

# Code Quality Rules

---

## Rule 20 — Prefer Readability Over Cleverness

Avoid overly clever code.

Future maintainability matters more than short code.

Good:
Readable and explicit.

Bad:
Dense abstractions that save 10 lines.

---

## Rule 21 — Avoid Premature Abstraction

Do not abstract too early.

Only create abstractions when repetition becomes meaningful.

Bad:
5 abstraction layers for simple logic.

Good:
Simple implementation first.

---

## Rule 22 — Do Not Introduce New Libraries Lightly

Before adding dependencies, ask:

Does existing stack already solve this?

Avoid unnecessary package bloat.

---

# Async / Jobs Rules

---

## Rule 23 — Heavy Work Should Be Async

Avoid blocking request lifecycle with heavy operations.

Examples:

- imports
- exports
- notifications
- analytics processing
- AI processing

Prefer queues and background workers.

---

## Rule 24 — Async Jobs Must Preserve Tenant Context

Every tenant-related job must carry tenant context.

Example:

```json
{
  "tenantId": "...",
  "jobType": "import"
}
```

Mandatory.

---

# AI Behavior Rules

These rules apply specifically to AI agents.

---

## Rule 25 — Do Not Assume Missing Requirements

If requirements are unclear:

- ask
  or
- leave extensibility

Do not invent business requirements.

---

## Rule 26 — Do Not Rewrite Unrelated Code

When implementing a feature:

Touch only relevant code.

Avoid unnecessary refactors.

---

## Rule 27 — Follow Existing Code Patterns

Before generating code:

Inspect nearby code.

Match existing conventions for:

- naming
- structure
- style
- patterns

Consistency matters.

---

## Rule 28 — Explain Architectural Tradeoffs

When suggesting major architectural changes:

Explain:

- why
- tradeoffs
- alternatives

Do not silently introduce major architectural changes.

---

# Final Principle

When in doubt, prefer code that a senior engineer can understand in 30 seconds.

CRMPro values:

- security
- correctness
- maintainability
- simplicity
- scalability

AI-generated code must reinforce these values.
