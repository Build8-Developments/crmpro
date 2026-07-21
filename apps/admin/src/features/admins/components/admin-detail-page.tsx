"use client";

import Link from "next/link";
import { AppIcons } from "@/components/icons/app-icons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminActions } from "@/features/admins/components/admin-actions";
import { AdminConfirmDialogs } from "@/features/admins/components/admin-confirm-dialogs";
import { AdminNotesSection } from "@/features/admins/components/admin-notes-section";
import { EditAdminDialog } from "@/features/admins/components/edit-admin-dialog";
import { ResetAdminPasswordDialog } from "@/features/admins/components/reset-admin-password-dialog";
import { useAdmin } from "@/features/admins/hooks";
import { usePermissions } from "@/hooks/use-permissions";
import { formatRelativeTime, getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ADMIN_PERMISSIONS } from "@crmpro/shared";

interface AdminDetailPageProps {
  adminId: string;
}

export function AdminDetailPage({ adminId }: AdminDetailPageProps) {
  const { canAny } = usePermissions();
  const canAccess = canAny([
    ADMIN_PERMISSIONS.ADMIN_MANAGE,
    ADMIN_PERMISSIONS.AUDIT_READ,
  ]);
  const { data: admin, isLoading, isError, isFetching, refetch } =
    useAdmin(canAccess ? adminId : undefined);

  if (!canAccess) {
    return (
      <div className="space-y-4 px-6 py-5 md:px-8">
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-destructive">Access denied</CardTitle>
            <CardDescription>
              You need admin.manage or audit.read to view this admin.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading && !admin) {
    return (
      <div className="space-y-4 px-6 py-5 md:px-8">
        <Skeleton className="h-4 w-24" />
        <div className="flex items-center gap-3">
          <Skeleton className="size-12 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-56" />
          </div>
        </div>
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (isError || !admin) {
    return (
      <div className="space-y-4 px-6 py-5 md:px-8">
        <Link
          href="/admins"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <AppIcons.arrowLeft className="size-3.5" />
          Back to admins
        </Link>
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AppIcons.alertCircle className="size-5" />
              Failed to load admin
            </CardTitle>
            <CardDescription>
              We couldn&apos;t fetch this staff account. Check your connection
              and try again.
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

  return (
    <div className="space-y-6 px-6 py-5 md:px-8">
      <Link
        href="/admins"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <AppIcons.arrowLeft className="size-3.5" />
        Back to admins
      </Link>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Avatar className="size-12">
            <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
              {getInitials(admin.fullName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {admin.fullName}
              </h1>
              <Badge
                variant="outline"
                className={cn(
                  "h-5 px-1.5 text-[10px] font-medium",
                  admin.isActive
                    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border-border bg-muted/50 text-muted-foreground",
                )}
              >
                {admin.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">{admin.email}</p>
          </div>
        </div>
        <AdminActions admin={admin} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <InfoCard label="Role" value={admin.role.name} />
        <InfoCard
          label="Active sessions"
          value={String(admin.activeSessionsCount)}
        />
        <InfoCard
          label="Last login"
          value={
            admin.lastLoginAt
              ? formatRelativeTime(admin.lastLoginAt)
              : "Never"
          }
        />
        <InfoCard
          label="Joined"
          value={formatRelativeTime(admin.createdAt)}
        />
      </div>

      <AdminNotesSection adminId={admin.id} />

      <EditAdminDialog />
      <ResetAdminPasswordDialog />
      <AdminConfirmDialogs />
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-card px-4 py-3 shadow-sm">
      <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
