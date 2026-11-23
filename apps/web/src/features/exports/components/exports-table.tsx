"use client";

import { DataTable } from "@/components/data-table/data-table";
import { useDataTable } from "@/components/data-table/use-data-table";
import { exportColumns } from "@/features/exports/table/columns";
import type { ExportJob } from "@/features/exports/types";

interface ExportsTableProps {
  jobs: ExportJob[];
  onSelectJob: (jobId: string) => void;
}

export function ExportsTable({ jobs, onSelectJob }: ExportsTableProps) {
  const table = useDataTable({ data: jobs, columns: exportColumns });

  return (
    <DataTable
      table={table}
      minWidth={820}
      onRowClick={(job) => onSelectJob(job.id)}
      aria-label="Exports"
    />
  );
}
