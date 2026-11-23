"use client";

import { DataTable } from "@/components/data-table/data-table";
import { useDataTable } from "@/components/data-table/use-data-table";
import { importColumns } from "@/features/imports/table/columns";
import type { ImportJob } from "@/features/imports/types";

interface ImportsTableProps {
  jobs: ImportJob[];
  onSelectJob: (jobId: string) => void;
}

export function ImportsTable({ jobs, onSelectJob }: ImportsTableProps) {
  const table = useDataTable({ data: jobs, columns: importColumns });

  return (
    <DataTable
      table={table}
      minWidth={820}
      onRowClick={(job) => onSelectJob(job.id)}
      aria-label="Imports"
    />
  );
}
