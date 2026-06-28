# CRMPro — Architecture Overview

# Overview

CRMPro is a multi-tenant SaaS CRM platform built for real estate marketing agencies.

The system is designed around three major applications:

- CRM application (tenant-facing)
- Admin dashboard (internal)
- Backend API (central business logic)

Architecture prioritizes:

- tenant isolation
- scalability
- maintainability
- developer productivity
- AI-assisted development compatibility

---

# High-Level Architecture

System consists of:

Frontend Layer
→ Backend API Layer
→ Infrastructure Layer

---

## Frontend Layer

Contains two independent web applications.

### CRM Application

Used by tenant users.

Actors:

- agency admins
- managers
- agents

Responsibilities:

- lead management
- project management
- settings
- reporting
- day-to-day operations

---

### Admin Dashboard

Used internally by CRMPro.

Actors:

- super admins
- support operators

Responsibilities:

- tenant management
- subscription management
- platform analytics
- support tooling

---

## Backend API Layer

Single centralized backend.

Responsible for:

- authentication
- authorization
- business rules
- validation
- database access
- background job orchestration
- integrations
- audit logging

The API is the source of truth for business logic.

Frontend applications should remain thin.

Business logic should not be duplicated in frontend apps.

---

## Infrastructure Layer

Core infrastructure services:

- relational database
- cache / queue system
- object storage (future)
- email provider (future)
- monitoring / analytics

---

# Monorepo Structure

CRMPro uses a monorepo architecture.

```text
/apps
  /crm
  /admin
  /api

/packages
  /shared
  /theme

/docs
```

---

## apps/crm

Tenant-facing CRM frontend.

Tech stack:

- Next.js
- React
- Tailwind
- shadcn/ui

Responsibilities:

- UI rendering
- state management
- API consumption
- user interactions

This application should contain minimal business logic.

---

## apps/admin

Internal administration dashboard.

Tech stack:

- Next.js
- React
- Tailwind
- shadcn/ui

Responsibilities:

- internal tooling
- platform operations
- tenant administration

This application is isolated from tenant workflows.

---

## apps/api

Central backend service.

Tech stack:

- NestJS
- Prisma
- PostgreSQL
- Redis

Responsibilities:

- modules
- services
- authorization
- orchestration
- persistence

All core business logic belongs here.

---

## packages/shared

Shared TypeScript package.

Contains reusable shared logic such as:

- enums
- constants
- event names
- shared types
- validation schemas

Examples:

- permissions
- lead statuses
- analytics event names

---

## packages/theme

Shared design tokens.

Contains:

- colors
- CSS variables
- typography
- spacing
- radius
- shadows

Purpose:
Maintain consistent visual identity between CRM and Admin.

---

# Architectural Principles

The following principles guide system design.

---

# 1. Backend Owns Business Logic

Critical principle.

Business rules must live in backend services.

Avoid placing critical business logic inside:

- React components
- hooks
- frontend state

Frontend should primarily:

- render UI
- gather user input
- call APIs

Backend should decide:

- what is allowed
- what happens
- what gets persisted

---

# 2. Multi-Tenancy by Design

CRMPro is multi-tenant from day one.

Every tenant represents a real estate agency.

Tenant isolation is mandatory.

Business entities typically belong to a tenant.

Examples:

- users
- leads
- projects
- roles
- audit logs

Cross-tenant data leakage must never happen.

Tenant isolation rules are documented separately.

---

# 3. Role-Based Authorization

Authorization uses RBAC.

Permissions determine allowed actions.

Examples:

- lead.create
- lead.update
- project.read
- settings.manage

Authorization is enforced in:

## Backend

Mandatory

## Frontend

Optional UX improvement

Frontend may hide UI actions.

Backend must always validate permissions.

---

# 4. Modular Backend Design

Backend is organized by modules.

Examples:

- auth
- tenants
- users
- roles
- leads
- projects
- imports
- audit logs

Each module should encapsulate:

- controller
- service
- DTOs
- repository access
- business rules

Dependencies between modules should remain explicit and minimal.

---

# 5. Thin Controllers, Fat Services

Controllers should remain lightweight.

Controller responsibilities:

- request parsing
- validation
- response formatting

Services should handle:

- business logic
- orchestration
- domain rules

Bad:

Controller contains business logic.

Good:

Controller delegates to service.

---

# 6. Async Processing for Heavy Work

Not all work should happen synchronously.

Heavy operations should run in background jobs.

Examples:

- imports
- exports
- notifications
- task reminders
- analytics processing
- workflow automation
- future AI tasks
- external integrations

Benefits:

- faster response times
- better UX
- improved reliability

---

# 7. Auditability

Important actions should be traceable.

System should preserve accountability for:

- creations
- updates
- deletions
- assignments
- administrative actions

Audit logging is a core architectural concern.

Not optional.

---

# 8. Shared Contracts

Whenever possible, frontend and backend should share contracts.

Examples:

- enums
- event names
- validation schemas
- API types

This reduces drift between applications.

Monorepo structure enables this.

---

# Technology Stack

## Frontend

- Next.js
- React
- Tailwind CSS
- shadcn/ui

---

## Backend

- NestJS
- TypeScript
- Prisma

---

## Infrastructure

- PostgreSQL
- Redis
- Docker

---

# Communication Flow

Typical request flow:

User Action
→ Frontend
→ API Request
→ Guard / Auth Validation
→ Service Layer
→ Database
→ Response
→ Frontend Update

Example:

Create Lead

Agent submits form
→ CRM frontend
→ POST /leads
→ auth guard
→ permission check
→ leads service
→ database write
→ audit log
→ response

---

# Future Scalability

Architecture should support future additions without major rewrites.

Planned future systems:

- AI services
- WhatsApp integration
- Meta Ads integration
- Google Ads integration
- analytics pipelines
- workflow automations

Current architecture should remain extensible for these features.

---

# Documentation Map

Additional architecture documents:

- multitenancy.md
- auth.md
- permissions.md
- events.md

These documents define subsystem details beyond this overview.
