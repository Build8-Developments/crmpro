"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserRowActions } from "@/features/users/components/user-row-actions";
import { useUserUiStore } from "@/features/users/stores/user-ui-store";
import type { UserListItem } from "@/features/users/types";
import { formatRelativeTime, getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Column ids double as the API sort field where `meta.sortable` is set. */
export const userColumns: ColumnDef<UserListItem>[] = [
  {
    id: "name",
    header: "User",
    cell: ({ row }) => <UserNameCell user={row.original} />,
    meta: { sortable: true },
  },
  {
    id: "email",
    header: "Email",
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.email}</span>,
    meta: { sortable: true, hideBelow: "md" },
  },
  {
    id: "role",
    header: "Role",
    cell: ({ row }) => (
      <>
        <Badge variant="outline" className="h-5 px-1.5 text-[10px] font-medium">
          {row.original.role.name}
        </Badge>
        {row.original.team ? (
          <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
            {row.original.team.name}
          </span>
        ) : null}
      </>
    ),
  },
  {
    id: "status",
    header: "Status",
    cell: ({ row }) => <UserStatusCell user={row.original} />,
  },
  {
    id: "lastLoginAt",
    header: "Last login",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.lastLoginAt ? formatRelativeTime(row.original.lastLoginAt) : "Never"}
      </span>
    ),
    meta: { hideBelow: "lg" },
  },
  {
    id: "createdAt",
    header: "Joined",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{formatRelativeTime(row.original.createdAt)}</span>
    ),
    meta: { sortable: true, hideBelow: "xl" },
  },
  {
    id: "actions",
    header: () => <span className="sr-only">Actions</span>,
    cell: ({ row }) => <UserRowActions user={row.original} />,
    meta: { align: "right", headerClassName: "w-10 px-2", cellClassName: "px-2" },
  },
];

function UserNameCell({ user }: { user: UserListItem }) {
  const openDrawer = useUserUiStore((s) => s.openDrawer);
  return (
    <button
      type="button"
      className="flex w-full min-w-0 items-center gap-2.5 text-left"
      onClick={() => openDrawer(user.id)}
    >
      <Avatar size="sm" className="size-7">
        <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
          {getInitials(user.fullName)}
        </AvatarFallback>
      </Avatar>
      <span className="truncate text-sm font-medium text-foreground">{user.fullName}</span>
    </button>
  );
}

function UserStatusCell({ user }: { user: UserListItem }) {
  return (
    <>
      <Badge
        variant="outline"
        className={cn(
          "h-5 px-1.5 text-[10px] font-medium",
          user.isActive
            ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
            : "border-border bg-muted/50 text-muted-foreground",
        )}
      >
        {user.isActive ? "Active" : "Inactive"}
      </Badge>
      {user.invitationPending && user.isActive ? (
        <Badge
          variant="outline"
          className="ml-1 h-5 border-amber-500/30 bg-amber-500/10 px-1.5 text-[10px] font-medium text-amber-800 dark:text-amber-300"
          title="Invited by email; hasn't chosen a password yet"
        >
          Invite pending
        </Badge>
      ) : null}
    </>
  );
}
