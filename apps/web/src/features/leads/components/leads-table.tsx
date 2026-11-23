"use client";

import type { Table as TanstackTable } from "@tanstack/react-table";
import { DataTable } from "@/components/data-table/data-table";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import type { Lead } from "@/features/leads/types";
import type { LeadsSortField } from "@/features/leads/stores/leads-table-store";
import type { TableDensity } from "@/hooks/use-table-preferences";
import { LeadCard } from "./lead-card";
import { LeadRowContextMenu } from "./lead-row-actions";

interface LeadsTableProps {
  table: TanstackTable<Lead>;
  density: TableDensity;
  onSortChange: (sortBy: LeadsSortField, sortOrder: "asc" | "desc") => void;
  sortBy: LeadsSortField;
  sortOrder: "asc" | "desc";
}

/** Leads list: the table on desktop (right-click for actions), cards on phones. */
export function LeadsTable({ table, density, onSortChange, sortBy, sortOrder }: LeadsTableProps) {
  return (
    <DataTable
      table={table}
      layout="fixed"
      density={density}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSortChange={onSortChange}
      aria-label="Leads"
      emptyState={
        <div className="px-6 py-12 text-center text-sm text-muted-foreground">
          No leads match your search or filters.
        </div>
      }
      renderRow={(row, tr) => (
        <ContextMenu>
          <ContextMenuTrigger asChild>{tr}</ContextMenuTrigger>
          <LeadRowContextMenu lead={row.original} />
        </ContextMenu>
      )}
      renderCard={(row) => <LeadCard lead={row.original} />}
    />
  );
}
