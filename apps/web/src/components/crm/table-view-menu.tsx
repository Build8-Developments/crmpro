"use client";

import type { Table } from "@tanstack/react-table";
import { IconAdjustmentsHorizontal } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TableDensity } from "@/hooks/use-table-preferences";

/** "View" menu for any TanStack table: column toggles + row density. */
export function TableViewMenu<TData>({
  table,
  density,
  onDensityChange,
  onReset,
}: {
  table: Table<TData>;
  density: TableDensity;
  onDensityChange: (density: TableDensity) => void;
  onReset: () => void;
}) {
  const columns = table
    .getAllLeafColumns()
    .filter((column) => column.getCanHide() && column.columnDef.meta?.label);
  const hiddenCount = columns.filter((column) => !column.getIsVisible()).length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5">
          <IconAdjustmentsHorizontal className="size-3.5" />
          View
          {hiddenCount > 0 ? (
            <span className="text-[10px] text-muted-foreground tabular-nums">−{hiddenCount}</span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Columns</DropdownMenuLabel>
        {columns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            checked={column.getIsVisible()}
            disabled={column.columnDef.meta?.required}
            onCheckedChange={(checked) => column.toggleVisibility(Boolean(checked))}
            closeOnClick={false}
          >
            {column.columnDef.meta?.label}
          </DropdownMenuCheckboxItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">Rows</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={density} onValueChange={(value) => onDensityChange(value as TableDensity)}>
          <DropdownMenuRadioItem value="comfortable">Comfortable</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="compact">Compact</DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onReset}>Reset to default</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
