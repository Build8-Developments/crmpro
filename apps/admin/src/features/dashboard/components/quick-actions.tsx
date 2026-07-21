"use client";

import Link from "next/link";
import { AppIcons } from "@/components/icons/app-icons";
import { usePermissions } from "@/hooks/use-permissions";
import { ADMIN_PERMISSIONS } from "@crmpro/shared";
import { cn } from "@/lib/utils";
import { DASHBOARD_ENTER_CLASS, dashboardEnterStyle } from "../utils";

const actions = [
  {
    label: "Provision tenant",
    description: "Create workspace + owner",
    href: "/tenants/new",
    icon: AppIcons.building,
    permission: ADMIN_PERMISSIONS.TENANT_CREATE,
  },
  {
    label: "Create plan",
    description: "Open plan builder",
    href: "/plans?create=1",
    icon: AppIcons.chartBar,
    permission: ADMIN_PERMISSIONS.PLAN_CREATE,
  },
  {
    label: "Draft contract",
    description: "Start commercial terms",
    href: "/contracts?create=1",
    icon: AppIcons.files,
    permission: ADMIN_PERMISSIONS.CONTRACT_CREATE,
  },
  {
    label: "Invite admin",
    description: "Add platform staff",
    href: "/admins?create=1",
    icon: AppIcons.userPlus,
    permission: ADMIN_PERMISSIONS.ADMIN_MANAGE,
  },
] as const;

export function QuickActions() {
  const { can } = usePermissions();
  const visible = actions.filter((action) => can(action.permission));

  if (visible.length === 0) {
    return null;
  }

  return (
    <section
      className={`${DASHBOARD_ENTER_CLASS} space-y-2`}
      style={dashboardEnterStyle(7)}
    >
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Create
      </h2>
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        {visible.map((action, index) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.href}
              href={action.href}
              className={cn(
                "group flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2.5 shadow-xs",
                "transition-shadow duration-150 ease-out hover:shadow-sm",
              )}
              style={dashboardEnterStyle(index + 8)}
            >
              <div className="flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Icon className="size-4" stroke={2} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-foreground">
                  {action.label}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {action.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
