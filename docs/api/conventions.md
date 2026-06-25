# CRMPro API — Conventions

# Overview

This document defines backend API conventions for CRMPro.

Application path:

```text
/apps/api
```

The API is the central source of truth for:

- business logic
- validation
- authorization
- persistence
- orchestration

This document ensures consistency across:

- modules
- controllers
- DTOs
- responses
- errors
- naming conventions

All backend implementations should follow these conventions unless explicitly overridden.

---

# API Philosophy

CRMPro APIs should be:

- predictable
- consistent
- explicit
- secure
- easy to consume

The API is designed primarily for:

- CRM frontend
- Admin frontend
- future integrations

Avoid surprising behavior.

Clients should easily predict API patterns.

---

# Architectural Principle

Backend owns business logic.

Frontend should not enforce critical business rules.

Backend must validate:

- authentication
- tenant scope
- permissions
- input integrity
- business rules

All important decisions happen server-side.

---

# Base API Structure

Recommended API prefix:

```text
/api/v1
```

Examples:

```text
/api/v1/auth
/api/v1/leads
/api/v1/projects
```

Versioning helps future API evolution.

---

# Resource Naming

Use plural resource names.

Good:

```text
/leads
/projects
/users
```

Avoid:

```text
/lead
/project
/getLeads
```

Prefer REST-style resource naming.

---

# HTTP Method Conventions

Use standard HTTP semantics.

---

## GET

Read data.

Examples:

```text
GET /leads
GET /leads/:id
```

Must not mutate state.

---

## POST

Create resources or trigger actions.

Examples:

```text
POST /leads
POST /auth/login
```

---

## PATCH

Partial updates.

Examples:

```text
PATCH /leads/:id
PATCH /users/:id
```

Preferred for updates.

---

## PUT

Full replacement.

Rarely needed.

Avoid unless explicit replacement semantics are desired.

---

## DELETE

Delete resources.

Examples:

```text
DELETE /leads/:id
```

Use carefully.

Soft delete may be preferred for business entities.

---

# Controller Design

Controllers should remain thin.

Controllers handle:

- route definitions
- decorators
- request parsing
- DTO validation
- response shaping

Controllers should not contain business logic.

Bad:

Large controller methods with business workflows.

Good:

Controller delegates to service.

Example:

Controller:

```ts
create(dto, user);
```

Service:

```ts
createLead(dto, actor);
```

---

# Service Design

Services contain business logic.

Services should handle:

- workflows
- validation beyond DTO
- authorization checks
- orchestration
- persistence

Services are the heart of each module.

---

# DTO Conventions

Use DTOs for all request payloads.

Examples:

- CreateLeadDto
- UpdateLeadDto
- LoginDto

Naming convention:

```text
<Action><Resource>Dto
```

Examples:

Good:

- CreateUserDto
- UpdateProjectDto

Avoid vague names.

---

# Validation

Never trust incoming data.

Validate at API boundaries.

Validation should happen before business logic.

Validation includes:

- type validation
- format validation
- required constraints
- business-safe limits

Examples:

- invalid phone
- invalid email
- malformed UUID
- oversized payloads

---

# Response Format

Prefer consistent response shape.

Recommended format:

```json
{
  "success": true,
  "data": {}
}
```

Example list response:

```json
{
  "success": true,
  "data": [{}]
}
```

Example single resource:

```json
{
  "success": true,
  "data": {}
}
```

Consistency matters.

Avoid mixing raw objects and wrapped responses.

---

# Pagination Format

List endpoints should support pagination.

Recommended query params:

```text
?page=1&limit=20
```

Optional:

```text
?sortBy=createdAt
?sortOrder=desc
```

Response format:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 523,
    "totalPages": 27
  }
}
```

Use pagination for potentially large datasets.

Examples:

- leads
- audit logs
- users

---

# Filtering & Search

Collection endpoints may support filtering.

Examples:

```text
/leads?status=qualified
/leads?assignedTo=user123
```

Search example:

```text
/leads?search=ahmed
```

Filtering must remain predictable.

Avoid overly magical query behavior.

---

# Error Handling

Errors must be structured and meaningful.

Avoid vague errors.

Bad:

```json
{
  "error": "Something went wrong"
}
```

Bad for debugging.

---

Preferred:

```json
{
  "success": false,
  "error": {
    "code": "PERMISSION_DENIED",
    "message": "You do not have permission to assign leads."
  }
}
```

Errors should include:

- machine-readable code
- human-readable message

Optional:

- details
- validation errors

---

# HTTP Status Codes

Use standard status codes.

---

## 200 OK

Successful read or update.

---

## 201 Created

Successful creation.

---

## 400 Bad Request

Malformed or invalid request.

---

## 401 Unauthorized

Authentication missing or invalid.

---

## 403 Forbidden

Authenticated but lacks permission.

---

## 404 Not Found

Resource does not exist or inaccessible.

---

## 409 Conflict

Conflict state.

Examples:

- duplicate email
- duplicate role name

---

## 422 Unprocessable Entity

Validation passed structurally but failed business constraints.

Optional depending on preference.

---

## 500 Internal Server Error

Unexpected server failure.

Avoid leaking internal details.

---

# Authentication

Protected endpoints require authentication.

Authentication responsibilities:

- validate session/token
- resolve user
- resolve tenant context

Authenticated request context should expose:

- user identity
- tenant identity
- permission context

---

# Authorization

Protected actions require permission checks.

Required checks:

1. authenticated
2. tenant valid
3. resource belongs to tenant
4. permission granted

Authorization happens before business logic.

---

# Multi-Tenancy Rules

Critical.

All tenant-owned resources must enforce tenant isolation.

Examples:

- leads
- projects
- users
- roles

Never trust client-provided tenant ownership.

Tenant scope must come from authenticated session.

---

# Audit Logging

Important mutations should trigger audit logs.

Examples:

- create
- update
- delete
- assign
- permission changes

When implementing mutations, consider:

Should this be auditable?

Usually yes.

---

# Async Operations

Heavy operations should not block requests.

Examples:

- imports
- exports
- notifications
- analytics processing

Use background jobs where appropriate.

---

# Event Naming

Domain events should use consistent naming.

Recommended format:

```text
resource.action
```

Examples:

```text
lead.created
lead.assigned
project.created
user.deactivated
```

Event names should be centralized in shared package.

Avoid string duplication.

---

# Logging

Structured logs preferred.

Useful context:

- requestId
- userId
- tenantId
- module
- action

This improves observability.

---

# API Module Structure

Recommended module structure in NestJS:

```text
src/
  modules/
    leads/
      controllers/
      services/
      dto/
      entities/
      repositories/
```

Each module should be self-contained.

---

# Naming Conventions

Use consistent naming.

---

## Classes

PascalCase

Examples:

- LeadsService
- AuthController

---

## Methods

camelCase

Examples:

- createLead()
- assignLead()

---

## Files

kebab-case preferred.

Examples:

```text
leads.service.ts
create-lead.dto.ts
```

---

# AI / Developer Rules

Rule 1
Controllers should stay thin.

---

Rule 2
Services own business logic.

---

Rule 3
Never skip validation.

---

Rule 4
Never skip tenant checks.

---

Rule 5
Keep APIs predictable and consistent.
