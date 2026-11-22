import { AppIcons, type AppIcon } from "@/components/icons/app-icons";

/**
 * Config-driven navigation.
 *
 * Single source of truth for the sidebar, command palette, route guards and
 * breadcrumbs. Never hardcode nav links in components — consume this.
 */
export interface NavRoute {
  label: string;
  href: string;
  subtitle: string;
  icon: AppIcon;
  /**
   * Permissions required to see/access this route. Empty array = always visible
   * to authenticated users. Permission checks (not role names) drive access.
   */
  requiredPermissions: string[];
  /** Whether this route appears in the command palette search. */
  searchable: boolean;
  /** Extra search terms for the command palette. */
  keywords: string[];
}

export interface NavGroup {
  label: string;
  routes: NavRoute[];
}

/** Primary sidebar: daily work only. Admin pages live in Organization settings. */
export const navGroups: NavGroup[] = [
  {
    label: "Sales",
    routes: [
      {
        label: "Today",
        href: "/today",
        subtitle: "Your plan for the day, in order",
        icon: AppIcons.today,
        requiredPermissions: ["lead.read"],
        searchable: true,
        keywords: ["tasks", "day", "plan", "follow-ups", "home"],
      },
      {
        label: "My performance",
        href: "/performance",
        subtitle: "Your totals, personal bests, badges and rank",
        icon: AppIcons.performance,
        requiredPermissions: ["analytics.read"],
        searchable: true,
        keywords: ["achievements", "badges", "stats", "leaderboard", "rank", "targets", "bests", "my numbers"],
      },
      {
        label: "Dashboard",
        href: "/dashboard",
        subtitle: "Overview of your agency activity",
        icon: AppIcons.dashboard,
        requiredPermissions: [],
        searchable: true,
        keywords: ["home", "overview", "analytics"],
      },
      {
        label: "Leads",
        href: "/leads",
        subtitle: "Manage and track customer leads",
        icon: AppIcons.leads,
        requiredPermissions: ["lead.read"],
        searchable: true,
        keywords: ["contacts", "prospects", "clients"],
      },
      {
        label: "Deals",
        href: "/deals",
        subtitle: "Reservations and contracts on won leads",
        icon: AppIcons.deals,
        requiredPermissions: ["deal.read"],
        searchable: true,
        keywords: ["sales", "won", "revenue", "commission", "reservations", "contracts"],
      },
    ],
  },
  {
    label: "Catalog",
    routes: [
      {
        label: "Projects",
        href: "/projects",
        subtitle: "Projects offered to your leads",
        icon: AppIcons.projects,
        requiredPermissions: ["project.read"],
        searchable: true,
        keywords: ["properties", "developments"],
      },
      {
        label: "Developers",
        href: "/developers",
        subtitle: "Real estate developers catalog",
        icon: AppIcons.developers,
        requiredPermissions: ["developer.read"],
        searchable: true,
        keywords: ["builders", "companies"],
      },
    ],
  },
  {
    label: "Data",
    routes: [
      {
        label: "Files",
        href: "/files",
        subtitle: "Uploaded documents and attachments",
        icon: AppIcons.files,
        requiredPermissions: ["file.read"],
        searchable: true,
        keywords: ["documents", "attachments", "storage"],
      },
      {
        label: "Imports",
        href: "/imports",
        subtitle: "Import leads from CSV",
        icon: AppIcons.imports,
        requiredPermissions: ["import-job.read"],
        searchable: true,
        keywords: ["upload", "csv", "bulk"],
      },
      {
        label: "Exports",
        href: "/exports",
        subtitle: "Export data to CSV",
        icon: AppIcons.exports,
        requiredPermissions: ["export-job.read"],
        searchable: true,
        keywords: ["download", "csv", "reports"],
      },
    ],
  },
];

/** Pinned to the sidebar footer (help, not daily work). */
export const utilityRoutes: NavRoute[] = [
  {
    label: "Help & support",
    href: "/support",
    subtitle: "Chat with CRMPro platform support",
    icon: AppIcons.lifeBuoy,
    requiredPermissions: ["support.read"],
    searchable: true,
    keywords: ["help", "ticket", "contact", "chat", "support", "inbox"],
  },
];

/**
 * Organization settings sections (/settings/*), shown in the settings shell.
 * Each section is gated by its own permission; the settings entry point is
 * visible when at least one section is.
 */
export const settingsNavGroups: NavGroup[] = [
  {
    label: "Organization",
    routes: [
      {
        label: "General",
        href: "/settings",
        subtitle: "Organization name, logo and regional formats",
        icon: AppIcons.building,
        requiredPermissions: ["settings.read"],
        searchable: true,
        keywords: ["organization", "workspace", "company", "logo", "timezone", "currency", "country"],
      },
      {
        label: "Plan & usage",
        href: "/settings/plan",
        subtitle: "Your plan, contract and limits",
        icon: AppIcons.chartBar,
        requiredPermissions: ["settings.read"],
        searchable: true,
        keywords: ["billing", "subscription", "quota", "limits", "storage"],
      },
    ],
  },
  {
    label: "Team",
    routes: [
      {
        label: "Users",
        href: "/settings/users",
        subtitle: "Manage agency members",
        icon: AppIcons.users,
        requiredPermissions: ["user.read"],
        searchable: true,
        keywords: ["team", "staff", "members", "agents"],
      },
      {
        label: "Roles",
        href: "/settings/roles",
        subtitle: "Roles and permissions",
        icon: AppIcons.roles,
        requiredPermissions: ["role.read"],
        searchable: true,
        keywords: ["permissions", "access", "rbac"],
      },
      {
        label: "Teams",
        href: "/settings/teams",
        subtitle: "Team leaders and who reports to them",
        icon: AppIcons.team,
        requiredPermissions: ["team.read"],
        searchable: true,
        keywords: ["teams", "leader", "group", "visibility"],
      },
    ],
  },
  {
    label: "Leads & sales",
    routes: [
      {
        label: "Pipelines",
        href: "/settings/pipelines",
        subtitle: "Sales stages for your leads",
        icon: AppIcons.pipelines,
        requiredPermissions: ["pipeline.read"],
        searchable: true,
        keywords: ["stages", "funnel", "board"],
      },
      {
        label: "Lead Sources",
        href: "/settings/lead-sources",
        subtitle: "Where your leads come from",
        icon: AppIcons.leadSources,
        requiredPermissions: ["lead-source.read"],
        searchable: true,
        keywords: ["channels", "campaigns", "origin"],
      },
      {
        label: "Lost reasons",
        href: "/settings/lost-reasons",
        subtitle: "Why deals are lost, and when to try again",
        icon: AppIcons.archive,
        requiredPermissions: ["settings.read"],
        searchable: true,
        keywords: ["lost", "reasons", "recycle", "re-engage"],
      },
      {
        label: "Workday & response times",
        href: "/settings/workday",
        subtitle: "Working hours, first-call deadline and daily goal",
        icon: AppIcons.clock,
        requiredPermissions: ["settings.read"],
        searchable: true,
        keywords: ["working hours", "sla", "response time", "goal", "workday", "escalation"],
      },
      {
        label: "Targets",
        href: "/settings/targets",
        subtitle: "Monthly goals per person and for the workspace",
        icon: AppIcons.trendingUp,
        requiredPermissions: ["target.manage"],
        searchable: true,
        keywords: ["targets", "goals", "quota", "deals", "revenue", "commission", "kpi"],
      },
      {
        label: "Marketing spend",
        href: "/settings/spend",
        subtitle: "Spend per lead source and cost per lead, visit and deal",
        icon: AppIcons.percentage,
        requiredPermissions: ["spend.manage"],
        searchable: true,
        keywords: ["spend", "budget", "marketing", "cost per lead", "cpl", "ads", "roi"],
      },
      {
        label: "Integrations",
        href: "/settings/integrations",
        subtitle: "API keys for website forms, Zapier and lead ads",
        icon: AppIcons.key,
        requiredPermissions: ["settings.manage"],
        searchable: true,
        keywords: ["api", "api key", "zapier", "make", "webhook", "website form", "facebook", "meta", "lead ads"],
      },
    ],
  },
  {
    label: "Activity",
    routes: [
      {
        label: "Audit log",
        href: "/settings/audit",
        subtitle: "Activity and change history",
        icon: AppIcons.audit,
        requiredPermissions: ["audit.read"],
        searchable: true,
        keywords: ["logs", "history", "activity"],
      },
    ],
  },
];

/** Personal routes available via topbar / command palette (not primary sidebar). */
export const accountRoutes: NavRoute[] = [
  {
    label: "Notifications",
    href: "/notifications",
    subtitle: "Alerts and activity for your account",
    icon: AppIcons.notifications,
    requiredPermissions: ["notification.read"],
    searchable: true,
    keywords: ["alerts", "inbox", "unread", "activity"],
  },
  {
    label: "My account",
    href: "/account",
    subtitle: "Your profile, password and notification preferences",
    icon: AppIcons.profile,
    requiredPermissions: [],
    searchable: true,
    keywords: ["profile", "password", "security", "sessions", "preferences"],
  },
];

/** Sections of My account (/account/*), shown in the account settings shell. */
export const accountSectionRoutes: NavRoute[] = [
  {
    label: "Profile",
    href: "/account",
    subtitle: "Your name and contact details",
    icon: AppIcons.profile,
    requiredPermissions: [],
    searchable: false,
    keywords: [],
  },
  {
    label: "Security",
    href: "/account/security",
    subtitle: "Password and signed-in devices",
    icon: AppIcons.lock,
    requiredPermissions: [],
    searchable: true,
    keywords: ["password", "sessions", "devices", "sign out"],
  },
  {
    label: "Notifications",
    href: "/account/notifications",
    subtitle: "Which alerts you receive",
    icon: AppIcons.notifications,
    requiredPermissions: [],
    searchable: true,
    keywords: ["alerts", "preferences", "email"],
  },
];

/** Flat list of every navigable route. */
export const allRoutes: NavRoute[] = [
  ...navGroups.flatMap((group) => group.routes),
  ...utilityRoutes,
  ...settingsNavGroups.flatMap((group) => group.routes),
  ...accountRoutes,
  ...accountSectionRoutes,
];

export interface RouteCrumb {
  label: string;
  href?: string;
}

/**
 * Breadcrumbs for a pathname. Settings and account pages are two levels
 * (Settings › Users); everything else is a single crumb. Pages can append
 * deeper levels with `usePageBreadcrumbs`.
 */
export function getRouteBreadcrumbs(pathname: string): RouteCrumb[] {
  // Account sections share /account with the "My account" entry; prefer the
  // section so the trail reads "My account › Profile".
  const route =
    accountSectionRoutes.find((section) => section.href === pathname) ??
    findRouteByPath(pathname);
  if (!route) return [];

  const sectionOf = (prefix: string, label: string, href: string) =>
    pathname === prefix || pathname.startsWith(`${prefix}/`)
      ? [{ label, href }, { label: route.label, href: route.href }]
      : null;

  return (
    sectionOf("/settings", "Settings", "/settings") ??
    sectionOf("/account", "My account", "/account") ?? [
      { label: route.label, href: route.href },
    ]
  );
}

/**
 * Find the route whose href best matches a pathname (for topbar/breadcrumbs).
 * Longest match wins so `/settings/users` beats `/settings`.
 */
export function findRouteByPath(pathname: string): NavRoute | undefined {
  return allRoutes
    .filter(
      (route) =>
        pathname === route.href || pathname.startsWith(`${route.href}/`),
    )
    .sort((a, b) => b.href.length - a.href.length)[0];
}

/** Look up a route by its exact href (used by placeholder pages). */
export function getRoute(href: string): NavRoute | undefined {
  return allRoutes.find((route) => route.href === href);
}
