"use client";

import { DataTable } from "@/components/data-table/data-table";
import { useDataTable } from "@/components/data-table/use-data-table";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import { UserRowContextMenu } from "@/features/users/components/user-row-actions";
import { userColumns } from "@/features/users/table/columns";
import type { UserListItem, UsersSortField } from "@/features/users/types";

interface UsersTableProps {
  users: UserListItem[];
  sortBy: UsersSortField;
  sortOrder: "asc" | "desc";
  onSortChange: (sortBy: UsersSortField, sortOrder: "asc" | "desc") => void;
  highlightedUserId?: string | null;
}

export function UsersTable({
  users,
  sortBy,
  sortOrder,
  onSortChange,
  highlightedUserId,
}: UsersTableProps) {
  const table = useDataTable({ data: users, columns: userColumns });

  return (
    <DataTable
      table={table}
      minWidth={880}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSortChange={onSortChange}
      highlightedRowId={highlightedUserId}
      rowClassName={(user) => !user.isActive && "opacity-70"}
      aria-label="Users"
      renderRow={(row, tr) => (
        <ContextMenu>
          <ContextMenuTrigger asChild>{tr}</ContextMenuTrigger>
          <UserRowContextMenu user={row.original} />
        </ContextMenu>
      )}
    />
  );
}
