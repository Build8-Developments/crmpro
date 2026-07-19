"use client";

import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useExportUiStore } from "@/features/exports/stores/export-ui-store";
import type { ExportJobStatus } from "@/features/exports/types";
import { usePermissions } from "@/hooks/use-permissions";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ExportsToolbarProps {
  totalItems: number;
  statusFilter: ExportJobStatus | "all";
  onStatusFilterChange: (status: ExportJobStatus | "all") => void;
  isFetching?: boolean;
}

export function ExportsToolbar({
  totalItems,
  statusFilter,
  onStatusFilterChange,
  isFetching,
}: ExportsToolbarProps) {
  const openCreateDialog = useExportUiStore((s) => s.openCreateDialog);
  const { can } = usePermissions();

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border/50 px-4 py-3">
      <Select
        value={statusFilter}
        onValueChange={(value) =>
          onStatusFilterChange(value as ExportJobStatus | "all")
        }
      >
        <SelectTrigger className="h-8 w-[9.5rem] text-xs">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="PENDING">Queued</SelectItem>
          <SelectItem value="PROCESSING">Processing</SelectItem>
          <SelectItem value="COMPLETED">Completed</SelectItem>
          <SelectItem value="FAILED">Failed</SelectItem>
        </SelectContent>
      </Select>

      <span
        className={cn(
          "text-xs tabular-nums text-muted-foreground",
          isFetching && "opacity-70",
        )}
      >
        {formatNumber(totalItems)} export{totalItems === 1 ? "" : "s"}
      </span>

      {can("export-job.create") ? (
        <Button
          size="sm"
          className="ml-auto h-8"
          onClick={openCreateDialog}
        >
          <AppIcons.exports className="size-3.5" />
          Export leads
        </Button>
      ) : null}
    </div>
  );
}
