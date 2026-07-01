# CRM Web Current State

Last updated: July 2026

## Summary

`apps/web` is currently a Phase 1 frontend foundation and UX polish shell. It is not yet a business application with real CRM screens, data fetching, auth enforcement, or CRUD flows.

The current web app is best described as:

- A polished app shell
- Placeholder protected routes
- Config-driven navigation
- shadcn primitives as UI foundations
- Custom CRM layout components on top
- Mock-only topbar interactions
- Ready for Phase 2 product work

## Current Look And Feel

The app now aims for a premium SaaS shell rather than a generic dashboard template.

The visual direction is:

- Dark sidebar
- Light or dark content surface depending on theme
- Emerald accent color
- Compact topbar
- Full-width content area
- Subtle motion
- Minimal placeholder content

Light mode uses a subtle inset frame around the main app surface. Dark mode uses a flush shell to avoid doubled borders, awkward radii, and visual noise.

## Layout

The protected app layout is:

- Sidebar on desktop
- Mobile drawer sidebar on small screens
- Sticky topbar
- Full-width content area
- Global command palette mounted at shell level

The main app shell intentionally does not use a centered page container. Page content is full-width and responsive.

## Sidebar

The sidebar is currently:

- Dark and persistent on desktop
- Collapsible to an icon rail
- Drawer-based on mobile
- Route-config driven
- Permission-aware with a Phase 1 placeholder permission fallback
- Scrollable on short screens with the scrollbar visually hidden

Current groups:

- Main: Dashboard, Leads, Pipelines
- Catalog: Developers, Projects, Lead Sources
- Team: Users, Roles
- Operations: Files, Imports, Exports, Audit

Notifications and Settings are intentionally not sidebar routes.

## Topbar

The topbar currently includes:

- Mobile menu button
- Desktop sidebar collapse button
- Page title and subtitle
- Responsive command palette trigger
- Notification bell
- Theme toggle
- GitHub-style `New` quick action dropdown
- User avatar menu

On smaller screens the full command trigger collapses to an icon-only search button. Mobile topbar overlays are coordinated so notifications, create menu, user menu, and command palette do not stack on each other.

## Notifications

Notifications are mock-only.

Desktop uses a shadcn dropdown menu.

Mobile uses a custom fixed panel instead of Radix popper positioning, because dropdown positioning was unreliable on phone widths. The mobile panel:

- Opens below the topbar
- Stays inside the viewport
- Closes on outside click
- Closes on `Escape`
- Animates in and out

## Theme

Light and dark themes are already configured in `src/app/globals.css`.

Current behavior:

- Theme toggle exists in the topbar
- Theme persists in `localStorage` as `crmpro-theme`
- First load respects system preference when no saved preference exists
- A small inline script prevents theme flash
- Theme switching animates smoothly using a temporary `theme-transition` class

## Command Palette

The command palette currently:

- Opens with `Ctrl+K` / `Cmd+K`
- Is centered vertically and horizontally
- Uses route config for navigation entries
- Includes quick action entries
- Has open/close animation

It does not yet do real search over leads, projects, users, or commands.

## Routing

Current protected placeholder routes:

- `/dashboard`
- `/leads`
- `/pipelines`
- `/developers`
- `/projects`
- `/lead-sources`
- `/users`
- `/roles`
- `/files`
- `/imports`
- `/exports`
- `/audit`
- `/settings`

Current public route:

- `/login`

Root `/` redirects to `/dashboard`.

## What Is Still Placeholder

The following are intentionally fake or scaffold-only:

- Login page
- Auth protection
- Current user identity
- Notification data
- Quick action behavior
- Command palette search
- All protected route pages
- Permissions enforcement
- API-backed UI

## What Looks Good Now

In my opinion, the current strongest parts are:

- The architecture is in the right shape for future features.
- Navigation is correctly config-driven instead of hardcoded per component.
- The shell now feels closer to a real SaaS product.
- The mobile topbar and overlays are much more stable after the recent polish.
- Theme switching feels more intentional and less abrupt.
- The app has a clear primitives-vs-custom-components split.

## Current Risks

The topbar is getting large and should not keep absorbing complexity forever. It now handles several responsibilities:

- Command trigger
- Quick actions
- Theme toggle
- Notifications
- User menu
- Mobile overlay coordination

This is acceptable for Phase 1 polish, but it should be split into smaller files before adding real product logic.

The mobile notification panel is custom rather than shadcn/Radix. That is fine for now because it solves the phone viewport issue, but if notification behavior grows, it should become a dedicated component.

The permission names in `routes.ts` still need to be reconciled with the backend/shared permission catalog.

## Recommended Next Steps

### 1. Split The Topbar

Before Phase 2 grows the app, extract:

- `topbar.tsx`
- `command-trigger.tsx`
- `quick-actions.tsx`
- `notification-menu.tsx`
- `theme-toggle.tsx`
- `user-menu.tsx`

This keeps the shell maintainable and avoids turning the topbar into a god component.

### 2. Add Real Auth Foundation

Next priority should be real auth wiring:

- Tenant slug + email + password login form
- Access token in memory
- Refresh cookie flow
- Session bootstrap
- Logout
- Protected layout redirect behavior

Auth should be done before building real CRM screens.

### 3. Align Permissions

Route permissions should be verified against the actual backend/shared permission keys.

This should happen before real route guards or permission-aware UI become user-facing.

### 4. Build A Real Dashboard Skeleton

After auth, build a lightweight real dashboard skeleton:

- No heavy charts yet
- Basic API-backed summary cards
- Recent leads / latest activity placeholders
- Loading and error states

This will validate TanStack Query, API client behavior, and layout under real data.

### 5. Start Leads Module

The first real CRM module should probably be Leads because it drives most CRM value.

Recommended order:

1. Leads list
2. Filters/search
3. Lead detail drawer
4. Lead create flow
5. Lead timeline/notes

### 6. Improve Component Boundaries

Introduce small custom CRM components as needed:

- `PageHeader`
- `EmptyState`
- `DataToolbar`
- `StatusBadge`
- `MetricCard`
- `SectionCard`

Do this only when real screens need them, not speculatively.

## Opinionated Phase 2 Direction

I would not start with analytics or fancy dashboards.

The best next move is:

1. Finish auth
2. Wire API client refresh behavior
3. Build dashboard with very light real data
4. Build leads list
5. Build lead detail drawer

That sequence validates the core product loop without over-investing in presentation-only UI.

