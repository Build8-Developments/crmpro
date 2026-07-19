"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppIcons } from "@/components/icons/app-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
        <AppIcons.roles className="size-6 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          Select a role to inspect permissions
        </p>
      </div>
    );
  }

  if (isLoading && !roleDetail) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
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
  const [showGrantedOnly, setShowGrantedOnly] = useState(false);

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

  const totalGrantable = useMemo(
    () =>
      PERMISSION_GROUP_ORDER.reduce(
        (count, groupKey) =>
          count + [...PERMISSION_GROUPS[groupKey]].filter(canGrant).length,
        0,
      ),
    [canGrant],
  );

  const grantableGroups = useMemo(() => {
    const normalizedSearch = permissionSearch.trim().toLowerCase();

    return PERMISSION_GROUP_ORDER.map((groupKey) => {
      let grantable = [...PERMISSION_GROUPS[groupKey]].filter(canGrant);
      if (grantable.length === 0) return null;

      if (showGrantedOnly) {
        grantable = grantable.filter((key) => selectedKeys.includes(key));
        if (grantable.length === 0) return null;
      }

      if (normalizedSearch) {
        const groupLabel = PERMISSION_GROUP_LABELS[groupKey].toLowerCase();
        const matchesGroup = groupLabel.includes(normalizedSearch);
        grantable = grantable.filter((key) => {
          if (matchesGroup) return true;
          return (
            formatPermissionActionLabel(key)
              .toLowerCase()
              .includes(normalizedSearch) ||
            key.toLowerCase().includes(normalizedSearch)
          );
        });
        if (grantable.length === 0) return null;
      }

      return { groupKey, grantable };
    }).filter(
      (group): group is { groupKey: PermissionGroupKey; grantable: string[] } =>
        group !== null,
    );
  }, [canGrant, permissionSearch, selectedKeys, showGrantedOnly]);

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

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-background">
      <div className="space-y-2.5 border-b border-border/50 px-4 py-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <h2 className="truncate text-base font-semibold tracking-tight">
                {role.name}
              </h2>
              <Badge
                variant={role.isSystem ? "secondary" : "outline"}
                className="h-5 px-1.5 text-[10px] font-normal"
              >
                {role.isSystem ? "System" : "Custom"}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {summary.description ? `${summary.description} · ` : null}
              <span className="tabular-nums">
                <span className="font-medium text-foreground">
                  {formatNumber(selectedKeys.length)}
                </span>
                /{formatNumber(totalGrantable)} permissions
              </span>
              {" · "}
              <Link
                href={`/users?roleId=${role.id}`}
                className="text-primary hover:underline"
              >
                {formatNumber(role.userCount)} users
              </Link>
              {role.isSystem ? " · read-only" : null}
            </p>
          </div>

          {canManage && !role.isSystem ? (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => openEditDialog(role.id)}
              >
                Rename
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                disabled={role.userCount > 0}
                onClick={() => openArchiveDialog(role.id)}
              >
                Archive
              </Button>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[10rem] flex-1 sm:max-w-xs">
            <AppIcons.search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={permissionSearch}
              onChange={(event) => setPermissionSearch(event.target.value)}
              placeholder="Filter permissions..."
              className="h-8 border-transparent bg-muted/40 pl-8 text-xs shadow-none"
              aria-label="Filter permissions"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowGrantedOnly((current) => !current)}
            className={cn(
              "h-7 rounded-md px-2.5 text-[11px] font-medium transition-colors",
              showGrantedOnly
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            Granted only
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {grantableGroups.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            No permissions match your filters
          </p>
        ) : (
          <div className="space-y-2.5">
            {grantableGroups.map(({ groupKey, grantable }) => (
              <PermissionGroupSection
                key={groupKey}
                groupKey={groupKey}
                grantable={grantable}
                selectedKeys={selectedKeys}
                allGroupKeys={[...PERMISSION_GROUPS[groupKey]].filter(canGrant)}
                isReadOnly={isReadOnly}
                onToggleGroup={() => toggleGroup(groupKey)}
                onTogglePermission={togglePermission}
              />
            ))}
          </div>
        )}
      </div>

      {canManage && !role.isSystem ? (
        <div className="flex items-center justify-between gap-3 border-t border-border/50 bg-muted/20 px-4 py-2">
          <p className="text-xs text-muted-foreground">
            {selectedKeys.length === 0
              ? "Select at least one permission"
              : isDirty
                ? "Unsaved changes"
                : "All changes saved"}
          </p>
          <Button
            size="sm"
            className="h-7"
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
  allGroupKeys,
  isReadOnly,
  onToggleGroup,
  onTogglePermission,
}: {
  groupKey: PermissionGroupKey;
  grantable: string[];
  selectedKeys: string[];
  allGroupKeys: string[];
  isReadOnly: boolean;
  onToggleGroup: () => void;
  onTogglePermission: (key: string) => void;
}) {
  const selectedCount = allGroupKeys.filter((key) =>
    selectedKeys.includes(key),
  ).length;
  const allSelected =
    allGroupKeys.length > 0 &&
    allGroupKeys.every((key) => selectedKeys.includes(key));

  return (
    <section className="rounded-lg border border-border/50 bg-card px-3 py-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="text-xs font-semibold text-foreground">
            {PERMISSION_GROUP_LABELS[groupKey]}
          </h3>
          <span className="text-[11px] tabular-nums text-muted-foreground">
            {selectedCount}/{allGroupKeys.length}
          </span>
        </div>
        {!isReadOnly ? (
          <button
            type="button"
            className="shrink-0 text-[11px] font-medium text-primary hover:underline"
            onClick={onToggleGroup}
          >
            {allSelected ? "Clear" : "Select all"}
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-1.5">
        {grantable.map((permissionKey) => {
          const active = selectedKeys.includes(permissionKey);
          return (
            <button
              key={permissionKey}
              type="button"
              disabled={isReadOnly}
              title={permissionKey}
              aria-pressed={active}
              onClick={() => onTogglePermission(permissionKey)}
              className={cn(
                "inline-flex h-7 items-center rounded-md border px-2.5 text-[11px] font-medium transition-colors",
                active
                  ? "border-primary/35 bg-primary/10 text-foreground"
                  : "border-border/70 bg-muted/30 text-muted-foreground",
                !isReadOnly &&
                  !active &&
                  "hover:border-border hover:bg-muted/50 hover:text-foreground",
                !isReadOnly &&
                  active &&
                  "hover:border-primary/50 hover:bg-primary/15",
                isReadOnly && "cursor-default",
              )}
            >
              {active ? (
                <AppIcons.check className="mr-1 size-3 text-primary" />
              ) : null}
              {formatPermissionActionLabel(permissionKey)}
            </button>
          );
        })}
      </div>
    </section>
  );
}
