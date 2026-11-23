"use client";

import { DataTable } from "@/components/data-table/data-table";
import { useDataTable } from "@/components/data-table/use-data-table";
import { auditColumns } from "@/features/audit/table/columns";
import type { AuditLog } from "@/features/audit/types";

interface AuditTableProps {
  logs: AuditLog[];
  onSelectLog: (logId: string) => void;
  selectedLogId?: string | null;
}

export function AuditTable({ logs, onSelectLog, selectedLogId }: AuditTableProps) {
  const table = useDataTable({ data: logs, columns: auditColumns });

  return (
    <DataTable
      table={table}
      minWidth={920}
      highlightedRowId={selectedLogId}
      onRowClick={(log) => onSelectLog(log.id)}
      className="rounded-lg border border-border/70"
      aria-label="Audit log"
    />
  );
}
