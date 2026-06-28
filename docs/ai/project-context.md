# CRMPro — Project Context

# Purpose

This document gives AI coding agents rapid context about CRMPro.

Read this file first before making architectural or implementation decisions.

This file provides:

- product context
- business context
- architectural intent
- project philosophy
- important constraints

For detailed implementation rules, also read:

- `/docs/ai/coding-rules.md`
- `/docs/architecture/*`
- `/docs/product/*`

---

# What is CRMPro?

CRMPro is a multi-tenant SaaS CRM platform built specifically for real estate marketing agencies in the MENA region.

The product helps agencies manage:

- leads
- projects
- teams
- permissions
- pipeline activity
- accountability
- reporting

CRMPro aims to replace fragmented workflows based on:

- spreadsheets
- WhatsApp groups
- manual lead tracking
- ad hoc team coordination

The product should feel like a modern premium B2B SaaS platform.

---

# Important Industry Context

This product is heavily influenced by real-world observations from the local real estate market.

Traditional real estate CRMs often model:

Property
→ Building
→ Unit
→ Availability
→ Price

CRMPro intentionally avoids this for MVP.

Why?

Because many real estate marketing agencies do **not maintain reliable unit inventory inside CRMs**.

Unit-level data changes constantly:

- pricing may change daily or hourly
- availability changes frequently
- updates often come from WhatsApp groups

Agencies usually care more about:

- which project the client wants
- lead quality
- follow-up process
- conversion pipeline

Therefore CRMPro is built around **projects**, not unit inventory.

This distinction is critical.

---

# Core Product Philosophy

CRMPro prioritizes operational clarity over feature bloat.

Important values:

- simplicity
- speed
- accountability
- visibility
- maintainability

The product should solve real operational pain.

Avoid adding unnecessary complexity.

---

# Main User Types

There are two major application contexts.

---

## Tenant CRM

Used by agency users.

Actors:

- Agency Owner
- Manager
- Agent

This is the main product.

---

## Platform Admin Dashboard

Used internally by CRMPro operators.

Actors:

- Super Admin
- Support Staff

This manages:

- tenants
- subscriptions
- platform operations

---

# Architecture Summary

CRMPro is a monorepo.

Structure:

```text id="monorepo"
/apps
  /crm
  /admin
  /api

/packages
  /shared
  /theme
```

---

## CRM App

Tenant-facing frontend.

Responsibilities:

- dashboards
- lead management
- projects
- settings

Tech:

- Next.js
- React
- Tailwind
- shadcn/ui

---

## Admin App

Internal platform dashboard.

Responsibilities:

- tenant management
- support tooling
- platform analytics

Tech:

- Next.js
- React
- Tailwind
- shadcn/ui

---

## API

Central backend.

This is the source of truth for business logic.

Tech:

- NestJS
- Prisma
- PostgreSQL
- Redis

---

# Critical Architectural Principles

---

## Business Logic Lives in Backend

Frontend should stay relatively thin.

Frontend responsibilities:

- UI
- interactions
- API calls

Backend responsibilities:

- validation
- authorization
- business rules
- persistence

Never move critical business logic to frontend.

---

## Multi-Tenancy is Core

CRMPro is multi-tenant from day one.

Each tenant is an agency.

Tenant isolation is mandatory.

Cross-tenant data leakage is considered a critical security bug.

Assume all business entities are tenant-scoped unless explicitly documented otherwise.

Examples:

- users
- leads
- projects
- roles
- audit logs

---

## Roles Are Dynamic

Tenants can create custom roles.

Do not assume fixed roles like:

- admin
- manager
- agent

These are only defaults.

Permissions—not role names—control authorization.

Always prefer:

permission checks

over:

role name checks

---

# MVP Scope

Current MVP includes:

- authentication
- tenants
- users
- roles & permissions
- projects
- leads
- lead notes & timeline
- pipelines
- files (signed upload)
- import / export jobs
- analytics dashboard
- notification center
- workflow automation
- task management & calendar
- settings
- audit logs
- billing overview (display only)
- monitoring (health, jobs, metrics)

---

# Explicitly Not in MVP

Do not build these unless explicitly requested.

Excluded from MVP:

- AI features
- WhatsApp integration
- Meta Ads integration
- Google Calendar / Outlook sync
- Google Ads integration
- payment gateway billing
- mobile applications
- recurring tasks, task dependencies, kanban/gantt views

These are future modules.

---

# UI / UX Direction

The product should feel:

- premium
- modern
- fast
- enterprise-grade

Design direction:

- dark sidebar
- light content
- emerald accent
- subtle shadows
- strong table readability

Visual inspiration:

- Linear
- modern SaaS dashboards
- premium enterprise tooling

Avoid:

- flashy gradients
- glassmorphism
- gimmicky animations
- cluttered enterprise UI

---

# Coding Philosophy

When implementing features, prefer:

- clear code
- explicit naming
- low abstraction
- composable modules
- predictable architecture

Avoid:

- premature optimization
- overengineering
- clever abstractions
- unnecessary dependencies

Simple and maintainable beats clever.

---

# AI Behavior Expectations

When working on CRMPro:

1. Read existing code before changing patterns
2. Follow documentation before making assumptions
3. Preserve architecture consistency
4. Respect module boundaries
5. Prioritize security and maintainability

If requirements are ambiguous:

Do not invent business requirements.

Ask or keep implementation extensible.

---

# Final Rule

When unsure, optimize for code that:

- a senior engineer can understand quickly
- is easy to debug
- is safe in a multi-tenant environment
- can scale with product growth
