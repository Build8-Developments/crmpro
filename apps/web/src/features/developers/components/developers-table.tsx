"use client";

import { DataTable } from "@/components/data-table/data-table";
import { useDataTable } from "@/components/data-table/use-data-table";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import { DeveloperRowContextMenu } from "@/features/developers/components/developer-row-actions";
import { developerColumns } from "@/features/developers/table/columns";
import type { Developer, DevelopersSortField } from "@/features/developers/types";

interface DevelopersTableProps {
  developers: Developer[];
  sortBy: DevelopersSortField;
  sortOrder: "asc" | "desc";
  onSortChange: (sortBy: DevelopersSortField, sortOrder: "asc" | "desc") => void;
  highlightedDeveloperId?: string | null;
  onHighlightDeveloper?: (developerId: string) => void;
}

export function DevelopersTable({
  developers,
  sortBy,
  sortOrder,
  onSortChange,
  highlightedDeveloperId,
  onHighlightDeveloper,
}: DevelopersTableProps) {
  const table = useDataTable({ data: developers, columns: developerColumns });

  return (
    <DataTable
      table={table}
      minWidth={640}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSortChange={onSortChange}
      highlightedRowId={highlightedDeveloperId}
      onRowClick={
        onHighlightDeveloper ? (developer) => onHighlightDeveloper(developer.id) : undefined
      }
      aria-label="Developers"
      renderRow={(row, tr) => (
        <ContextMenu>
          <ContextMenuTrigger asChild>{tr}</ContextMenuTrigger>
          <DeveloperRowContextMenu developer={row.original} />
        </ContextMenu>
      )}
    />
  );
}
