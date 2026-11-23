"use client";

import Link from "next/link";
import type { UserListItem } from "@/features/users/types";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { useReactivateUser, useResendInvite } from "@/features/users/mutations";
import { useUserUiStore } from "@/features/users/stores/user-ui-store";
import { useAuthStore } from "@/stores/auth-store";
import { usePermissions } from "@/hooks/use-permissions";

interface UserRowActionsProps {
  user: UserListItem;
}

export function UserRowActions({ user }: UserRowActionsProps) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const openDrawer = useUserUiStore((s) => s.openDrawer);
  const openEditDialog = useUserUiStore((s) => s.openEditDialog);
  const openChangeRoleDialog = useUserUiStore((s) => s.openChangeRoleDialog);
  const openResetPasswordDialog = useUserUiStore((s) => s.openResetPasswordDialog);
  const openConfirmAction = useUserUiStore((s) => s.openConfirmAction);
  const reactivateUser = useReactivateUser();
  const resendInvite = useResendInvite();
  const { can } = usePermissions();

  const isSelf = currentUserId === user.id;
  const canUpdate = can("user.update");
  const canManage = can("user.manage");

  if (!canUpdate && !canManage) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-8"
          aria-label={`Actions for ${user.fullName}`}
        >
          <AppIcons.moreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => openDrawer(user.id)}>
          View profile
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/leads?assignedUserId=${user.id}`}>View leads</Link>
        </DropdownMenuItem>
        {can("user.create") && user.invitationPending && user.isActive ? (
          <DropdownMenuItem onClick={() => resendInvite.mutate(user.id)}>
            Resend invitation
          </DropdownMenuItem>
        ) : null}
        {canUpdate ? (
          <DropdownMenuItem onClick={() => openEditDialog(user.id)}>
            Edit name
          </DropdownMenuItem>
        ) : null}
        {canUpdate && !isSelf ? (
          <DropdownMenuItem onClick={() => openChangeRoleDialog(user.id)}>
            Change role
          </DropdownMenuItem>
        ) : null}
        {canUpdate && !isSelf ? (
          user.isActive ? (
            <DropdownMenuItem
              onClick={() =>
                openConfirmAction({
                  kind: "deactivate",
                  userId: user.id,
                  userName: user.fullName,
                })
              }
            >
              Deactivate
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => void reactivateUser.mutateAsync(user.id)}
            >
              Reactivate
            </DropdownMenuItem>
          )
        ) : null}
        {canManage ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => openResetPasswordDialog(user.id)}>
              Reset password
            </DropdownMenuItem>
            {!isSelf ? (
              <DropdownMenuItem
                onClick={() =>
                  openConfirmAction({
                    kind: "revoke-sessions",
                    userId: user.id,
                    userName: user.fullName,
                  })
                }
              >
                Revoke sessions
              </DropdownMenuItem>
            ) : null}
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function UserRowContextMenu({ user }: UserRowActionsProps) {
  const currentUserId = useAuthStore((s) => s.user?.id);
  const openDrawer = useUserUiStore((s) => s.openDrawer);
  const openEditDialog = useUserUiStore((s) => s.openEditDialog);
  const openChangeRoleDialog = useUserUiStore((s) => s.openChangeRoleDialog);
  const openResetPasswordDialog = useUserUiStore((s) => s.openResetPasswordDialog);
  const openConfirmAction = useUserUiStore((s) => s.openConfirmAction);
  const reactivateUser = useReactivateUser();
  const resendInvite = useResendInvite();
  const { can } = usePermissions();

  const isSelf = currentUserId === user.id;
  const canUpdate = can("user.update");
  const canManage = can("user.manage");

  if (!canUpdate && !canManage) return <ContextMenuContent className="w-48" />;

  return (
    <ContextMenuContent className="w-48">
      <ContextMenuItem onClick={() => openDrawer(user.id)}>
        View profile
      </ContextMenuItem>
      <ContextMenuItem asChild>
        <Link href={`/leads?assignedUserId=${user.id}`}>View leads</Link>
      </ContextMenuItem>
      {can("user.create") && user.invitationPending && user.isActive ? (
        <ContextMenuItem onClick={() => resendInvite.mutate(user.id)}>
          Resend invitation
        </ContextMenuItem>
      ) : null}
      {canUpdate ? (
        <ContextMenuItem onClick={() => openEditDialog(user.id)}>
          Edit name
        </ContextMenuItem>
      ) : null}
      {canUpdate && !isSelf ? (
        <ContextMenuItem onClick={() => openChangeRoleDialog(user.id)}>
          Change role
        </ContextMenuItem>
      ) : null}
      {canUpdate && !isSelf ? (
        user.isActive ? (
          <ContextMenuItem
            onClick={() =>
                openConfirmAction({
                  kind: "deactivate",
                  userId: user.id,
                  userName: user.fullName,
                })
              }
          >
            Deactivate
          </ContextMenuItem>
        ) : (
          <ContextMenuItem
            onClick={() => void reactivateUser.mutateAsync(user.id)}
          >
            Reactivate
          </ContextMenuItem>
        )
      ) : null}
      {canManage ? (
        <>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => openResetPasswordDialog(user.id)}>
            Reset password
          </ContextMenuItem>
          {!isSelf ? (
            <ContextMenuItem
              onClick={() =>
                  openConfirmAction({
                    kind: "revoke-sessions",
                    userId: user.id,
                    userName: user.fullName,
                  })
                }
            >
              Revoke sessions
            </ContextMenuItem>
          ) : null}
        </>
      ) : null}
    </ContextMenuContent>
  );
}

