"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppIcons } from "@/components/icons/app-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useRole } from "@/features/roles/hooks";
import { useUpdateRolePermissions } from "@/features/roles/mutations";
import { useRoleUiStore } from "@/features/roles/stores/role-ui-store";
import type { Role, RoleDetail } from "@/features/roles/types";
import {
  formatPermissionActionLabel,
  PERMISSION_GROUP_LABELS,
  PERMISSION_GROUP_ORDER,
  PERMISSION_GROUPS,
  type PermissionGroupKey,
} from "@/features/roles/utils/permission-catalog";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";
import { usePermissions } from "@/hooks/use-permissions";

interface RoleDetailPanelProps {
  roleSummary: Role | null;
}

export function RoleDetailPanel({ roleSummary }: RoleDetailPanelProps) {
  const { data: roleDetail, isLoading, isError } = useRole(roleSummary?.id);

  if (!roleSummary) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-10 text-center">
        <AppIcons.roles className="size-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          Select a role to inspect permissions
        </p>
      </div>
    );
  }

  if (isLoading && !roleDetail) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  if (isError || !roleDetail) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-destructive">
        Failed to load role details
      </div>
    );
  }

  return (
    <RoleDetailContent
      key={roleDetail.id}
      role={roleDetail}
      summary={roleSummary}
    />
  );
}

function RoleDetailContent({
  role,
  summary,
}: {
  role: RoleDetail;
  summary: Role;
}) {
  const openEditDialog = useRoleUiStore((s) => s.openEditDialog);
  const openArchiveDialog = useRoleUiStore((s) => s.openArchiveDialog);
  const { can } = usePermissions();
  const actorPermissions = useAuthStore((s) => s.permissions);
  const updatePermissions = useUpdateRolePermissions();
  const [selectedKeys, setSelectedKeys] = useState(role.permissionKeys);
  const [permissionSearch, setPermissionSearch] = useState("");

  const canManage = can("role.manage");
  const isReadOnly = !canManage || role.isSystem;

  const sortedSelected = useMemo(
    () => [...selectedKeys].sort(),
    [selectedKeys],
  );
  const sortedOriginal = useMemo(
    () => [...role.permissionKeys].sort(),
    [role.permissionKeys],
  );
  const isDirty =
    sortedSelected.join("|") !== sortedOriginal.join("|") &&
    sortedSelected.length > 0;

  const canGrant = useMemo(
    () => (permissionKey: string) => actorPermissions.has(permissionKey),
    [actorPermissions],
  );

  const grantableGroups = useMemo(() => {
    const normalizedSearch = permissionSearch.trim().toLowerCase();

    return PERMISSION_GROUP_ORDER.map((groupKey) => {
      const grantable = [...PERMISSION_GROUPS[groupKey]].filter(canGrant);
      if (grantable.length === 0) return null;

      if (!normalizedSearch) {
        return { groupKey, grantable };
      }

      const groupLabel = PERMISSION_GROUP_LABELS[groupKey].toLowerCase();
      const matchesGroup = groupLabel.includes(normalizedSearch);

      const filtered = grantable.filter((key) => {
        if (matchesGroup) return true;
        return formatPermissionActionLabel(key)
          .toLowerCase()
          .includes(normalizedSearch);
      });

      if (filtered.length === 0) return null;
      return { groupKey, grantable: filtered };
    }).filter(
      (group): group is { groupKey: PermissionGroupKey; grantable: string[] } =>
        group !== null,
    );
  }, [canGrant, permissionSearch]);

  const totalGrantable = useMemo(
    () =>
      PERMISSION_GROUP_ORDER.reduce(
        (count, groupKey) =>
          count +
          [...PERMISSION_GROUPS[groupKey]].filter(canGrant).length,
        0,
      ),
    [canGrant],
  );

  const togglePermission = (permissionKey: string) => {
    if (isReadOnly) return;
    setSelectedKeys((current) =>
      current.includes(permissionKey)
        ? current.filter((key) => key !== permissionKey)
        : [...current, permissionKey],
    );
  };

  const toggleGroup = (groupKey: PermissionGroupKey) => {
    if (isReadOnly) return;
    const groupKeys = [...PERMISSION_GROUPS[groupKey]].filter(canGrant);
    const allOn = groupKeys.every((key) => selectedKeys.includes(key));
    setSelectedKeys((current) => {
      if (allOn) {
        return current.filter((key) => !groupKeys.includes(key));
      }
      return [...new Set([...current, ...groupKeys])];
    });
  };

  const handleSave = async () => {
    if (selectedKeys.length === 0) return;
    await updatePermissions.mutateAsync({
      roleId: role.id,
      input: { permissionKeys: selectedKeys },
    });
  };

  const enabledPct =
    totalGrantable > 0
      ? Math.round((selectedKeys.length / totalGrantable) * 100)
      : 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/50 px-5 py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold tracking-tight">
              {role.name}
            </h2>
            <Badge
              variant={role.isSystem ? "secondary" : "outline"}
              className="h-5 px-1.5 text-[10px] font-normal"
            >
              {role.isSystem ? "System" : "Custom"}
            </Badge>
          </div>
          {summary.description ? (
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              {summary.description}
            </p>
          ) : null}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {formatNumber(selectedKeys.length)}
              </span>
              {" / "}
              {formatNumber(totalGrantable)} permissions
            </span>
            <span className="text-muted-foreground/40">·</span>
            <Link
              href={`/users?roleId=${role.id}`}
              className="text-xs text-primary hover:underline"
            >
              {formatNumber(role.userCount)} users
            </Link>
          </div>
        </div>

        {canManage && !role.isSystem ? (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => openEditDialog(role.id)}
            >
              Rename
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-destructive hover:text-destructive"
              disabled={role.userCount > 0}
              onClick={() => openArchiveDialog(role.id)}
            >
              Archive
            </Button>
          </div>
        ) : null}
      </div>

      {role.isSystem ? (
        <div className="flex items-center gap-2 border-b border-border/40 bg-muted/30 px-5 py-2.5 text-xs text-muted-foreground">
          <AppIcons.lock className="size-3.5 shrink-0" />
          Built-in role — permissions are fixed by the platform.
        </div>
      ) : null}

      <div className="border-b border-border/40 px-5 py-3">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-muted-foreground">
            Coverage
          </span>
          <span className="text-xs tabular-nums text-muted-foreground">
            {enabledPct}%
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${enabledPct}%` }}
          />
        </div>
      </div>

      <div className="border-b border-border/40 px-5 py-2.5">
        <div className="relative">
          <AppIcons.search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={permissionSearch}
            onChange={(event) => setPermissionSearch(event.target.value)}
            placeholder="Filter permissions..."
            className="h-8 border-transparent bg-muted/40 pl-8 text-xs shadow-none"
            aria-label="Filter permissions"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        {grantableGroups.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No permissions match your search
          </p>
        ) : (
          <div className="mx-auto max-w-2xl space-y-4">
            {grantableGroups.map(({ groupKey, grantable }) => (
              <PermissionGroupSection
                key={groupKey}
                groupKey={groupKey}
                grantable={grantable}
                selectedKeys={selectedKeys}
                isReadOnly={isReadOnly}
                onToggleGroup={() => toggleGroup(groupKey)}
                onTogglePermission={togglePermission}
              />
            ))}
          </div>
        )}
      </div>

      {canManage && !role.isSystem ? (
        <div className="flex items-center justify-between gap-3 border-t border-border/50 bg-muted/20 px-5 py-3">
          <p className="text-xs text-muted-foreground">
            {selectedKeys.length === 0
              ? "Select at least one permission"
              : isDirty
                ? "Unsaved changes"
                : "All changes saved"}
          </p>
          <Button
            size="sm"
            disabled={
              updatePermissions.isPending ||
              !isDirty ||
              selectedKeys.length === 0
            }
            onClick={() => void handleSave()}
          >
            {updatePermissions.isPending ? (
              <>
                <AppIcons.loader className="size-3.5 animate-spin" />
                Saving
              </>
            ) : (
              "Save changes"
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function PermissionGroupSection({
  groupKey,
  grantable,
  selectedKeys,
  isReadOnly,
  onToggleGroup,
  onTogglePermission,
}: {
  groupKey: PermissionGroupKey;
  grantable: string[];
  selectedKeys: string[];
  isReadOnly: boolean;
  onToggleGroup: () => void;
  onTogglePermission: (key: string) => void;
}) {
  const selectedCount = grantable.filter((key) =>
    selectedKeys.includes(key),
  ).length;
  const allSelected = selectedCount === grantable.length;
  const pct =
    grantable.length > 0
      ? Math.round((selectedCount / grantable.length) * 100)
      : 0;

  return (
    <section className="overflow-hidden rounded-lg border border-border/60">
      <div className="flex items-center justify-between gap-3 bg-muted/25 px-3 py-2">
        <h3 className="text-xs font-semibold tracking-wide text-foreground uppercase">
          {PERMISSION_GROUP_LABELS[groupKey]}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {selectedCount}/{grantable.length}
          </span>
          {!isReadOnly ? (
            <button
              type="button"
              className="text-[11px] font-medium text-primary hover:underline"
              onClick={onToggleGroup}
            >
              {allSelected ? "Clear all" : "Select all"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="h-px bg-border/50">
        <div
          className="h-full bg-primary/60 transition-all duration-200"
          style={{ width: `${pct}%` }}
        />
      </div>

      <ul className="divide-y divide-border/40">
        {grantable.map((permissionKey) => {
          const active = selectedKeys.includes(permissionKey);
          return (
            <li key={permissionKey}>
              <label
                className={cn(
                  "flex items-center justify-between gap-3 px-3 py-2.5",
                  !isReadOnly && "cursor-pointer hover:bg-muted/20",
                  isReadOnly && "cursor-default",
                )}
              >
                <span
                  className={cn(
                    "text-sm",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {formatPermissionActionLabel(permissionKey)}
                </span>
                <Checkbox
                  checked={active}
                  disabled={isReadOnly}
                  onCheckedChange={() => onTogglePermission(permissionKey)}
                  aria-label={formatPermissionActionLabel(permissionKey)}
                />
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
