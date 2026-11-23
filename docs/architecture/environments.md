# CRMPro — Environments

# Overview

CRMPro runs in multiple environments throughout the software lifecycle.

Each environment serves a specific purpose.

This document defines:

- available environments
- purpose of each environment
- infrastructure expectations
- configuration rules

Consistent environment management is critical for reliable development and deployment.

---

# Environment Philosophy

Each environment should be isolated.

Changes in one environment must not unintentionally affect another.

Core goals:

- safe development
- reliable testing
- stable production

Environments should remain as similar as practical while preserving safety.

---

# Supported Environments

CRMPro currently defines three main environments:

- Local
- Staging
- Production

Optional future environments may be added if needed.

---

# Local Environment

Purpose:
Developer machine for active development.

This is where engineers and AI agents iterate quickly.

---

## Characteristics

Optimized for:

- rapid iteration
- debugging
- local testing
- hot reload

---

## Typical Setup

Applications usually run natively:

- CRM frontend
- Admin frontend
- API backend

Infrastructure services typically run via Docker.

Examples:

- PostgreSQL
- Redis

---

## Ports

Default local ports:

- API → 3000
- CRM → 3001
- Admin → 3002

These may change but should remain documented.

---

## Local Requirements

Local environment should support:

- database migrations
- queue processing
- auth flows
- file handling
- seed data

---

# Staging Environment

Purpose:
Pre-production validation.

Staging should mimic production as closely as practical.

---

## Use Cases

Used for:

- integration testing
- QA
- deployment verification
- UAT
- demo environments

---

## Characteristics

Staging should include:

- production-like infrastructure
- realistic data volume
- production-like configuration

But without production customer data unless properly sanitized.

---

## Requirements

Staging must validate:

- deployment process
- migrations
- environment variables
- background jobs
- integrations

Staging should catch issues before production.

---

# Production Environment

Purpose:
Customer-facing live system.

This environment serves real agencies.

Reliability and security are critical.

---

## Requirements

Production must prioritize:

- security
- availability
- observability
- backup strategy
- performance

---

## Production Infrastructure

Typical production infrastructure may include:

Applications:

- CRM frontend
- Admin frontend
- API backend
- background workers

Infrastructure:

- database
- redis
- object storage
- monitoring

---

# Environment Configuration Rules

Configuration must be environment-specific.

Examples:

- URLs
- secrets
- database connections
- API keys
- logging verbosity

Hardcoding environment-specific values is forbidden.

Use environment variables.

---

# Secret Management

Secrets must never be committed to git.

Examples:

- JWT secrets
- database passwords
- API keys
- encryption keys

Use secure secret management.

---

# Environment Variable Strategy

Each application manages its own environment configuration.

Applications:

- CRM
- Admin
- API

Each app may have different required variables.

Example categories:

Frontend:

- public API URLs
- public feature flags

Backend:

- database
- redis
- auth secrets
- internal config

---

# Local Environment Files

Recommended pattern:

```text
apps/crm/.env.local
apps/admin/.env.local
apps/api/.env
```

Example templates should be committed as:

```text
apps/crm/.env.example
apps/admin/.env.example
apps/api/.env.example
```

Real secrets should not be committed.

---

# Database Strategy by Environment

Each environment should use separate databases.

Never share production database with local or staging.

Examples:

Local:

- crmpro_dev

Staging:

- crmpro_staging

Production:

- crmpro_prod

Environment isolation is mandatory.

---

# Logging by Environment

Logging verbosity differs by environment.

---

## Local

Verbose logging allowed.

Useful for debugging.

---

## Staging

Moderate logging.

Useful for QA and deployment validation.

---

## Production

Structured logs preferred.

Avoid noisy debug logs.

Include context such as:

- requestId
- userId
- tenantId

---

# Feature Flags

Optional feature flags may vary by environment.

Examples:

Feature enabled in:

- local
- staging

Disabled in:

- production

Useful for gradual rollouts.

---

# AI / Developer Rules

Rule 1
Never hardcode environment-specific URLs.

---

Rule 2
Never commit secrets.

---

Rule 3
Each environment must have isolated infrastructure.

---

Rule 4
Production configuration must be treated as sensitive.

---

# Meta Integration Environments

Phase 2 Meta integrations have a separate provider-readiness boundary from CRMPro's normal
local/staging/production environments.

## Development and Test

The integration stack can be developed before company registration using:

- a personal Meta developer account;
- test WhatsApp Business Account numbers and Meta test assets;
- the free Marketing API Sandbox Ad Account.

Test assets and simulated ad data must remain isolated from production tenant data.

## Production Readiness

Before onboarding real tenants at scale, CRMPro requires legal company registration, Meta Business
Verification, the necessary App Review/access approvals, and a production System User token
strategy. Each tenant separately owns and verifies its Meta business assets.

The current planning assumption is a limit of 10 new tenant onboardings per week before CRMPro
Business Verification and 200 per week afterward. Revalidate this external limit before launch.

Production tokens are secrets. They must be encrypted at rest, excluded from logs and browser
clients, revocable, and isolated by tenant and environment.

See [`meta-platform-integrations.md`](meta-platform-integrations.md) for the complete ownership,
token, webhook, and release-gate design.
