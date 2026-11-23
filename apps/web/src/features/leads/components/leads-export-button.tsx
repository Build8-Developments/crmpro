"use client";

import { useRouter } from "next/navigation";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCreateLeadExport } from "@/features/exports/mutations";
import { useExportUiStore } from "@/features/exports/stores/export-ui-store";
import type { ExportFormat } from "@/features/exports/types";
import {
  buildLeadSelectionFilters,
  useLeadsTableStore,
} from "@/features/leads/stores/leads-table-store";
import { usePermissions } from "@/hooks/use-permissions";

const FORMATS: Array<{ value: Extract<ExportFormat, "XLSX" | "CSV">; label: string }> = [
  { value: "XLSX", label: "Excel (.xlsx)" },
  { value: "CSV", label: "CSV (.csv)" },
];

/**
 * Exports exactly the leads the list shows: the current filters, search and
 * sort go to the export job, which uses the list's where-builder. Opens the
 * job on the Exports page to follow progress and download.
 */
export function LeadsExportButton() {
  const { can } = usePermissions();
  const router = useRouter();
  const createExport = useCreateLeadExport();
  const openJobDetail = useExportUiStore((s) => s.openJobDetail);

  if (!can("export-job.create")) return null;

  const start = async (format: ExportFormat) => {
    const { filters, search, sortBy, sortOrder } = useLeadsTableStore.getState();
    try {
      const job = await createExport.mutateAsync({
        format,
        filters: buildLeadSelectionFilters(search, filters),
        sortBy,
        sortOrder,
      });
      openJobDetail(job.id);
      router.push("/exports");
    } catch {
      // The mutation shows the error (e.g. another export still running).
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8" disabled={createExport.isPending}>
          {createExport.isPending ? (
            <AppIcons.loader className="size-3.5 animate-spin" />
          ) : (
            <AppIcons.download className="size-3.5" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
          Leads matching the current filters
        </DropdownMenuLabel>
        {FORMATS.map((format) => (
          <DropdownMenuItem key={format.value} onClick={() => void start(format.value)}>
            {format.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
