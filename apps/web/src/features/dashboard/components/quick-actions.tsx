import Link from "next/link";
import { AppIcons } from "@/components/icons/app-icons";
import { cn } from "@/lib/utils";
import { DASHBOARD_ENTER_CLASS, dashboardEnterStyle } from "../utils";

const actions = [
  {
    label: "Add Lead",
    href: "/leads",
    icon: AppIcons.create,
  },
  {
    label: "Import CSV",
    href: "/imports",
    icon: AppIcons.imports,
  },
  {
    label: "Pipelines",
    href: "/settings/pipelines",
    icon: AppIcons.pipelines,
  },
  {
    label: "New Project",
    href: "/projects",
    icon: AppIcons.projects,
  },
] as const;

export function QuickActions() {
  return (
    <section
      className={`${DASHBOARD_ENTER_CLASS} space-y-2`}
      style={dashboardEnterStyle(7)}
    >
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Quick Actions
      </h2>
      <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
        {actions.map((action, index) => {
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
              <span className="text-xs font-medium text-foreground">
                {action.label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
