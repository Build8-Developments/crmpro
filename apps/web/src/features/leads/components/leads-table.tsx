"use client";

import type { Table as TanstackTable } from "@tanstack/react-table";
import { AppIcons } from "@/components/icons/app-icons";
import type { Lead } from "@/features/leads/types";
import type { LeadsSortField } from "@/features/leads/stores/leads-table-store";
import { LEADS_SORTABLE_COLUMNS } from "@/features/leads/table/columns";
import { flexRender } from "@/features/leads/table/use-leads-table";
import { cn } from "@/lib/utils";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import { LeadRowContextMenu } from "@/features/leads/components/lead-row-actions";

interface LeadsTableProps {
  table: TanstackTable<Lead>;
  onSortChange: (sortBy: LeadsSortField, sortOrder: "asc" | "desc") => void;
  sortBy: LeadsSortField;
  sortOrder: "asc" | "desc";
}

export function LeadsTable({
  table,
  onSortChange,
  sortBy,
  sortOrder,
}: LeadsTableProps) {
  return (
    <div className="min-h-0 flex-1 overflow-hidden bg-background">
      <div className="max-h-[calc(100vh-16rem)] overflow-auto">
        <table className="w-full min-w-[960px] border-collapse text-xs">
          <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="border-b border-border/70 text-left"
              >
                {headerGroup.headers.map((header) => {
                  const columnId = header.column.id;
                  const sortable = LEADS_SORTABLE_COLUMNS.has(columnId);
                  const isSorted = sortBy === columnId;

                  return (
                    <th
                      key={header.id}
                      className={cn(
                        "h-8 px-2 font-medium text-[11px] tracking-wide text-muted-foreground uppercase",
                        columnId === "select" && "w-8 px-1",
                        columnId === "actions" && "w-10 px-1",
                      )}
                    >
                      {header.isPlaceholder ? null : sortable ? (
                        <button
                          type="button"
                          className={cn(
                            "inline-flex items-center gap-0.5 transition-colors hover:text-foreground",
                            isSorted && "text-foreground",
                          )}
                          onClick={() =>
                            onSortChange(
                              columnId as LeadsSortField,
                              isSorted && sortOrder === "desc" ? "asc" : "desc",
                            )
                          }
                        >
                          {flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                          {isSorted ? (
                            <AppIcons.chevronDown
                              className={cn(
                                "size-3",
                                sortOrder === "asc" && "rotate-180",
                              )}
                            />
                          ) : null}
                        </button>
                      ) : (
                        flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row, index) => (
              <ContextMenu key={row.id}>
                <ContextMenuTrigger asChild>
                  <tr
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    className={cn(
                      "border-b border-border/40 transition-colors duration-100",
                      "hover:bg-accent/50",
                      row.getIsSelected() && "bg-primary/5",
                      index % 2 === 1 && "bg-muted/15",
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={cn(
                          "px-2 py-1.5 align-middle",
                          cell.column.id === "select" && "w-8 px-1",
                          cell.column.id === "actions" && "w-10 px-1",
                          cell.column.id === "fullName" && "max-w-[14rem]",
                          cell.column.id === "contact" && "max-w-[11rem]",
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                </ContextMenuTrigger>
                <LeadRowContextMenu lead={row.original} />
              </ContextMenu>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
