# CRMPro CRM App — Routes

# Overview

This document defines the route structure for the tenant-facing CRM application.

Application path:

```text id="crmapp"
/apps/web
```

The CRM application is used by tenant users:

- Agency Owner
- Manager
- Agent

This document describes:

- route hierarchy
- page purpose
- access expectations
- layout structure

Routes may evolve as product grows.

This document describes intended architecture, not rigid implementation.

---

# Route Philosophy

CRM routes should be:

- predictable
- shallow
- easy to navigate
- permission-aware

Prefer:

```text id="goodroutes"
/leads
/projects
/settings
```

Avoid overly nested routes unless necessary.

---

# Layout Structure

CRM uses an authenticated application shell.

Main layout:

Sidebar
Topbar
Content Area

---

## Sidebar Navigation

Primary navigation lives in sidebar.

Main sections:

- Dashboard
- Leads
- Projects
- Imports / Exports
- Audit Logs
- Settings
- Billing

Visible items may depend on permissions.

---

# Public Routes

These routes do not require authenticated CRM session.

---

## Login

```text id="loginroute"
/login
```

Purpose:
User authentication.

Access:
Public

---

## Forgot Password

Optional for MVP.

```text id="forgot"
/forgot-password
```

Purpose:
Password reset initiation.

Access:
Public

---

# Protected Routes

All protected routes require:

- authenticated user
- active tenant
- valid permissions

---

# Dashboard

```text id="dashboardroute"
/dashboard
```

Purpose:
Main CRM landing page.

Displays operational overview.

Possible widgets:

- total leads
- active leads
- stale leads
- pipeline overview
- recent activity

Access:
Authenticated users

---

# Leads Module

Core CRM module.

---

## Leads List

```text id="leadslist"
/leads
```

Purpose:
View and manage leads.

Common functionality:

- search
- filtering
- sorting
- bulk actions

Possible filters:

- status
- assignee
- source
- project
- date

Access:
Requires lead.read

---

## Lead Details

```text id="leaddetails"
/leads/[leadId]
```

Purpose:
Single lead workspace.

Contains:

- lead information
- activity timeline
- notes
- assignment
- status updates
- project interests

This is one of the most important screens in CRM.

Access:
Requires lead.read

---

## Lead Creation

Can be:

- dedicated page
  or
- modal/dialog

Possible route:

```text id="leadcreate"
/leads/new
```

Purpose:
Create new lead.

Access:
Requires lead.create

---

# Projects Module

Projects represent real estate developments.

Projects are not property units.

Examples:

- Badya Badya Palm Hills
- Mountain View iCity Mountain View

---

## Projects List

```text id="projectslist"
/projects
```

Purpose:
Browse and manage projects.

Features:

- search
- filtering
- archive status

Access:
Requires project.read

---

## Project Details

```text id="projectdetails"
/projects/[projectId]
```

Purpose:
View project information.

Possible content:

- metadata
- associated leads
- activity summary

Access:
Requires project.read

---

## Create Project

Optional dedicated route.

```text id="projectcreate"
/projects/new
```

Purpose:
Create project.

Access:
Requires project.create

---

# Imports Module

Supports bulk onboarding.

---

## Imports Dashboard

```text id="imports"
/imports
```

Purpose:
Manage import jobs.

Possible features:

- upload files
- view history
- job status
- error review

Access:
Requires import access permissions

---

## Import Wizard

Possible route:

```text id="importwizard"
/imports/new
```

Purpose:
Import workflow.

Typical steps:

1. upload file
2. map columns
3. validate
4. preview
5. confirm

Access:
Requires lead.import

---

# Exports Module

May share imports section or remain separate.

Possible route:

```text id="exports"
/exports
```

Purpose:
Export CRM data.

Examples:

- leads export
- project export

Access:
Requires export permissions

---

# Audit Logs

---

## Audit Logs Page

```text id="auditlogs"
/audit-logs
```

Purpose:
View important system actions.

Examples:

- lead created
- lead updated
- assignment changes
- user changes

Features:

- filtering
- actor visibility
- date ranges

Access:
Usually restricted to managers/admins

---

# Settings Module

Settings is permission-sensitive.

Most users should not access all settings.

---

## Settings Root

```text id="settingsroot"
/settings
```

Purpose:
Settings navigation hub.

Access:
Restricted

---

# Settings Sections

---

## General Settings

```text id="settingsgeneral"
/settings/general
```

Purpose:
Tenant configuration.

Examples:

- agency info
- branding
- preferences

---

## Team Management

```text id="settingsteam"
/settings/team
```

Purpose:
Manage tenant users.

Features:

- create user
- deactivate user
- edit user

Requires user management permissions.

---

## Roles & Permissions

```text id="settingsroles"
/settings/roles
```

Purpose:
Manage custom roles.

Features:

- create role
- edit permissions
- assign permissions

Requires role management permissions.

---

## Pipeline Settings

```text id="settingspipeline"
/settings/pipeline
```

Purpose:
Manage lead pipeline stages.

Examples:

- rename stages
- reorder stages
- enable/disable stages

Access:
Restricted

---

# Billing Overview

Informational only in MVP.

No payment processing.

---

## Billing Page

```text id="billingroute"
/billing
```

Purpose:
Display subscription info.

Shows:

- current plan
- usage
- limits
- renewal date
- amount

Access:
Usually admin only

---

# Error Routes

---

## Unauthorized

```text id="unauthorized"
/403
```

Purpose:
Displayed when permission denied.

---

## Not Found

```text id="notfound"
/404
```

Purpose:
Missing route or resource.

---

# Permission-Based Navigation

Sidebar visibility depends on permissions.

Example:

Agent may see:

- Dashboard
- Leads
- Projects

Agency Owner may additionally see:

- Settings
- Billing
- Audit Logs

Route visibility should be permission-aware.

---

# Route Groups (Recommended)

Recommended Next.js route grouping:

```text id="routegroups"
(app)
  /dashboard
  /leads
  /projects
  /settings
```

Public routes separated from authenticated routes.

Example:

```text id="routegroups2"
(app)
(auth)
```

This improves layout organization.

---

# Future Routes (Post-MVP)

Not included in MVP.

Potential future routes:

```text id="futureroutes"
/analytics
/notifications
/automations
/integrations
/ai-assistant
```

These should be added only when corresponding modules are implemented.
