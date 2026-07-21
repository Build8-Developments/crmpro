import { AppIcons, type AppIcon } from "@/components/icons/app-icons";
import { ADMIN_PERMISSIONS } from "@crmpro/shared";

export interface QuickAction {
  label: string;
  href: string;
  icon: AppIcon;
  requiredPermissions: string[];
}

export const quickActions: QuickAction[] = [
  {
    label: "Provision tenant",
    href: "/tenants/new",
    icon: AppIcons.building,
    requiredPermissions: [ADMIN_PERMISSIONS.TENANT_CREATE],
  },
  {
    label: "Create plan",
    href: "/plans?create=1",
    icon: AppIcons.chartBar,
    requiredPermissions: [ADMIN_PERMISSIONS.PLAN_CREATE],
  },
  {
    label: "Draft contract",
    href: "/contracts?create=1",
    icon: AppIcons.files,
    requiredPermissions: [ADMIN_PERMISSIONS.CONTRACT_CREATE],
  },
  {
    label: "Invite admin",
    href: "/admins?create=1",
    icon: AppIcons.userPlus,
    requiredPermissions: [ADMIN_PERMISSIONS.ADMIN_MANAGE],
  },
];
