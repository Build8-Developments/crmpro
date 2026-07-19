"use client";

import Link from "next/link";
import { AppIcons } from "@/components/icons/app-icons";
import { Badge } from "@/components/ui/badge";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { useCurrentUser } from "@/features/auth/hooks";
import { usePermissions } from "@/hooks/use-permissions";

export function WorkspaceSettingsCard() {
  const { data: user } = useCurrentUser();
  const { can } = usePermissions();
  const tenant = user?.tenant;

  if (!tenant) return null;

  const links = [
    can("user.read")
      ? { href: "/users", label: "Team", icon: AppIcons.users }
      : null,
    can("role.read")
      ? { href: "/roles", label: "Roles", icon: AppIcons.roles }
      : null,
    can("pipeline.read")
      ? { href: "/pipelines", label: "Pipelines", icon: AppIcons.pipelines }
      : null,
  ].filter(Boolean) as Array<{
    href: string;
    label: string;
    icon: typeof AppIcons.users;
  }>;

  return (
    <SettingsSection
      title="Workspace"
      description="Agency details shared with your team"
    >
      <div className="flex items-start gap-3 rounded-lg bg-muted/35 px-3 py-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <AppIcons.building className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">
              {tenant.name}
            </p>
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] capitalize">
              {tenant.status.toLowerCase()}
            </Badge>
          </div>
          <p className="mt-0.5 font-mono text-xs text-muted-foreground">
            {tenant.slug}
          </p>
        </div>
      </div>

      {links.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-3">
          {links.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-muted/40"
              >
                <Icon className="size-4 text-muted-foreground" />
                {link.label}
                <AppIcons.chevronRight className="ml-auto size-3.5 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      ) : null}
    </SettingsSection>
  );
}
