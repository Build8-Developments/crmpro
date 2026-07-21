import { AppIcons, type AppIcon } from "@/components/icons/app-icons";
import { ADMIN_PERMISSIONS } from "@crmpro/shared";

/**
 * Config-driven navigation for the platform admin dashboard.
 */
export interface NavRoute {
  label: string;
  href: string;
  subtitle: string;
  icon: AppIcon;
  requiredPermissions: string[];
  /** When true, any listed permission grants access (default: all required). */
  requireAnyPermission?: boolean;
  searchable: boolean;
  keywords: string[];
}

export interface NavGroup {
  label: string;
  routes: NavRoute[];
}

export const navGroups: NavGroup[] = [
  {
    label: "Main",
    routes: [
      {
        label: "Dashboard",
        href: "/dashboard",
        subtitle: "Ops console — queues and health",
        icon: AppIcons.dashboard,
        requiredPermissions: [],
        searchable: true,
        keywords: ["home", "overview", "analytics", "metrics"],
      },
      {
        label: "Tenants",
        href: "/tenants",
        subtitle: "Agencies and workspaces",
        icon: AppIcons.building,
        requiredPermissions: [ADMIN_PERMISSIONS.TENANT_READ],
        searchable: true,
        keywords: ["agencies", "workspaces", "customers"],
      },
      {
        label: "Plans",
        href: "/plans",
        subtitle: "Subscription plan templates",
        icon: AppIcons.chartBar,
        requiredPermissions: [ADMIN_PERMISSIONS.PLAN_READ],
        searchable: true,
        keywords: ["subscriptions", "pricing", "limits"],
      },
      {
        label: "Contracts",
        href: "/contracts",
        subtitle: "Commercial agreements",
        icon: AppIcons.files,
        requiredPermissions: [ADMIN_PERMISSIONS.CONTRACT_READ],
        searchable: true,
        keywords: ["billing", "agreements", "deals"],
      },
    ],
  },
  {
    label: "Platform",
    routes: [
      {
        label: "Admins",
        href: "/admins",
        subtitle: "Platform staff accounts",
        icon: AppIcons.users,
        requiredPermissions: [
          ADMIN_PERMISSIONS.ADMIN_MANAGE,
          ADMIN_PERMISSIONS.AUDIT_READ,
        ],
        requireAnyPermission: true,
        searchable: true,
        keywords: ["staff", "operators", "team"],
      },
      {
        label: "Audit Logs",
        href: "/audit-logs",
        subtitle: "Administrative activity trail",
        icon: AppIcons.audit,
        requiredPermissions: [ADMIN_PERMISSIONS.AUDIT_READ],
        searchable: true,
        keywords: ["logs", "history", "security", "events"],
      },
      {
        label: "System",
        href: "/system",
        subtitle: "Health, queues, workers, and jobs",
        icon: AppIcons.activity,
        requiredPermissions: [ADMIN_PERMISSIONS.SUPPORT_ACCESS],
        searchable: true,
        keywords: [
          "health",
          "redis",
          "database",
          "uptime",
          "status",
          "tools",
          "triage",
          "ops",
          "queues",
          "workers",
          "jobs",
          "latency",
          "metrics",
        ],
      },
      {
        label: "Imports",
        href: "/imports",
        subtitle: "Failed and partial import jobs",
        icon: AppIcons.imports,
        requiredPermissions: [ADMIN_PERMISSIONS.PLATFORM_ANALYTICS_READ],
        searchable: true,
        keywords: ["csv", "upload", "failed", "jobs"],
      },
      {
        label: "Support",
        href: "/support",
        subtitle: "User conversations and triage",
        icon: AppIcons.lifeBuoy,
        requiredPermissions: [ADMIN_PERMISSIONS.SUPPORT_ACCESS],
        searchable: true,
        keywords: ["helpdesk", "ops", "tools", "triage", "inbox", "tickets"],
      },
    ],
  },
];

export const accountRoutes: NavRoute[] = [];

export const allRoutes: NavRoute[] = [
  ...navGroups.flatMap((group) => group.routes),
  ...accountRoutes,
];

export function findRouteByPath(pathname: string): NavRoute | undefined {
  return allRoutes.find(
    (route) => pathname === route.href || pathname.startsWith(`${route.href}/`),
  );
}

export function getRoute(href: string): NavRoute | undefined {
  return allRoutes.find((route) => route.href === href);
}
