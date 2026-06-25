# CRMPro — Multi-Tenancy Architecture

# Overview

CRMPro is a multi-tenant SaaS platform.

Each tenant represents a separate real estate agency.

Examples:

- Agency A
- Agency B
- Agency C

All tenant data must remain logically isolated.

This document defines how tenant isolation works and the architectural rules required to enforce it.

---

# Core Principle

The most important rule in CRMPro:

A tenant must never access another tenant’s data.

This applies to:

- direct reads
- writes
- updates
- deletes
- exports
- analytics
- background jobs
- cached data

Cross-tenant leakage is a critical security failure.

---

# Tenant Model

A tenant is an organization.

Each tenant owns its own business data.

Examples of tenant-owned entities:

- users
- roles
- leads
- projects
- notes
- audit logs
- imports
- settings

Each tenant has:

- identity
- subscription plan
- limits
- configuration
- users

---

# Isolation Strategy

CRMPro uses **logical isolation with shared infrastructure**.

This means:

- all tenants share the same backend
- all tenants share the same database cluster
- tenant data is separated using tenant identifiers

Isolation is enforced at the application and database query level.

---

# Why Shared Database?

CRMPro uses a shared database architecture because it provides:

- simpler infrastructure
- lower cost
- easier operations
- easier scaling for MVP and early growth

Compared to:

- database per tenant
- schema per tenant

This model is easier to operate while still supporting strong isolation.

---

# Tenant Identifier

Every tenant has a unique identifier.

Example:

```text id="tenantid"
tenant_id = tenant_abc123
```

This identifier is the foundation of tenant isolation.

---

# Core Rule

Every tenant-owned business entity must include:

```text id="tenantcol"
tenant_id
```

This field is mandatory unless explicitly exempt.

---

# Tenant-Owned Entities

Examples:

## Users

Belong to exactly one tenant.

---

## Roles

Belong to exactly one tenant.

---

## Leads

Belong to exactly one tenant.

---

## Projects

Belong to exactly one tenant.

---

## Notes / Activities

Belong to exactly one tenant.

---

## Audit Logs

Belong to exactly one tenant.

---

## Imports

Belong to exactly one tenant.

---

# Non-Tenant Entities

Some entities are global.

Examples:

- platform plans
- super admin accounts
- system configuration
- global feature flags

These are not tenant-owned.

They must remain inaccessible to tenant users.

---

# Tenant Resolution

The backend must always know which tenant is making a request.

Tenant context is resolved from authenticated session.

Authenticated session should include enough information to identify:

- user_id
- tenant_id
- role_id

Example JWT payload:

```json id="jwtpayload"
{
  "sub": "user_123",
  "tenantId": "tenant_abc",
  "roleId": "role_manager"
}
```

Tenant context must never rely on client-provided arbitrary tenant identifiers.

---

# Forbidden Pattern

Bad:

Client sends:

```json id="badpattern"
{
  "tenantId": "tenant_xyz"
}
```

Backend trusts it.

This is unsafe.

---

# Correct Pattern

Good:

Backend derives tenant context from authenticated session.

Client should not decide tenant ownership.

---

# Request Lifecycle

Typical protected request:

Request
→ Authentication Guard
→ Resolve User
→ Resolve Tenant Context
→ Permission Check
→ Service Layer
→ Database Query

Tenant context must be available before business logic executes.

---

# Query Isolation Rules

All tenant-scoped queries must include tenant filtering.

This is mandatory.

---

# Read Queries

Bad:

```ts
prisma.lead.findMany();
```

Unsafe.

This may return all tenant leads.

---

Good:

```ts
prisma.lead.findMany({
  where: {
    tenantId,
  },
});
```

Required.

---

# Single Entity Reads

Bad:

```ts
prisma.lead.findUnique({
  where: { id },
});
```

Potentially unsafe.

Why?

Lead ID alone may expose cross-tenant data.

---

Safer:

Query must verify ownership.

Example:

- lead exists
- lead belongs to tenant

---

# Create Queries

When creating tenant-owned entities:

Backend must inject tenant ownership.

Example:

Bad:
Frontend sends tenantId.

Good:
Backend assigns tenantId automatically.

---

# Update Queries

Updates must validate:

1. entity exists
2. entity belongs to tenant
3. actor has permission

All three are required.

---

# Delete Queries

Delete operations follow same rules as updates.

Never delete by ID only.

Always verify tenant ownership.

---

# Service Layer Enforcement

Tenant isolation must primarily be enforced in backend services.

Controllers should not own isolation logic.

Bad:

Controller manually adds filters everywhere.

Good:

Service layer consistently enforces tenant boundaries.

---

# Repository Pattern Recommendation

Prefer centralized data access patterns.

Example:

Bad:
Every service writes raw Prisma queries differently.

Good:
Use consistent tenant-aware repositories or helper methods.

Example helper:

```ts
findTenantLead(tenantId, leadId);
```

This reduces human error.

---

# Authorization vs Tenant Isolation

These are separate concerns.

---

## Tenant Isolation

Question:

Can this tenant access this data?

Example:
Agency A accessing Agency B lead

Answer:
Never.

---

## Authorization

Question:

Can this user perform this action?

Example:
Agent deleting leads

Depends on permissions.

---

Both checks are required.

Order:

1. tenant isolation
2. permission validation

---

# Frontend Responsibilities

Frontend is not responsible for security.

Frontend may:

- hide unauthorized UI
- optimize UX

But frontend isolation is not trusted.

Security is backend responsibility.

---

# Background Jobs

Tenant isolation also applies to async jobs.

Examples:

- imports
- exports
- notifications
- AI processing
- analytics pipelines

Jobs must carry tenant context.

Example job payload:

```json id="jobpayload"
{
  "tenantId": "tenant_abc",
  "jobType": "import"
}
```

Without tenant context, workers may leak data.

---

# Cache Isolation

If caching is introduced:

Cache keys must include tenant identifiers.

Bad:

```text id="badcache"
dashboard_stats
```

Unsafe.

---

Good:

```text id="goodcache"
tenant:tenant_abc:dashboard_stats
```

Required.

---

# File Storage Isolation

Future file uploads should also be tenant-scoped.

Examples:

- CSV imports
- exported reports
- attachments

Recommended structure:

```text id="filestorage"
/tenants/{tenantId}/imports/
/tenants/{tenantId}/exports/
```

This simplifies auditing and cleanup.

---

# Logging & Observability

Logs should include tenant context whenever possible.

Useful for:

- debugging
- support
- incident investigation

Examples:

- tenantId
- userId
- requestId

---

# Admin Dashboard Access

Super admins may access cross-tenant data.

This is the only major exception.

Admin dashboard is trusted internal tooling.

Super admin permissions must be highly restricted and audited.

Sensitive admin actions should always generate audit logs.

---

# Testing Requirements

Multi-tenancy must be tested explicitly.

Required test cases:

---

## Read Isolation

Tenant A cannot read Tenant B data.

---

## Update Isolation

Tenant A cannot update Tenant B data.

---

## Delete Isolation

Tenant A cannot delete Tenant B data.

---

## Import Isolation

Imported records must belong to correct tenant.

---

## Cache Isolation

Cached responses must not leak across tenants.

---

# AI / Developer Rules

All AI agents and developers working on CRMPro must follow these rules.

---

Rule 1
Assume every business entity is tenant-scoped unless explicitly documented otherwise.

---

Rule 2
Never write database queries for tenant-owned entities without tenant filtering.

---

Rule 3
Never trust client-provided tenant identifiers for ownership decisions.

---

Rule 4
All background jobs involving tenant data must include tenant context.

---

Rule 5
Cross-tenant access is always considered a critical bug unless explicitly intended for super admin workflows.
