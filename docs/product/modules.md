# CRMPro — Modules Specification

## Overview

CRMPro consists of 10 core modules in the MVP.

Modules are divided into:

## Foundation Modules

Core system infrastructure.

- Authentication
- Tenants
- Users
- Roles & Permissions
- Settings

---

## Business Modules

Main CRM functionality.

- Projects
- Leads
- Notes / Activity
- Imports / Exports

---

## Support Modules

Operational and analytical modules.

- Audit Logs
- Billing Overview

---

# Module Relationships

High-level dependency graph:

Authentication
→ Tenants
→ Users
→ Roles & Permissions
→ Business Modules

Business Modules:
Projects
↔ Leads
↔ Notes

Cross-cutting:
Audit Logs
Settings
Billing

---

# 1. Authentication Module

## Purpose

Handles user authentication and session lifecycle.

---

## Responsibilities

- login
- logout
- password reset
- token generation
- session validation

---

## Core Rules

- Every authenticated user belongs to exactly one tenant
- Super admins use separate authentication
- Tenant users cannot access admin dashboard

---

## Main Entities

### User

Contains:

- id
- email
- password_hash
- tenant_id
- role_id

---

## API Responsibilities

Examples:

- POST /auth/login
- POST /auth/logout
- GET /auth/me

---

## Dependencies

Depends on:

- Users
- Roles
- Tenants

---

# 2. Tenants Module

## Purpose

Represents agency accounts inside CRMPro.

A tenant is a customer organization.

Example:
Agency A

---

## Responsibilities

- create tenant
- update tenant
- activate/deactivate tenant
- store plan info
- store subscription limits

---

## Important Rules

Tenant creation is internal only.

Public signup is NOT supported.

Only CRMPro super admins can create tenants.

---

## Tenant Data

Example fields:

- id
- name
- slug
- status
- plan
- max_users
- max_leads
- created_at

---

## Critical Rule

Every business entity must belong to a tenant.

Examples:

- leads
- users
- projects
- audit logs

---

# 3. Users Module

## Purpose

Manages users inside a tenant.

---

## Responsibilities

- create users
- update users
- deactivate users
- assign roles

---

## User Types

Common tenant user roles:

- Agency Owner
- Manager
- Agent
- Call Center

---

## User Fields

Required:

- name
- email
- role_id
- tenant_id

Optional:

- phone
- avatar

---

## Relationships

Tenant
→ many Users

Role
→ many Users

---

# 4. Roles & Permissions Module

## Purpose

Implements RBAC (Role-Based Access Control).

---

## Responsibilities

- create custom roles
- assign permissions
- enforce authorization

---

## Permission Examples

Lead permissions:

- lead.read
- lead.create
- lead.update
- lead.delete

Project permissions:

- project.read
- project.create
- project.update

Settings permissions:

- settings.manage

---

## Important Rules

Permissions are enforced at:

### Backend

Mandatory

### Frontend

Optional UX enhancement

Frontend may hide actions.

Backend must always validate.

---

## Relationships

Tenant
→ many Roles

Role
→ many Permissions

---

# 5. Projects Module

## Purpose

Stores real estate projects.

Projects are NOT units.

Examples:

- Badya
- Mountain View iCity

---

## Responsibilities

- create project
- update project
- archive project
- search projects

---

## Project Fields

Required:

- name
- tenant_id

Optional:

- developer
- location
- description
- tags
- delivery_date

---

## Relationships

Tenant
→ many Projects

Lead
↔ many Projects

---

# 6. Leads Module

## Purpose

Core business module.

Represents potential clients.

---

## Responsibilities

- create lead
- edit lead
- assign lead
- update status
- search/filter leads
- track pipeline

---

## Lead Fields

Required:

- name
- phone
- source
- status
- tenant_id

Optional:

- email
- budget
- assigned_user_id

---

## Lead Sources

Examples:

- Meta Ads
- Google Ads
- Referral
- Manual
- Import

---

## Default Lead Statuses

- New
- Contacted
- Qualified
- Viewing Scheduled
- Negotiating
- Closed Won
- Closed Lost

---

## Relationships

Tenant
→ many Leads

User
→ many assigned Leads

Lead
↔ many Projects

Lead
→ many Notes

---

# 7. Notes / Activity Module

## Purpose

Tracks communication and actions related to leads.

---

## Responsibilities

Agents can log:

- notes
- calls
- meetings
- follow-ups
- status changes

---

## Example Timeline

Today 4:10 PM
Ahmed:
Client interested in 3BR under 8M

---

## Fields

- id
- lead_id
- user_id
- tenant_id
- type
- content
- created_at

---

## Relationships

Lead
→ many Notes

User
→ many Notes

---

Large imports should run asynchronously using jobs.

---

# 8. Imports / Exports Module

## Purpose

Supports bulk data migration.

Important for onboarding.

---

## Responsibilities

- CSV upload
- field mapping
- row validation
- bulk insert
- export data

---

## Supported Imports

MVP:

- Leads

Future:

- Projects
- Contacts

---

## Import Flow

1. Upload file
2. Parse rows
3. Map columns
4. Validate
5. Preview
6. Confirm import

---

## Background Processing

Large imports should run asynchronously using jobs.

---

# 10. Audit Logs Module

## Purpose

Tracks important actions across system.

Critical for accountability.

---

## Responsibilities

Track actions such as:

- lead created
- lead updated
- lead assigned
- role updated
- user deactivated

---

## Audit Log Fields

- id
- tenant_id
- actor_user_id
- entity_type
- entity_id
- action
- metadata
- created_at

---

## Example Log

Ahmed changed lead status
From: New
To: Qualified

---

# 11. Settings Module

## Purpose

Tenant-level customization.

---

## Responsibilities

Manage:

- pipeline stages
- role settings
- branding
- preferences

---

## Categories

### General

Agency info

### Team

Users

### Roles

RBAC

### Pipeline

Lead stages

---

# 12. Billing Overview Module

## Purpose

Displays subscription information.

Informational only.

No payment processing in MVP.

---

## Responsibilities

Display:

- current plan
- usage
- limits
- renewal date
- billing amount

---

## Example Usage Metrics

Users:
14 / 20

Leads:
24,200 / 100,000

---

# 13. Admin Dashboard Module

## Purpose

Internal CRMPro administration.

Separate from tenant CRM.

---

## Responsibilities

Manage platform-wide operations.

---

## Admin Features

### Tenant Management

- create tenant
- deactivate tenant

### Subscription Management

- assign plans
- manage limits

### Platform Analytics

- total tenants
- total users
- total leads

### Support

- inspect tenant state
- diagnose issues

---

# Future Modules (Post-MVP)

Not included in MVP.

Confirmed Phase 2 modules:

- Meta Messaging, beginning with WhatsApp and extending to Messenger and Instagram Direct
- Messaging Templates and conversation-window enforcement
- Cross-Channel Identity Matching with audited merge/unmerge
- Project Files for raw developer price lists and inventory sheets
- Meta Ads Attribution, Campaigns, and outcome reporting

The messaging domain must be channel-neutral even though WhatsApp ships first. Project Files stores
raw source documents and does not introduce unit-level inventory or committed AI parsing.

Other future candidates remain uncommitted:

- AI Assistant
- Google Ads Integration
- Google Calendar / Outlook Sync
- Advanced Analytics (predictive)

Recurring tasks, dependencies, and Kanban/Gantt views are not part of the confirmed Phase 2 scope.

See [`phase-2-roadmap.md`](phase-2-roadmap.md) for product rules and
[`../architecture/meta-platform-integrations.md`](../architecture/meta-platform-integrations.md)
for integration boundaries and conceptual data.
