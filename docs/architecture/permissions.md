# CRMPro — Permissions & Authorization Architecture

# Overview

CRMPro uses Role-Based Access Control (RBAC) for authorization.

Authorization determines:

- what actions a user can perform
- what resources a user can access
- what UI capabilities should be visible

Authentication answers:

> Who is the user?

Authorization answers:

> What is the user allowed to do?

These are separate concerns.

---

# Core Principle

Permissions are the source of truth for authorization.

Roles are containers of permissions.

Users receive permissions through roles.

Relationship:

Tenant
→ Roles
→ Permissions
→ Users

This allows each tenant to customize access control.

---

# Authorization Goals

The permissions system must support:

- secure backend authorization
- flexible tenant-defined roles
- fine-grained access control
- frontend UX adaptation
- future extensibility

---

# Why Custom Roles?

Different agencies operate differently.

Example agency A:

- Admin
- Manager
- Agent

Example agency B:

- Owner
- Team Lead
- Sales
- Call Center
- QA Reviewer

Hardcoded roles are too restrictive.

CRMPro allows tenants to create custom roles.

Roles are tenant-scoped.

---

# Permission Model

Permissions are atomic capability identifiers.

Each permission represents one allowed action.

Examples:

```text id="perms"
lead.read
lead.create
lead.update
lead.delete
project.read
project.create
settings.manage
```

Permissions should be:

- stable
- predictable
- machine-readable

---

# Permission Naming Convention

Use:

```text id="permformat"
resource.action
```

Pattern:

```text id="permformat2"
<module>.<action>
```

Examples:

---

## Leads

```text id="leadperms"
lead.read
lead.create
lead.update
lead.delete
lead.assign
lead.import
lead.export
```

---

## Projects

```text id="projectperms"
project.read
project.create
project.update
project.delete
```

---

## Users

```text id="userperms"
user.read
user.create
user.update
user.delete
```

---

## Roles

```text id="roleperms"
role.read
role.create
role.update
role.delete
```

---

## Settings

```text id="settingsperms"
settings.read
settings.manage
```

---

## Billing

```text id="billingperms"
billing.read
```

---

# Role Model

A role is a named collection of permissions.

Examples:

---

## Admin Role

Likely has:

- all lead permissions
- all project permissions
- settings management
- user management

---

## Manager Role

Likely has:

- read leads
- assign leads
- update leads
- read analytics

May not have:

- billing access
- role management

---

## Agent Role

Likely has:

- read assigned leads
- update assigned leads
- create notes

May not have:

- delete leads
- manage users
- modify settings

---

# Default Roles

When a tenant is created, system initializes default roles.

Suggested defaults:

- Agency Owner
- Manager
- Agent

Tenants may later:

- modify defaults
- create new roles
- remove unused roles

---

# Custom Roles

Tenants can create custom roles.

Examples:

- Call Center
- Sales Intern
- Marketing Analyst
- Operations Manager

Custom roles allow tenant-specific workflows.

---

# Permission Storage

Permissions should be centrally defined in code.

Reason:

Permission names must remain consistent.

Bad:

Random strings across codebase.

Example:

```ts id="badperm"
"lead_read";
"readLead";
"lead.read";
```

Inconsistent.

---

Good:

Shared constants or enums.

Example:

```ts id="goodperm"
Permission.LEAD_READ;
```

This should live in:

```text id="sharedperm"
/packages/shared
```

Examples:

- enums
- constants
- permission registry

---

# Backend Enforcement

Backend authorization is mandatory.

This is the primary security layer.

Every protected action must verify:

1. user authenticated
2. tenant valid
3. resource belongs to tenant
4. permission granted

All four checks matter.

---

# Important Rule

Frontend permission checks are not security.

They improve UX only.

Backend must always validate permissions.

Never rely on frontend restrictions for security.

---

# Authorization Flow

Protected request flow:

Request
→ Authentication Guard
→ Tenant Resolution
→ Permission Guard
→ Controller
→ Service

Permission checks happen before business logic executes.

---

# Example Backend Check

Example action:

User attempts to create lead.

Required permission:

```text id="leadcreate"
lead.create
```

Flow:

1. authenticate user
2. resolve role
3. resolve permissions
4. verify permission exists
5. allow or reject

---

# Permission Guards

Authorization should be implemented using backend guards.

Recommended pattern in NestJS:

- custom decorators
- permission guard
- metadata reflection

Example concept:

Controller route declares required permission.

Guard verifies access.

This keeps authorization declarative and reusable.

---

# Resource-Level Authorization

Permissions alone may not be sufficient.

Sometimes ownership matters.

Example:

Agent has:

```text id="leadupdate"
lead.update
```

Question:

Can they update any lead?

Maybe not.

Business rule may say:

Agent may update only assigned leads.

This is resource-level authorization.

Examples:

---

## Global Permission Check

Can user update leads?

Yes / No

---

## Resource Ownership Check

Can user update this specific lead?

Depends on:

- assignment
- ownership
- business rules

Both may be required.

---

## Lead Data Scope (implemented — Plan 06)

Lead visibility is a **data scope**, granted by permissions like everything else:

| Permission | Scope | Sees |
|---|---|---|
| `lead.read-all` | `all` | every lead in the tenant |
| `lead.read-team` | `team` | leads assigned to members of the user's team or teams they lead, plus unassigned leads |
| neither | `own` | only leads assigned to the user |

Rules:

- `LeadScopeService.resolve(user, permissionKeys)` (`apps/api/src/modules/leads/scope`) turns permissions into a `LeadScope`; `leadScopeWhere(scope)` turns it into a Prisma filter.
- Every lead read and workflow path takes a scope: list, detail, update, stage, assignment, notes, timeline, attachments, bulk actions, files linked to leads, exports, analytics (including raw SQL via `buildLeadScopeSql`) and analytics cache keys.
- Out-of-scope leads behave exactly like missing leads (**404**, never 403).
- Duplicate-phone warnings only reveal the owner's name for out-of-scope matches.
- Import/export jobs and their files are visible only to their creator unless the user has `lead.read-all` (they contain bulk lead data).
- Background jobs freeze the requester's scope on the job (`StoredLeadScope`) because workers have no user context.
- Without `lead.assign`, a user always owns the leads they create. Scoped users can only assign inside their scope.
- Defaults: Owner = `all`, Manager = `team`, Agent = `own` (and no `lead.assign`).

---

# Frontend Authorization

Frontend uses permissions for UI adaptation.

Examples:

Show/hide:

- buttons
- pages
- actions
- menu items
- table actions

Examples:

Without permission:

Hide:

- Delete button
- Import button
- Settings page

---

# UI Principle

Prefer disabling or hiding inaccessible actions.

This improves clarity and reduces confusion.

---

# Recommended Frontend Pattern

Avoid scattered permission checks like:

```tsx id="badfrontend"
if (user.permissions.includes(...))
```

across random components.

This becomes messy.

---

Preferred pattern:

Centralized permission utilities.

Examples:

- permission hooks
- permission context
- guard components
- route metadata

This improves maintainability.

---

# Route-Level Authorization

Some pages require permissions to access.

Examples:

---

## Settings Page

Requires:

```text id="settingsmanage"
settings.manage
```

---

## Billing Page

Requires:

```text id="billingread"
billing.read
```

---

## Roles Management

Requires:

```text id="rolemanage"
role.read
```

or stronger permissions.

---

# Permission Caching

Permissions may be cached per session.

Useful because permission checks are frequent.

Potential cache layers:

- JWT claims (limited)
- Redis cache
- in-memory cache

If permissions change:

Cache must be invalidated.

Example:
Admin edits role.

Affected users must eventually receive updated permissions.

---

# Super Admin Permissions

Admin dashboard uses separate authorization model.

Super admins are platform operators.

They may access:

- all tenants
- global analytics
- subscription controls

This authorization layer is separate from tenant RBAC.

Do not mix tenant roles with super admin roles.

---

# AI / Developer Rules

All AI agents and developers must follow these rules.

---

Rule 1
Never hardcode role names in business logic.

Bad:

- if role == admin

Good:

- check permissions

---

Rule 2
Permissions are the source of truth, not role names.

---

Rule 3
Backend permission checks are mandatory for protected actions.

---

Rule 4
Frontend permission checks improve UX but are not security.

---

Rule 5
Custom tenant roles must be supported by design.

System architecture must assume roles are dynamic.
