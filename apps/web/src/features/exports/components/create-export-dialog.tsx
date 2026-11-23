"use client";

import { useState } from "react";
import Link from "next/link";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateLeadExport } from "@/features/exports/mutations";
import { useExportUiStore } from "@/features/exports/stores/export-ui-store";
import type { ExportFormat } from "@/features/exports/types";
import { usePermissions } from "@/hooks/use-permissions";
import { ApiError } from "@/lib/api/client";

type LeadExportFormat = Extract<ExportFormat, "XLSX" | "CSV">;

const FORMAT_OPTIONS: { value: LeadExportFormat; label: string }[] = [
  { value: "XLSX", label: "Excel (.xlsx)" },
  { value: "CSV", label: "CSV (.csv)" },
];

export function CreateExportDialog() {
  const open = useExportUiStore((s) => s.createDialogOpen);
  const closeCreateDialog = useExportUiStore((s) => s.closeCreateDialog);
  const openJobDetail = useExportUiStore((s) => s.openJobDetail);
  const createExport = useCreateLeadExport();
  const { can } = usePermissions();
  const [format, setFormat] = useState<LeadExportFormat>("XLSX");
  const [status, setStatus] = useState<"all" | "OPEN" | "ARCHIVED">("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  const pending = createExport.isPending;

  const handleClose = () => {
    if (pending) return;
    closeCreateDialog();
    setFormat("XLSX");
    setStatus("all");
    setSearch("");
    setError(null);
  };

  const handleSubmit = async () => {
    setError(null);
    try {
      const filters = {
        ...(status === "all" ? {} : { status }),
        ...(search.trim() ? { search: search.trim() } : {}),
      };
      const job = await createExport.mutateAsync({
        format,
        ...(Object.keys(filters).length > 0 ? { filters } : {}),
      });
      closeCreateDialog();
      setFormat("XLSX");
      setStatus("all");
      setSearch("");
      openJobDetail(job.id);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to start export. Try again.",
      );
    }
  };

  if (!can("export-job.create")) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export leads</DialogTitle>
          <DialogDescription>
            Creates the file in the background. Only one export can run at a
            time.
          </DialogDescription>
        </DialogHeader>

        <p className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          Need specific leads (a stage, source, owner or date range)? Filter the{" "}
          <Link href="/leads" className="font-medium text-foreground underline-offset-2 hover:underline">
            Leads list
          </Link>{" "}
          and use its Export button: it exports exactly what you see.
        </p>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              File format
            </label>
            <Select
              value={format}
              onValueChange={(value) => setFormat(value as LeadExportFormat)}
              disabled={pending}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FORMAT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Lead status
            </label>
            <Select
              value={status}
              onValueChange={(value) =>
                setStatus(value as "all" | "OPEN" | "ARCHIVED")
              }
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All leads</SelectItem>
                <SelectItem value="OPEN">Open only</SelectItem>
                <SelectItem value="ARCHIVED">Archived only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              Search filter{" "}
              <span className="font-normal text-muted-foreground">
                (optional)
              </span>
            </label>
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, email, or phone..."
              className="h-9"
              disabled={pending}
            />
          </div>

          <p className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            {format === "XLSX"
              ? "Excel keeps phone numbers as text and budgets and dates as real values."
              : "CSV opens in any spreadsheet app."}{" "}
            Includes contact, source, stage, agent, projects, budget, and
            profile fields.
          </p>

          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={pending}
            onClick={() => void handleSubmit()}
          >
            {pending ? (
              <>
                <AppIcons.loader className="size-4 animate-spin" />
                Starting...
              </>
            ) : (
              "Start export"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
