# CRMPro Admin API — Project Context

## Overview

CRMPro is a multi-tenant SaaS CRM for real estate companies.

Current monorepo structure:

```text
apps/
  api/         # Tenant CRM API
  web/         # Tenant CRM frontend
  admin/       # Future platform admin frontend
  admin-api/   # Platform control plane API (to be built)

packages/
  shared/      # Shared constants/types
  database/    # Shared Prisma schema + migrations + seed
```

---

# System Separation

CRMPro has two backend APIs with different responsibilities.

## Tenant API (`apps/api`)

Used by CRM customers (real estate agencies).

Responsible for tenant-scoped business logic:

- Leads
- Pipelines
- Lead Sources
- Developers
- Projects
- Files
- Import Jobs
- Export Jobs
- Analytics
- Notifications

Rules:

- Every request is scoped by `tenantId`
- Users cannot access other tenants
- Uses tenant RBAC

Example:

```ts
where: {
  tenantId: currentUser.tenantId;
}
```

---

## Admin API (`apps/admin-api`)

Used internally by CRMPro platform staff.

Responsible for platform-level management:

- Platform admins
- Subscription plans
- Tenants
- Tenant provisioning
- Billing
- Feature flags
- Global analytics
- Support tools
- Security monitoring

Rules:

- Not tenant-scoped
- Has access to all tenants
- Uses separate admin auth + admin RBAC
- Higher security requirements than tenant API

---

# Architecture Principles

## Shared Database

Both APIs use the same PostgreSQL database via:

```ts
@crmpro/database
```

Admin API must NEVER own its own Prisma schema.

Database source of truth:

```text
packages/database/prisma/schema.prisma
```

Admin API performs direct DB reads/writes using Prisma.

It does NOT call tenant API internally.

Good:

```text
Admin API → Prisma → Database
Tenant API → Prisma → Database
```

Avoid:

```text
Admin API → Tenant API → Database
```

---

# Security Requirements

Admin API security must be stricter than tenant API.

Requirements:

- JWT access tokens
- Rotating refresh tokens
- Session management
- Device fingerprinting
- IP tracking
- User-agent tracking
- Session revocation
- Login history
- Suspicious login detection
- Security audit logging
- Optional future 2FA
- Optional future impersonation

Every sensitive action must be auditable.

Examples:

- Admin login
- Failed login
- Token refresh
- Password change
- Tenant creation
- Plan update
- Tenant suspension
- Impersonation
- Forced logout

---

# Authentication Strategy

Admin API must NOT reuse tenant auth.

Tenant users and platform admins are different actors.

Use separate models.

Planned models:

## PlatformAdmin

```prisma
model PlatformAdmin {
  id
  email
  passwordHash
  name
  role
  isActive
  createdAt
  updatedAt
}
```

## AdminSession

Tracks active admin sessions.

Stores:

- hashed refresh token
- device fingerprint
- IP
- user agent
- login time
- expiration
- revoked time

## AdminAuditLog

Stores critical admin actions.

Example fields:

- actor admin
- action
- entity type
- entity id
- metadata
- IP
- fingerprint
- createdAt

## AdminSecurityEvent

Stores security-related events.

Examples:

- LOGIN_SUCCESS
- LOGIN_FAILED
- TOKEN_REFRESHED
- PASSWORD_CHANGED
- SUSPICIOUS_LOGIN
- SESSION_REVOKED

---

# Authorization Strategy (RBAC)

Admin API uses separate RBAC from tenant API.

Do NOT reuse tenant permissions.

Tenant permissions example:

```ts
lead.create;
pipeline.update;
```

Admin permissions example:

```ts
tenant.read;
tenant.create;
tenant.update;
tenant.suspend;

plan.read;
plan.create;
plan.update;
plan.delete;

platform - analytics.read;
support.access;
billing.manage;
admin.manage;
```

Implementation should mirror tenant API RBAC:

- permission constants in `@crmpro/shared`
- decorators
- guards
- permission service
- request-level permission caching

---

# Planned Modules

---

## Phase 1 — Core Platform

### Auth Module

Responsibilities:

- login
- refresh
- logout
- logout all
- me
- session listing
- revoke session

---

### Admins Module

Manage platform admins.

Examples:

- create admin
- deactivate admin
- change role
- list admins

---

### Subscription Plans Module

Manage SaaS plans.

Examples:

- Free Trial
- Starter
- Pro
- Enterprise

Plan controls:

- max users
- max leads
- max projects
- storage quota
- feature flags

---

### Tenants Module

Manage customer tenants.

Examples:

- create tenant
- update tenant
- suspend tenant
- reactivate tenant
- cancel tenant

---

### Tenant Provisioning

When creating a tenant, automatically bootstrap:

Roles:

- Owner
- Manager
- Agent

Default pipeline:

- New Lead
- Contacted
- Qualified
- Interested
- Negotiation
- Won
- Lost

Default lead sources:

- Website
- Referral
- Facebook Ads
- Instagram
- Walk-in

Provisioning must be transactional.

---

### Platform Analytics

Global platform metrics.

Examples:

- total tenants
- active tenants
- trial tenants
- churn
- total users
- total leads
- storage usage
- MRR
- ARR

---

### Audit Module

Global audit visibility.

Examples:

- who changed what
- when
- from where
- on which entity

---

## Phase 2 — Support & Billing

Modules:

- Billing
- Coupons
- Invoices
- Support
- Feature Flags

---

## Phase 3 — Advanced

Modules:

- Admin impersonation
- Security dashboard
- Risk scoring
- Fraud detection
- 2FA
- SSO
- Webhooks

---

# Coding Rules

Follow same standards as tenant API.

Rules:

- Use DTO validation
- Use service layer for business logic
- Use transactions for multi-step writes
- Use soft delete where appropriate
- Avoid circular dependencies
- Prefer domain boundaries
- Keep modules decoupled
- Audit every sensitive mutation

---

# AI Development Rules

When generating code for admin-api:

ALWAYS:

- respect module boundaries
- use `@crmpro/database`
- use `@crmpro/shared`
- preserve security-first architecture
- assume enterprise-grade audit requirements

NEVER:

- modify tenant API unless explicitly requested
- duplicate Prisma schema
- reuse tenant auth models
- weaken auditability
- skip security logging

---

# Current Status

Admin API implementation has NOT started yet.

Completed:

- CRM tenant backend
- shared database package
- shared types package

Next step:

Scaffold:

```text
apps/admin-api
```

Then implement:

1. Auth module
2. Admin RBAC
3. Platform admin models
