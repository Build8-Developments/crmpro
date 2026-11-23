import { AppIcons, type AppIcon } from "@/components/icons/app-icons";

/**
 * Config-driven "+ Create" quick actions for the topbar.
 * Permission-aware; consumed by the QuickActions dropdown.
 *
 * Phase 1: `href` targets are the (placeholder) list pages. Real create flows
 * (drawers/dialogs) arrive in later phases.
 */
export interface QuickAction {
  label: string;
  href: string;
  icon: AppIcon;
  requiredPermissions: string[];
}

export const quickActions: QuickAction[] = [
  {
    label: "New Lead",
    href: "/leads",
    icon: AppIcons.leads,
    requiredPermissions: ["lead.create"],
  },
  {
    label: "New Project",
    href: "/projects",
    icon: AppIcons.projects,
    requiredPermissions: ["project.create"],
  },
  {
    label: "Import CSV",
    href: "/imports",
    icon: AppIcons.imports,
    requiredPermissions: ["import-job.create"],
  },
  {
    label: "New User",
    href: "/settings/users",
    icon: AppIcons.users,
    requiredPermissions: ["user.create"],
  },
];
