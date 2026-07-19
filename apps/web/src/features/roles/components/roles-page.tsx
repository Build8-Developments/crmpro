"use client";

import { useEffect, useMemo, useState } from "react";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArchiveRoleDialog } from "@/features/roles/components/archive-role-dialog";
import { CreateRoleDialog } from "@/features/roles/components/create-role-dialog";
import { EditRoleDialog } from "@/features/roles/components/edit-role-dialog";
import { RoleDetailPanel } from "@/features/roles/components/role-detail-panel";
import { RolesEmptyState } from "@/features/roles/components/roles-empty-state";
import { RolesHeader } from "@/features/roles/components/roles-header";
import { RolesSidebar } from "@/features/roles/components/roles-sidebar";
import { RolesSkeleton } from "@/features/roles/components/roles-skeleton";
import { useRoles } from "@/features/roles/hooks";
import { useRolesUrlState } from "@/features/roles/hooks/use-roles-url-state";
import { useRoleUiStore } from "@/features/roles/stores/role-ui-store";

export function RolesPage() {
  const [search, setSearch] = useState("");
  const selectedRoleId = useRoleUiStore((s) => s.selectedRoleId);
  const setSelectedRoleId = useRoleUiStore((s) => s.setSelectedRoleId);

  useRolesUrlState({ selectedRoleId, setSelectedRoleId });

  const { data, isLoading, isError, isFetching, refetch } = useRoles();

  const roles = useMemo(() => data ?? [], [data]);
  const selectedRole =
    roles.find((role) => role.id === selectedRoleId) ?? null;

  useEffect(() => {
    if (roles.length === 0) {
      if (selectedRoleId !== null) {
        setSelectedRoleId(null);
      }
      return;
    }

    const stillExists = roles.some((role) => role.id === selectedRoleId);
    if (!selectedRoleId || !stillExists) {
      setSelectedRoleId(roles[0]?.id ?? null);
    }
  }, [roles, selectedRoleId, setSelectedRoleId]);

  if (isLoading && !data) {
    return <RolesSkeleton />;
  }

  if (isError) {
    return (
      <div className="space-y-4 px-6 py-5 md:px-8">
        <RolesHeader />
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AppIcons.alertCircle className="size-5" />
              Failed to load roles
            </CardTitle>
            <CardDescription>
              We couldn&apos;t fetch your roles. Check your connection and try
              again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? "Retrying..." : "Retry"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (roles.length === 0) {
    return (
      <div className="space-y-4 px-6 py-5 md:px-8">
        <RolesHeader />
        <RolesEmptyState />
        <CreateRoleDialog />
      </div>
    );
  }

  return (
    <div className="space-y-4 px-6 py-5 md:px-8">
      <RolesHeader />

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <div className="grid h-[min(42rem,calc(100vh-10.5rem))] lg:grid-cols-[15rem_1fr]">
          <RolesSidebar
            roles={roles}
            search={search}
            onSearchChange={setSearch}
            selectedRoleId={selectedRoleId}
            onSelectRole={setSelectedRoleId}
          />
          <RoleDetailPanel roleSummary={selectedRole} />
        </div>
      </div>

      <CreateRoleDialog />
      <EditRoleDialog />
      <ArchiveRoleDialog />
    </div>
  );
}
