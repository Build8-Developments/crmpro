"use client";

import {
  getCoreRowModel,
  useReactTable,
  type TableOptions,
} from "@tanstack/react-table";

type DataTableOptions<TData> = Omit<TableOptions<TData>, "getCoreRowModel"> &
  Partial<Pick<TableOptions<TData>, "getCoreRowModel">>;

/**
 * `useReactTable` with the defaults every CRM list shares: rows keyed by
 * their `id`, and sorting/paging done by the API (we render one page).
 */
export function useDataTable<TData extends { id: string }>(options: DataTableOptions<TData>) {
  return useReactTable<TData>({
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    manualSorting: true,
    manualPagination: true,
    ...options,
  });
}
