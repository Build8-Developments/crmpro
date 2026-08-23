"use client";

import Link from "next/link";
import type { AdminListItem } from "@/features/admins/types";
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
import { useReactivateAdmin } from "@/features/admins/mutations";
import { useAdminUiStore } from "@/features/admins/stores/admin-ui-store";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuthStore } from "@/stores/auth-store";
import { ADMIN_PERMISSIONS } from "@crmpro/shared";

interface AdminRowActionsProps {
  admin: AdminListItem;
}

export function AdminRowActions({ admin }: AdminRowActionsProps) {
  const currentAdminId = useAuthStore((s) => s.user?.id);
  const openEditDialog = useAdminUiStore((s) => s.openEditDialog);
  const openResetPasswordDialog = useAdminUiStore(
    (s) => s.openResetPasswordDialog,
  );
  const openConfirmDialog = useAdminUiStore((s) => s.openConfirmDialog);
  const reactivateAdmin = useReactivateAdmin();
  const { can } = usePermissions();

  const isSelf = currentAdminId === admin.id;
  const canManage = can(ADMIN_PERMISSIONS.ADMIN_MANAGE);

  if (!canManage) {
    return (
      <Button type="button" variant="ghost" size="icon-sm" className="size-8" asChild>
        <Link href={`/admins/${admin.id}`} aria-label={`View ${admin.fullName}`}>
          <AppIcons.chevronRight className="size-4" />
        </Link>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-8"
          aria-label={`Actions for ${admin.fullName}`}
        >
          <AppIcons.moreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link href={`/admins/${admin.id}`}>View profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => openEditDialog(admin.id)}>
          Edit admin
        </DropdownMenuItem>
        {!isSelf ? (
          admin.isActive ? (
            <DropdownMenuItem
              onClick={() => openConfirmDialog("deactivate", admin.id)}
            >
              Deactivate
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => void reactivateAdmin.mutateAsync(admin.id)}
            >
              Reactivate
            </DropdownMenuItem>
          )
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => openResetPasswordDialog(admin.id)}>
          Reset password
        </DropdownMenuItem>
        {!isSelf ? (
          <DropdownMenuItem
            onClick={() => openConfirmDialog("revoke-sessions", admin.id)}
          >
            Revoke sessions
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AdminRowContextMenu({ admin }: AdminRowActionsProps) {
  const currentAdminId = useAuthStore((s) => s.user?.id);
  const openEditDialog = useAdminUiStore((s) => s.openEditDialog);
  const openResetPasswordDialog = useAdminUiStore(
    (s) => s.openResetPasswordDialog,
  );
  const openConfirmDialog = useAdminUiStore((s) => s.openConfirmDialog);
  const reactivateAdmin = useReactivateAdmin();
  const { can } = usePermissions();

  const isSelf = currentAdminId === admin.id;
  const canManage = can(ADMIN_PERMISSIONS.ADMIN_MANAGE);

  if (!canManage) {
    return (
      <ContextMenuContent className="w-48">
        <ContextMenuItem asChild>
          <Link href={`/admins/${admin.id}`}>View profile</Link>
        </ContextMenuItem>
      </ContextMenuContent>
    );
  }

  return (
    <ContextMenuContent className="w-48">
      <ContextMenuItem asChild>
        <Link href={`/admins/${admin.id}`}>View profile</Link>
      </ContextMenuItem>
      <ContextMenuItem onClick={() => openEditDialog(admin.id)}>
        Edit admin
      </ContextMenuItem>
      {!isSelf ? (
        admin.isActive ? (
          <ContextMenuItem
            onClick={() => openConfirmDialog("deactivate", admin.id)}
          >
            Deactivate
          </ContextMenuItem>
        ) : (
          <ContextMenuItem
            onClick={() => void reactivateAdmin.mutateAsync(admin.id)}
          >
            Reactivate
          </ContextMenuItem>
        )
      ) : null}
      <ContextMenuSeparator />
      <ContextMenuItem onClick={() => openResetPasswordDialog(admin.id)}>
        Reset password
      </ContextMenuItem>
      {!isSelf ? (
        <ContextMenuItem
          onClick={() => openConfirmDialog("revoke-sessions", admin.id)}
        >
          Revoke sessions
        </ContextMenuItem>
      ) : null}
    </ContextMenuContent>
  );
}

