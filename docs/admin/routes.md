# CRMPro Admin Dashboard — Routes

# Overview

This document defines the route structure for the CRMPro internal admin dashboard.

Application path:

```text id="w7n4qp"
/apps/admin
```

The Admin Dashboard is internal-only.

It is used by CRMPro operators for:

- tenant management
- subscription management
- platform analytics
- support tooling
- operational debugging

This dashboard is separate from the tenant-facing CRM.

It uses a different authorization model and different workflows.

---

# Admin Philosophy

The Admin Dashboard is an internal control center.

Primary goals:

- operational visibility
- intervention capability
- fast debugging
- safe administrative actions

Admin UI should optimize for:

- clarity
- speed
- dense information
- trustworthiness

Admin actions can impact multiple tenants.

Because of this, admin operations should be deliberate and auditable.

---

# Route Philosophy

Admin routes should be:

- predictable
- shallow
- operationally efficient

Prefer:

```text id="adminroutes"
/dashboard
/tenants
/plans
/support
```

Avoid excessive nesting unless required.

---

# Layout Structure

Admin uses authenticated application shell.

Structure:

Sidebar
Topbar
Content Area

Sidebar provides primary navigation.

Topbar provides:

- search
- breadcrumbs
- admin account menu
- global actions

---

# Public Routes

Public routes do not require authenticated admin session.

---

## Login

```text id="adminlogin"
/login
```

Purpose:
Admin authentication.

Access:
Public

---

# Protected Routes

All admin routes require:

- authenticated admin
- valid admin authorization

Tenant users must never access admin routes.

---

# Dashboard

```text id="admindashboard"
/dashboard
```

Purpose:
Platform overview.

Displays high-level platform metrics.

Examples:

- total tenants
- active tenants
- total users
- total leads
- import activity
- system health

This is the main landing page.

---

# Tenants Module

One of the most important admin sections.

---

## Tenants List

```text id="tenantlist"
/tenants
```

Purpose:
View all tenants.

Common features:

- search
- filtering
- status filtering
- plan filtering
- sorting

Examples of visible information:

- tenant name
- plan
- status
- usage
- creation date

---

## Tenant Details

```text id="tenantdetails"
/tenants/[tenantId]
```

Purpose:
Tenant inspection workspace.

This page provides operational visibility into a tenant.

Possible sections:

- tenant metadata
- subscription info
- usage metrics
- users count
- leads count
- activity summary
- configuration snapshot

This is one of the most important support pages.

---

## Create Tenant

May be page or dialog.

Possible route:

```text id="createtenant"
/tenants/new
```

Purpose:
Onboard new tenant.

Typical workflow:

1. create tenant
2. configure plan
3. set limits
4. create initial admin user
5. initialize defaults

---

# Plans / Subscriptions

Billing in MVP is informational.

No payment processing.

---

## Plans Page

```text id="plansroute"
/plans
```

Purpose:
Manage available subscription plans.

Possible plan properties:

- name
- limits
- pricing metadata
- feature access

Examples:

- Starter
- Growth
- Enterprise

---

## Plan Details

Optional route:

```text id="plandetails"
/plans/[planId]
```

Purpose:
Inspect or modify plan configuration.

---

# Analytics

Platform-wide analytics.

---

## Analytics Dashboard

```text id="analyticsroute"
/analytics
```

Purpose:
Global business intelligence.

Examples:

Growth metrics:

- new tenants
- churn
- usage growth

Operational metrics:

- lead volume
- active users
- import frequency

System metrics:

- API health
- queue activity
- failures

---

# Support Module

Internal operational tooling.

---

## Support Dashboard

```text id="supportroute"
/support
```

Purpose:
Support operations.

Used for:

- troubleshooting
- tenant support
- issue investigation

---

## Tenant Inspection

Possible route:

```text id="tenantinspect"
/support/tenants/[tenantId]
```

Purpose:
Inspect tenant state deeply.

Possible capabilities:

- inspect settings
- inspect usage
- review logs
- review recent actions

Useful for debugging support tickets.

---

# Audit / Admin Logs

Admin actions must be traceable.

---

## Admin Logs

```text id="adminlogs"
/audit-logs
```

Purpose:
Track administrative actions.

Examples:

- tenant created
- tenant suspended
- plan changed
- subscription updated

Because admin actions are sensitive, audit logs are critical.

---

# System Monitoring

Optional but highly recommended.

---

## System Health

```text id="systemhealth"
/system
```

Purpose:
Monitor infrastructure health.

Possible metrics:

- API availability
- database status
- queue health
- worker health
- background jobs

Useful for operations.

---

# Settings

Internal platform settings.

---

## Settings Root

```text id="adminsettings"
/settings
```

Purpose:
Admin configuration hub.

Possible sections:

- platform configuration
- feature flags
- internal preferences

---

# Error Routes

---

## Unauthorized

```text id="admin403"
/403
```

Purpose:
Permission denied.

---

## Not Found

```text id="admin404"
/404
```

Purpose:
Missing route.

---

# Admin Actions

Sensitive admin actions include:

- tenant creation
- tenant suspension
- plan modification
- subscription override
- manual intervention

These actions should:

- require explicit confirmation
- generate audit logs
- be easy to review later

Avoid accidental destructive actions.

---

# Search

Global search is valuable in admin dashboard.

Useful searchable resources:

- tenants
- plans
- users
- support tickets (future)

Fast access improves operations.

---

# Route Groups (Recommended)

Recommended route grouping in Next.js:

```text id="adminroutegroups"
(app)
(auth)
```

Examples:

Authenticated routes:

```text id="adminroutegroups2"
(app)
  /dashboard
  /tenants
  /plans
  /analytics
```

Public routes:

```text id="adminroutegroups3"
(auth)
  /login
```

Improves layout organization.

---

# Future Routes (Post-MVP)

Not part of MVP.

Potential future routes:

```text id="futureadminroutes"
/feature-flags
/integrations
/alerts
/ai-ops
```

These should be added only when corresponding systems exist.
