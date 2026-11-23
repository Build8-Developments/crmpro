# CRMPro — Product Requirements Document (PRD)

## 1. Product Overview

CRMPro is a multi-tenant SaaS CRM platform built specifically for real estate marketing agencies in the MENA region.

The platform helps agencies manage:

- leads
- projects
- agents and teams
- sales workflows
- activity tracking
- accountability and reporting

Unlike traditional real estate CRMs, CRMPro does **not** focus on unit-level property inventory management.

Instead, the system is designed around **projects**.

Examples of projects:

- Badya Badya Palm Hills
- Mountain View Mountain View

This is based on industry insight:

Real estate marketing agencies often do **not maintain accurate unit inventory inside CRMs**, because:

- pricing changes daily or hourly
- availability changes constantly
- updates usually arrive through WhatsApp groups and internal channels

Therefore, CRMPro models client interest at the **project level**, not unit level.

---

# 2. Problem Statement

Most agencies currently operate using a fragmented stack:

- Excel / Google Sheets
- WhatsApp
- Phone calls
- Manual lead assignment
- Poor visibility into agent activity

This causes major problems:

## Lead Chaos

Leads are scattered and difficult to track.

## Poor Accountability

Managers cannot clearly see what agents are doing.

## Lost Opportunities

Leads become stale due to missed follow-ups.

## Weak Reporting

Owners lack visibility into:

- pipeline
- conversion
- team performance

---

# 3. Product Vision

Build the leading CRM platform for real estate marketing agencies in the MENA region.

The platform should:

- simplify lead management
- improve sales team accountability
- reduce operational chaos
- provide actionable analytics
- become the operational backbone for agencies

Long-term vision includes:

- AI assistant features
- multi-channel Meta messaging, beginning with WhatsApp
- Meta Ads attribution and closed-loop outcome reporting
- Project Files for raw developer price lists and inventory sheets
- Google Ads integration
- automation workflows

These are **not part of MVP**.

Confirmed post-MVP scope, sequencing, pricing principles, and non-decisions are maintained in
[`phase-2-roadmap.md`](phase-2-roadmap.md). Meta-specific architecture is maintained in
[`../architecture/meta-platform-integrations.md`](../architecture/meta-platform-integrations.md).

---

# 4. Target Users

## 4.1 Super Admin (Platform Owner)

Internal CRMPro operator.

Responsibilities:

- create tenants
- manage subscriptions
- support agencies
- manage platform analytics

This user accesses the **Admin Dashboard**.

---

## 4.2 Agency Owner / Admin

Highest-level user inside a tenant.

Responsibilities:

- manage team
- manage roles
- track business performance
- view reports
- configure settings

---

## 4.3 Manager / Team Lead

Responsibilities:

- assign leads
- track agent performance
- monitor pipeline

---

## 4.4 Agent / Sales Representative

Daily CRM user.

Responsibilities:

- view assigned leads
- contact clients
- add notes
- update lead statuses
- schedule follow-ups

---

# 5. MVP Scope

The MVP includes only core CRM functionality.

## Included Modules

- Authentication
- Multi-tenancy
- User Management
- Roles & Permissions
- Projects
- Leads
- Notes / Activity Timeline
- Imports / Exports
- Audit Logs
- Settings
- Billing Overview (display only)

---

## Explicitly Out of Scope (MVP)

The following features are intentionally excluded:

- AI features
- WhatsApp integration
- Meta Ads integration
- Google Ads integration
- Marketing automation
- Property inventory / units
- Payment gateway billing
- Mobile apps

---

# 6. Core Product Concepts

## 6.1 Tenant

A tenant represents an agency.

Each tenant has isolated data.

Examples:

- Agency A
- Agency B

Tenant isolation is mandatory.

All tenant business data must be scoped by:

- tenant_id

---

## 6.2 Project

A project represents a real estate development.

Examples:

- Badya
- Mountain View iCity

Projects are **not units**.

Project data may include:

- name
- developer
- location
- delivery date
- tags
- description

---

## 6.3 Lead

A lead represents a potential customer.

A lead may be interested in one or multiple projects.

Lead data includes:

- name
- phone
- email (optional)
- source
- assigned user
- status
- notes
- interested projects

---

# 7. Functional Requirements

# 7.1 Authentication

Users must be able to:

- login
- logout
- reset password
- maintain authenticated session

Requirements:

- secure authentication
- JWT-based sessions
- role-aware access

---

# 7.2 Multi-Tenancy

System must support multiple agencies.

Requirements:

- strict tenant isolation
- tenant-scoped data access
- no cross-tenant leakage

Every business entity must include:

- tenant_id

Examples:

- users
- leads
- projects
- audit logs

---

# 7.3 User Management

Agency admins can:

- create users
- deactivate users
- edit users
- assign roles

User fields:

- name
- email
- phone (optional)
- role
- status

---

# 7.4 Roles & Permissions (RBAC)

Agencies can define custom roles.

Examples:

- Admin
- Manager
- Agent
- Call Center

Permissions are granular.

Examples:

- lead.read
- lead.create
- lead.update
- lead.delete
- project.read
- project.create
- settings.manage

UI must adapt to permissions.

Unauthorized actions should:

- be hidden in UI
- be blocked in API

---

# 7.5 Projects Module

Users can:

- create projects
- edit projects
- archive projects
- search projects

Project fields:

- name
- developer
- location
- description
- status

---

# 7.6 Leads Module

This is the main module.

Users can:

- create leads
- import leads
- edit leads
- assign leads
- filter leads
- search leads

Lead fields:

Required:

- name
- phone
- source
- status

Optional:

- email
- budget
- notes
- project interests

---

## Lead Pipeline Stages

Default stages:

- New
- Contacted
- Qualified
- Viewing Scheduled
- Negotiating
- Closed Won
- Closed Lost

Tenants may customize stages later.

---

# 7.7 Notes / Activity Timeline

Agents can log activity.

Supported activity:

- notes
- calls
- follow-up actions
- status changes

Each lead has timeline history.

Example:

Today 4:10 PM
Ahmed:
Client wants 3BR under 8M

---

# 7.8 Imports / Exports

System supports CSV imports.

Import flow:

1. Upload CSV
2. Map columns
3. Validate rows
4. Preview
5. Import

Export supported for:

- leads
- projects

---

# 7.9 Audit Logs

System tracks important actions.

Examples:

- lead created
- lead assigned
- status changed
- user updated
- role changed

Audit logs support:

- filtering
- timestamps
- actor visibility

Purpose:

- accountability
- debugging
- compliance

---

# 7.10 Billing Overview

This is informational only.

Displays:

- current plan
- limits
- start date
- next billing date
- amount

No payment processing in MVP.

---

# 8. Admin Dashboard Requirements

Admin dashboard is internal-only.

Used by CRMPro team.

Modules:

## Tenant Management

- create tenant
- deactivate tenant
- view tenant details

## Subscription Management

- plan assignment
- limits

## Global Analytics

- total tenants
- total users
- total leads

## Support Tools

- inspect tenant state
- troubleshoot issues

---

# 9. Non-Functional Requirements

## Performance

- API response under 300ms for common operations
- fast filtering and search

---

## Security

- secure authentication
- RBAC enforcement
- tenant isolation
- audit logging

---

## Scalability

Architecture must support:

- many tenants
- large lead datasets
- high activity volume

Example scale target:

- 100+ tenants
- 100K+ leads per tenant

---

## Reliability

System should be highly available and fault tolerant.

---

# 10. Technical Architecture

Monorepo structure:

/apps

- crm
- admin
- api

/packages

- shared
- theme

Stack:

Frontend:

- Next.js
- Tailwind CSS
- shadcn/ui

Backend:

- NestJS
- Prisma

Infrastructure:

- PostgreSQL
- Redis
- Docker

---

# 11. UI / UX Principles

The product should feel:

- modern
- premium
- fast
- enterprise-grade

Design principles:

- dark sidebar
- light content
- emerald accent
- clean spacing
- strong data readability

Inspiration:

- Linear
- HubSpot

Avoid:

- clutter
- old-school enterprise UI
- excessive visual noise

---

# 12. Success Metrics

MVP is successful if agencies can replace:

- spreadsheets
- manual tracking
- fragmented lead workflows

Key metrics:

- reduced stale leads
- improved response time
- better visibility into agent activity
- improved lead conversion

---

# 13. Confirmed Post-MVP Direction

The MVP scope above is unchanged. The next confirmed product direction is:

- tenant-owned Meta integrations, with tenants paying Meta directly;
- a channel-neutral messaging engine launching with WhatsApp and later supporting Messenger and
  Instagram Direct;
- a flat per-agency messaging addon tiered by CRMPro plan or seats, plus a one-time setup fee;
- auditable cross-channel Lead matching with automatic merge only on exact phone matches;
- Meta ad-click attribution and closed-loop outcome reporting after messaging is stable;
- Project Files for retaining raw developer documents without AI normalization or live unit
  inventory claims.

See [`phase-2-roadmap.md`](phase-2-roadmap.md) for the canonical Phase 2 product decisions and
[`competitive-positioning.md`](competitive-positioning.md) for the dated competitor assessment.
