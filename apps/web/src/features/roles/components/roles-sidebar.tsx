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
    <aside className="flex min-h-0 flex-col bg-muted/20 lg:border-r lg:border-border/50">
      <div className="border-b border-border/40 px-3 py-2.5">
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

      <nav className="min-h-0 flex-1 overflow-y-auto p-2">
        {filteredRoles.length === 0 ? (
          <p className="px-2 py-8 text-center text-xs text-muted-foreground">
            No matching roles
          </p>
        ) : (
          <ul className="space-y-1">
            {filteredRoles.map((role) => {
              const selected = role.id === selectedRoleId;
              return (
                <li key={role.id}>
                  <button
                    type="button"
                    onClick={() => onSelectRole(role.id)}
                    className={cn(
                      "flex w-full items-start gap-2 rounded-lg px-2.5 py-2 text-left transition-colors",
                      selected
                        ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                        : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-md",
                        selected
                          ? "bg-primary/10 text-primary"
                          : "bg-muted/70 text-muted-foreground",
                      )}
                    >
                      {role.isSystem ? (
                        <AppIcons.lock className="size-3" />
                      ) : (
                        <AppIcons.roles className="size-3" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium">
                        {role.name}
                      </span>
                      <span className="mt-0.5 block text-[11px] tabular-nums text-muted-foreground">
                        {formatNumber(role.permissionCount)} permissions
                        <span className="text-muted-foreground/50"> · </span>
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
