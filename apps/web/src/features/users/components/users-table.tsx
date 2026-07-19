"use client";

import { useEffect, useRef } from "react";
import { AppIcons } from "@/components/icons/app-icons";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { UserRowActions } from "@/features/users/components/user-row-actions";
import type { UserListItem, UsersSortField } from "@/features/users/types";
import { formatRelativeTime, getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";

interface UsersTableProps {
  users: UserListItem[];
  sortBy: UsersSortField;
  sortOrder: "asc" | "desc";
  onSortChange: (sortBy: UsersSortField, sortOrder: "asc" | "desc") => void;
  highlightedUserId?: string | null;
  onOpenUser: (userId: string) => void;
}

function SortableHeader({
  label,
  column,
  sortBy,
  sortOrder,
  onSortChange,
  className,
}: {
  label: string;
  column: UsersSortField;
  sortBy: UsersSortField;
  sortOrder: "asc" | "desc";
  onSortChange: (sortBy: UsersSortField, sortOrder: "asc" | "desc") => void;
  className?: string;
}) {
  const isSorted = sortBy === column;

  return (
    <th
      className={cn(
        "h-8 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase",
        className,
      )}
    >
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-0.5 transition-colors hover:text-foreground",
          isSorted && "text-foreground",
        )}
        onClick={() =>
          onSortChange(
            column,
            isSorted && sortOrder === "desc" ? "asc" : "desc",
          )
        }
      >
        {label}
        {isSorted ? (
          <AppIcons.chevronDown
            className={cn("size-3", sortOrder === "asc" && "rotate-180")}
          />
        ) : null}
      </button>
    </th>
  );
}

export function UsersTable({
  users,
  sortBy,
  sortOrder,
  onSortChange,
  highlightedUserId,
  onOpenUser,
}: UsersTableProps) {
  return (
    <div className="overflow-x-auto bg-background">
        <table className="w-full min-w-[880px] border-collapse text-sm">
          <thead className="border-b border-border/50 bg-muted/25">
            <tr className="text-left">
              <SortableHeader
                label="User"
                column="name"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={onSortChange}
              />
              <SortableHeader
                label="Email"
                column="email"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={onSortChange}
                className="hidden md:table-cell"
              />
              <th className="h-8 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
                Role
              </th>
              <th className="h-8 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
                Status
              </th>
              <th className="hidden h-8 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase lg:table-cell">
                Last login
              </th>
              <SortableHeader
                label="Joined"
                column="createdAt"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={onSortChange}
                className="hidden xl:table-cell"
              />
              <th className="h-8 w-10 px-2" aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <UserTableRow
                key={user.id}
                user={user}
                highlightedUserId={highlightedUserId}
                onOpenUser={onOpenUser}
              />
            ))}
          </tbody>
        </table>
    </div>
  );
}

function UserTableRow({
  user,
  highlightedUserId,
  onOpenUser,
}: {
  user: UserListItem;
  highlightedUserId?: string | null;
  onOpenUser: (userId: string) => void;
}) {
  const rowRef = useRef<HTMLTableRowElement>(null);
  const isHighlighted = highlightedUserId === user.id;

  useEffect(() => {
    if (isHighlighted) {
      rowRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [isHighlighted]);

  return (
    <tr
      ref={rowRef}
      className={cn(
        "border-b border-border/40 transition-colors last:border-0 hover:bg-muted/20",
        isHighlighted && "bg-primary/5",
        !user.isActive && "opacity-70",
      )}
    >
      <td className="px-3 py-2">
        <button
          type="button"
          className="flex w-full min-w-0 items-center gap-2.5 text-left"
          onClick={() => onOpenUser(user.id)}
        >
          <Avatar size="sm" className="size-7">
            <AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">
              {getInitials(user.fullName)}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-sm font-medium text-foreground">
            {user.fullName}
          </span>
        </button>
      </td>
      <td className="hidden px-3 py-2 text-xs text-muted-foreground md:table-cell">
        {user.email}
      </td>
      <td className="px-3 py-2">
        <Badge
          variant="outline"
          className="h-5 px-1.5 text-[10px] font-medium"
        >
          {user.role.name}
        </Badge>
      </td>
      <td className="px-3 py-2">
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
      </td>
      <td className="hidden px-3 py-2 text-xs text-muted-foreground lg:table-cell">
        {user.lastLoginAt
          ? formatRelativeTime(user.lastLoginAt)
          : "Never"}
      </td>
      <td className="hidden px-3 py-2 text-xs text-muted-foreground xl:table-cell">
        {formatRelativeTime(user.createdAt)}
      </td>
      <td className="px-2 py-2 text-right">
        <UserRowActions user={user} />
      </td>
    </tr>
  );
}
