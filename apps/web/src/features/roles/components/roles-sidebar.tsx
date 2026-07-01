"use client";

import { AppIcons } from "@/components/icons/app-icons";
import { Input } from "@/components/ui/input";
import type { Role } from "@/features/roles/types";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

interface RolesSidebarProps {
  roles: Role[];
  search: string;
  onSearchChange: (value: string) => void;
  selectedRoleId: string | null;
  onSelectRole: (roleId: string) => void;
}

export function RolesSidebar({
  roles,
  search,
  onSearchChange,
  selectedRoleId,
  onSelectRole,
}: RolesSidebarProps) {
  const normalizedSearch = search.trim().toLowerCase();
  const filteredRoles = normalizedSearch
    ? roles.filter(
        (role) =>
          role.name.toLowerCase().includes(normalizedSearch) ||
          role.description?.toLowerCase().includes(normalizedSearch),
      )
    : roles;

  return (
    <aside className="flex flex-col bg-muted/20 lg:border-r lg:border-border/50">
      <div className="p-3">
        <div className="relative">
          <AppIcons.search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Filter roles..."
            className="h-8 border-transparent bg-background pl-8 text-xs shadow-none"
            aria-label="Search roles"
          />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-3">
        {filteredRoles.length === 0 ? (
          <p className="px-2 py-8 text-center text-xs text-muted-foreground">
            No matching roles
          </p>
        ) : (
          <ul className="space-y-0.5">
            {filteredRoles.map((role) => {
              const selected = role.id === selectedRoleId;
              return (
                <li key={role.id}>
                  <button
                    type="button"
                    onClick={() => onSelectRole(role.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors",
                      selected
                        ? "border-l-2 border-l-primary bg-background pl-2 text-foreground shadow-sm"
                        : "border-l-2 border-l-transparent text-muted-foreground hover:bg-background/60 hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-lg",
                        role.isSystem
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      <AppIcons.roles className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-sm font-medium">
                          {role.name}
                        </span>
                        {role.isSystem ? (
                          <span className="shrink-0 text-[9px] font-medium tracking-wide text-muted-foreground uppercase">
                            System
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-[11px] tabular-nums text-muted-foreground">
                        {formatNumber(role.permissionCount)} permissions ·{" "}
                        {formatNumber(role.userCount)} users
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    </aside>
  );
}
