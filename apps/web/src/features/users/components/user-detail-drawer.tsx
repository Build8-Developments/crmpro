"use client";

import Link from "next/link";
import { AppIcons } from "@/components/icons/app-icons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDeactivateUser,
  useReactivateUser,
  useRevokeUserSessions,
} from "@/features/users/mutations";
import { useUser } from "@/features/users/hooks";
import { useUserUiStore } from "@/features/users/stores/user-ui-store";
import { formatRelativeTime, getInitials } from "@/lib/format";
import { useAuthStore } from "@/stores/auth-store";
import { usePermissions } from "@/hooks/use-permissions";

export function UserDetailDrawer() {
  const drawerUserId = useUserUiStore((s) => s.drawerUserId);
  const closeDrawer = useUserUiStore((s) => s.closeDrawer);
  const openEditDialog = useUserUiStore((s) => s.openEditDialog);
  const openChangeRoleDialog = useUserUiStore((s) => s.openChangeRoleDialog);
  const openResetPasswordDialog = useUserUiStore((s) => s.openResetPasswordDialog);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const { can } = usePermissions();

  const { data: user, isLoading, isError } = useUser(drawerUserId ?? undefined);
  const deactivateUser = useDeactivateUser();
  const reactivateUser = useReactivateUser();
  const revokeSessions = useRevokeUserSessions();

  const isSelf = currentUserId === drawerUserId;
  const open = Boolean(drawerUserId);

  const handleClose = () => {
    closeDrawer();
  };

  return (
    <Sheet open={open} onOpenChange={(next) => !next && handleClose()}>
      <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border/60 px-6 py-4">
          <SheetTitle>User profile</SheetTitle>
          <SheetDescription>Team member details and access</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
          ) : null}

          {isError ? (
            <p className="text-sm text-destructive">Failed to load user.</p>
          ) : null}

          {user ? (
            <div className="space-y-6">
              <div className="flex items-start gap-3">
                <Avatar className="size-12">
                  <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
                    {getInitials(user.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-foreground">
                    {user.fullName}
                  </h2>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge variant="outline">{user.role.name}</Badge>
                    <Badge variant={user.isActive ? "secondary" : "outline"}>
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              </div>

              <dl className="grid gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Last login</dt>
                  <dd className="mt-0.5">
                    {user.lastLoginAt
                      ? formatRelativeTime(user.lastLoginAt)
                      : "Never"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Active sessions
                  </dt>
                  <dd className="mt-0.5 tabular-nums">
                    {user.activeSessionCount}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Joined</dt>
                  <dd className="mt-0.5">
                    {formatRelativeTime(user.createdAt)}
                  </dd>
                </div>
              </dl>

              <div>
                <h3 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Permissions
                </h3>
                <div className="flex max-h-40 flex-wrap gap-1 overflow-y-auto">
                  {user.permissions.length > 0 ? (
                    user.permissions.map((permission) => (
                      <Badge
                        key={permission}
                        variant="outline"
                        className="text-[10px] font-normal"
                      >
                        {permission}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">None</span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/leads?assignedUserId=${user.id}`}>
                    View leads
                  </Link>
                </Button>
                {can("user.update") ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditDialog(user.id)}
                  >
                    Edit name
                  </Button>
                ) : null}
                {can("user.update") && !isSelf ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openChangeRoleDialog(user.id)}
                  >
                    Change role
                  </Button>
                ) : null}
                {can("user.manage") ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openResetPasswordDialog(user.id)}
                  >
                    Reset password
                  </Button>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
                {can("user.update") && !isSelf ? (
                  user.isActive ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void deactivateUser.mutateAsync(user.id)}
                    >
                      Deactivate
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void reactivateUser.mutateAsync(user.id)}
                    >
                      Reactivate
                    </Button>
                  )
                ) : null}
                {can("user.manage") && !isSelf ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void revokeSessions.mutateAsync(user.id)}
                  >
                    <AppIcons.logout className="size-3.5" />
                    Revoke sessions
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
