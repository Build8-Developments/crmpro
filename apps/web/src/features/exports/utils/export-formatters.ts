import type {
  ExportFormat,
  ExportJobFilters,
  ExportJobStatus,
  ExportType,
} from "@/features/exports/types";

const STATUS_LABELS: Record<ExportJobStatus, string> = {
  PENDING: "Queued",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  FAILED: "Failed",
  PARTIAL_SUCCESS: "Partial",
};

const TYPE_LABELS: Record<ExportType, string> = {
  LEADS: "Leads",
  PROJECTS: "Projects",
  DEVELOPERS: "Developers",
  ACTIVITIES: "Activities",
};

const FORMAT_LABELS: Record<ExportFormat, string> = {
  XLSX: "Excel",
  CSV: "CSV",
  PDF: "PDF",
};

export function formatExportFormat(format: ExportFormat): string {
  return FORMAT_LABELS[format] ?? format;
}

export function formatExportStatus(status: ExportJobStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export function formatExportType(type: ExportType): string {
  return TYPE_LABELS[type] ?? type;
}

export function getExportStatusTone(status: ExportJobStatus): string {
  switch (status) {
    case "COMPLETED":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "PARTIAL_SUCCESS":
      return "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300";
    case "FAILED":
      return "border-destructive/30 bg-destructive/10 text-destructive";
    case "PROCESSING":
      return "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300";
    case "PENDING":
    default:
      return "border-border bg-muted/50 text-muted-foreground";
  }
}

export function isActiveExportStatus(status: ExportJobStatus): boolean {
  return status === "PENDING" || status === "PROCESSING";
}

const SUMMARIZED_FILTERS = new Set(["status", "search", "pipelineId", "stageId", "assignedUserId", "sourceId"]);

export function summarizeExportFilters(filters: ExportJobFilters): string {
  const parts: string[] = [];
  if (filters.status) parts.push(filters.status === "OPEN" ? "Open" : "Archived");
  if (filters.search) parts.push(`“${filters.search}”`);
  if (filters.pipelineId) parts.push("Pipeline filter");
  if (filters.stageId) parts.push("Stage filter");
  if (filters.assignedUserId) parts.push("Agent filter");
  if (filters.sourceId) parts.push("Source filter");
  // Exports started from the leads list can carry any list filter.
  const others = Object.entries(filters).filter(
    ([key, value]) =>
      !SUMMARIZED_FILTERS.has(key) &&
      value !== undefined &&
      value !== null &&
      value !== false &&
      !(Array.isArray(value) && value.length === 0),
  ).length;
  if (others > 0) parts.push(`${others} more ${others === 1 ? "filter" : "filters"}`);
  return parts.length > 0 ? parts.join(" · ") : "All leads";
}
