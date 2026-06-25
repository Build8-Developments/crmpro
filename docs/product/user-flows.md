# CRMPro — User Flows

## Overview

This document defines the primary end-to-end user flows in CRMPro.

These flows describe:

- who initiates an action
- what triggers it
- how the system should behave
- important side effects
- expected outcomes

This document intentionally focuses on **business behavior**, not exact implementation details.

Exact:

- database schemas
- DTO fields
- API payloads
- UI form fields

may evolve over time and are documented elsewhere.

---

# Actors

CRMPro has four primary actor types.

## Super Admin

Internal CRMPro operator responsible for platform-wide management.

---

## Agency Admin

Owner or administrator of a tenant (agency).

Responsible for:

- team management
- configuration
- oversight

---

## Manager

Team lead inside a tenant.

Responsible for:

- operational oversight
- lead assignment
- performance monitoring

---

## Agent

Sales representative and daily CRM user.

Responsible for:

- handling leads
- updating pipeline
- logging interactions

---

# Flow 1 — Tenant Onboarding

## Actor

Super Admin

---

## Trigger

CRMPro onboards a new agency.

---

## Flow

### 1

Super admin creates a new tenant from the Admin Dashboard.

### 2

Super admin configures tenant-level settings such as:

- subscription plan
- usage limits
- operational defaults

### 3

System creates tenant identity and initializes default configuration.

This may include:

- default roles
- default permissions
- default pipeline stages
- default settings

### 4

System creates the initial tenant administrator account.

### 5

Tenant credentials or access instructions are shared with the agency.

---

## Side Effects

System may create:

- audit log entries
- billing metadata
- default configuration records

---

## Result

Tenant becomes operational and ready for first login.

---

# Flow 2 — User Authentication

## Actor

Tenant User

---

## Trigger

User attempts to access CRM.

---

## Flow

### 1

User provides authentication credentials.

### 2

System validates identity.

### 3

System verifies:

- user is active
- tenant is active
- access is allowed

### 4

Authenticated session is created.

Session must contain enough information to identify:

- user
- tenant
- authorization scope

### 5

User is redirected to appropriate dashboard.

---

## Failure Cases

Authentication fails if:

- credentials are invalid
- account is inactive
- tenant is suspended

---

## Result

Authorized user gains access to tenant CRM.

---

# Flow 3 — Team Member Creation

## Actor

Agency Admin

---

## Trigger

Agency wants to add a new team member.

---

## Flow

### 1

Admin opens team management area.

### 2

Admin initiates user creation.

### 3

Admin provides required user information and assigns an appropriate role.

Exact required fields may evolve over time.

### 4

System validates:

- plan limits
- permissions
- data integrity

### 5

User account is created.

### 6

User receives access instructions or credentials.

---

## Side Effects

System may create:

- audit log entry
- onboarding event
- invitation record

---

## Result

New team member can access CRM according to assigned role.

---

# Flow 4 — Role Configuration

## Actor

Agency Admin

---

## Trigger

Agency wants custom access control.

Example:
Creating a “Call Center” role.

---

## Flow

### 1

Admin opens role management.

### 2

Admin creates or edits a role.

### 3

Admin configures permissions.

Permissions determine which actions users may perform.

### 4

System saves updated authorization rules.

---

## Side Effects

System may:

- invalidate permission cache
- refresh active authorization state
- create audit log

---

## Result

Updated permissions apply to relevant users.

---

# Flow 5 — Project Creation

## Actor

Agency Admin / Manager

---

## Trigger

Agency starts tracking a new real estate project.

Example:
A new development becomes relevant to sales.

---

## Flow

### 1

User opens projects module.

### 2

User initiates project creation.

### 3

User provides project metadata.

This may include:

- identity
- developer information
- location
- descriptive business context

### 4

System validates and stores project.

---

## Side Effects

System creates audit trail.

---

## Result

Project becomes available for lead association and search.

---

# Flow 6 — Lead Creation

## Actor

Agent / Manager / Admin

---

## Trigger

New lead enters business pipeline.

Possible sources:

- manual entry
- referral
- inbound call
- import
- marketing channels

---

## Flow

### 1

User opens leads module.

### 2

User initiates lead creation.

### 3

User provides lead information including:

- contact details
- source context
- business context
- project interest

Exact fields may evolve.

### 4

System validates data.

### 5

Lead is created.

---

## Side Effects

System may create:

- audit log
- activity timeline entry
- analytics event

---

## Result

Lead enters pipeline.

---

# Flow 7 — Lead Assignment

## Actor

Manager / Admin

---

## Trigger

Lead needs assignment or reassignment.

---

## Flow

### 1

Manager opens lead details.

### 2

Manager selects target assignee.

### 3

Assignment is confirmed.

### 4

System updates lead ownership.

---

## Side Effects

System may create:

- audit log
- timeline event
- notification

---

## Result

Lead becomes owned by selected user.

---

# Flow 8 — Lead Progress Update

## Actor

Agent

---

## Trigger

Agent interacts with client.

Examples:

- call
- meeting
- follow-up
- negotiation

---

## Flow

### 1

Agent opens lead.

### 2

Agent reviews existing context:

- lead details
- previous notes
- project interests
- timeline history

### 3

Agent performs business interaction.

### 4

Agent updates lead state.

This may include:

- pipeline status
- qualification state
- business notes
- follow-up information

### 5

System saves changes.

---

## Side Effects

System may create:

- audit log
- activity event
- analytics event

---

## Result

Lead progresses through pipeline.

---

# Flow 9 — Activity Logging

## Actor

Agent

---

## Trigger

Any meaningful client interaction.

Examples:

- phone call
- meeting
- site visit
- negotiation
- internal note

---

## Flow

### 1

User opens lead.

### 2

User creates activity entry.

### 3

User records interaction details.

### 4

System stores activity.

---

## Result

Lead timeline becomes richer and more informative.

---

# Flow 10 — Lead Import

## Actor

Agency Admin / Manager

---

## Trigger

Agency imports external lead data.

Examples:

- CSV
- spreadsheet migration
- legacy CRM migration

---

## Flow

### 1

User opens import module.

### 2

User uploads source file.

### 3

System parses input.

### 4

User maps imported data to CRM structure.

### 5

System validates imported records.

Validation may include:

- missing required data
- invalid formats
- duplicate detection

### 6

User reviews preview.

### 7

User confirms import.

---

## Large Imports

Large imports should be processed asynchronously.

---

## Side Effects

System may create:

- import job record
- audit logs
- analytics events

---

## Result

Valid records are inserted into CRM.

---

# Flow 11 — Manager Activity Review

## Actor

Manager / Agency Admin

---

## Trigger

Manager wants operational visibility.

---

## Flow

### 1

Manager opens dashboard or activity module.

### 2

Manager reviews business metrics.

Examples:

- active leads
- stale leads
- pipeline distribution
- team activity

### 3

Manager filters data by:

- user
- date
- action
- module

### 4

Manager identifies bottlenecks or issues.

---

## Result

Management gains operational insight.

---

# Flow 12 — Tenant Suspension

## Actor

Super Admin

---

## Trigger

Examples:

- subscription issue
- abuse
- manual intervention

---

## Flow

### 1

Super admin opens tenant management.

### 2

Super admin selects tenant.

### 3

Tenant status is changed.

### 4

System applies access restrictions.

---

## System Behavior

Suspended tenants must not access protected resources.

Existing sessions should eventually expire or be revoked.

---

## Result

Tenant access becomes restricted or blocked.

---

# General System Rules

These rules apply across all flows.

---

## Tenant Isolation

All tenant business data must remain isolated.

No tenant may access another tenant’s data.

---

## Authorization

All protected actions require permission checks.

Frontend restrictions improve UX.
Backend validation is mandatory.

---

## Auditability

Important business actions should be traceable.

The system should preserve accountability for:

- changes
- assignments
- updates
- administrative actions

---

## Async Processing

Heavy operations should not block user-facing workflows.

Examples:

- imports
- exports
- notifications
- analytics processing
