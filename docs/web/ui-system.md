# CRMPro CRM App — UI System

# Overview

This document defines the UI and design system principles for the tenant-facing CRM application.

Application path:

```text
/apps/web
```

This document exists to ensure visual consistency across:

- pages
- components
- modules
- AI-generated UI

The CRM UI should feel:

- premium
- modern
- fast
- enterprise-grade
- highly readable

The product is a data-heavy B2B SaaS platform.

Readability and operational efficiency are more important than flashy visuals.

---

# Design Philosophy

CRMPro is not:

- a marketing website
- a consumer social app
- a playful mobile-first product

It is an operational dashboard used daily by professionals.

Design should optimize for:

- speed
- clarity
- confidence
- density
- minimal friction

Primary question when designing UI:

> Can the user complete their work quickly and confidently?

---

# Visual Direction

Primary visual inspiration:

- Linear
- modern enterprise SaaS dashboards
- premium B2B tooling

Visual characteristics:

- dark sidebar
- light content area
- subtle elevation
- restrained colors
- strong typography hierarchy

Avoid visual noise.

---

# Theme

Theme tokens are centralized in:

```text
/apps/*/app/globals.css
```

CRM and Admin should share the same design system.

Avoid app-specific visual divergence unless explicitly required.

---

# Color System

## Primary Accent

Primary brand accent is emerald-green.

Used for:

- primary actions
- active states
- selected navigation
- positive indicators
- charts

Accent should feel premium, not loud.

Avoid oversaturation.

---

## Background

Content area uses light neutral background.

Goals:

- reduce eye fatigue
- improve table readability
- create subtle contrast with cards

Background should feel clean and calm.

---

## Sidebar

Sidebar uses dark neutral background.

Purpose:

- strong navigation anchor
- visual separation from content
- premium enterprise feel

Sidebar should feel stable and non-distracting.

---

## Semantic Colors

Use semantic colors consistently.

---

### Success

Used for:

- success states
- completed actions
- positive KPI indicators

---

### Warning

Used for:

- warnings
- stale leads
- expiring states

---

### Destructive

Used for:

- deletion
- dangerous actions
- failures

Must be used sparingly.

---

# Typography

Typography should feel clean and modern.

Preferred fonts:

- Inter
  or
- Geist

Typography should prioritize readability over personality.

---

# Type Hierarchy

Use clear hierarchy.

---

## Page Title

Largest heading on page.

Examples:

- Leads
- Projects
- Settings

Should immediately communicate page context.

---

## Section Titles

Used for:

- cards
- panels
- sections

Should be visually distinct from body text.

---

## Body Text

Default reading content.

Must remain highly readable.

Avoid excessively small text.

---

## Muted Text

Used for secondary information.

Examples:

- helper text
- metadata
- timestamps

Should remain readable.

Never reduce contrast too aggressively.

---

# Spacing System

Spacing should feel consistent and intentional.

Avoid arbitrary spacing.

Prefer consistent spacing scale.

Examples of common spacing units:

- tight spacing for dense data
- medium spacing for forms
- larger spacing for page sections

Visual rhythm matters.

---

# Border Radius

CRMPro uses moderate radius.

Target feel:

- modern
- premium
- slightly sharp

Avoid:

- fully rounded bubble UI
- overly sharp legacy UI

Current design leans enterprise-modern.

---

# Shadows & Elevation

Use subtle shadows only.

Shadows should communicate hierarchy, not decoration.

Good uses:

- modals
- dropdowns
- popovers
- elevated cards

Avoid heavy shadows.

---

# Layout System

Authenticated CRM uses app shell.

Structure:

Sidebar
Topbar
Content Area

---

# Sidebar

Sidebar contains primary navigation.

Examples:

- Dashboard
- Leads
- Projects
- Imports
- Audit Logs
- Settings
- Billing

Sidebar behavior:

- persistent on desktop
- collapsible in future
- permission-aware

Active navigation should be obvious.

---

# Topbar

Topbar contains contextual actions.

Examples:

- breadcrumbs
- search
- user menu
- quick actions

Topbar should remain lightweight.

Avoid overcrowding.

---

# Page Structure

Most CRM pages follow:

Page Header
Toolbar / Filters
Primary Content
Secondary Panels

Example:

Leads page:

Header
→ Filters
→ Table
→ Pagination

---

# Cards

Cards group related information.

Examples:

- KPIs
- stats
- summaries
- detail sections

Cards should have:

- clear boundaries
- consistent padding
- predictable spacing

Avoid deeply nested cards.

---

# Tables

Tables are critical in CRMPro.

Many workflows are table-driven.

Examples:

- leads
- audit logs
- users
- imports

Table UX is extremely important.

---

# Table Principles

Tables must support:

- scanning
- filtering
- sorting
- bulk actions

Optimize for operational speed.

---

## Density

Tables should be moderately dense.

Not too spacious.

Not too cramped.

Goal:

Maximize usable information without hurting readability.

---

## Columns

Columns should prioritize important business data.

Avoid excessive columns.

Support future:

- column toggles
- resizing

---

## Row Actions

Row actions should be predictable.

Examples:

- view
- edit
- assign
- delete

Avoid clutter.

Use dropdown actions when needed.

---

# Forms

Forms are common in CRM workflows.

Examples:

- create lead
- create user
- settings
- project creation

Forms should feel simple and efficient.

---

# Form Principles

Forms should prioritize:

- fast completion
- low cognitive load
- clear validation

---

## Labels

Labels should always be clear.

Avoid ambiguous labels.

---

## Validation

Errors should be:

- clear
- actionable
- near field

Bad:
Invalid input

Good:
Phone number format is invalid

---

## Required Fields

Required fields should be obvious.

But avoid overwhelming users with too many required inputs.

---

# Modals & Dialogs

Use dialogs for focused tasks.

Good examples:

- confirmation
- quick create
- small edits

Avoid giant complex dialogs.

If workflow becomes large, prefer dedicated page.

---

# Drawers / Sheets

Use sheets for contextual workflows.

Examples:

- lead quick view
- filters
- side panels

Useful when context should remain visible.

---

# Buttons

Buttons communicate action priority.

Use clear hierarchy.

---

## Primary Button

Main CTA.

Examples:

- Create Lead
- Save Changes

Only one primary action per area when possible.

---

## Secondary Button

Less important actions.

Examples:

- Cancel
- Back

---

## Destructive Button

Used only for dangerous actions.

Examples:

- Delete
- Remove

Should visually communicate risk.

---

# Loading States

Loading should feel polished.

Prefer:

- skeletons
- subtle loaders
- optimistic UI when safe

Avoid blank screens.

---

# Empty States

Empty states matter.

Examples:

- no leads
- no projects
- no imports

Good empty state should explain:

- what this page is
- why it’s empty
- what to do next

Example:

No leads yet
Create your first lead to start managing your pipeline.

---

# Notifications / Feedback

System feedback should be immediate.

Examples:

- success toast
- error toast
- status badge

Feedback should be informative but lightweight.

---

# Permission-Aware UI

UI visibility depends on permissions.

Examples:

Users without permission should not see:

- restricted routes
- dangerous actions
- admin settings

Permission-aware UI improves clarity.

Backend remains source of truth.

---

# Responsive Behavior

CRMPro is desktop-first.

Primary target:

- laptops
- desktops
- large screens

Mobile support should exist but is secondary.

Complex workflows prioritize desktop usability.

---

# Animation

Animation should be subtle.

Good uses:

- hover states
- transitions
- panel opening
- dialog appearance

Avoid decorative animations.

Speed matters more than flair.

---

# AI UI Rules

All AI-generated UI must follow these rules.

---

Rule 1
Prefer existing shared components.

---

Rule 2
Use consistent spacing and hierarchy.

---

Rule 3
Optimize for data readability.

---

Rule 4
Avoid decorative UI patterns.

Examples to avoid:

- glassmorphism
- neon effects
- flashy gradients

---

Rule 5
When uncertain, prefer simple enterprise UI over experimental UI.
