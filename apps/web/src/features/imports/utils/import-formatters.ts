import type { ImportJobStatus } from "@/features/imports/types";

const STATUS_LABELS: Record<ImportJobStatus, string> = {
  PENDING: "Queued",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  FAILED: "Failed",
  PARTIAL_SUCCESS: "Partial",
};

export function formatImportStatus(status: ImportJobStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export function getImportStatusTone(status: ImportJobStatus): string {
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

export function getImportProgressPercent(job: {
  totalRows: number;
  processedRows: number;
  status: ImportJobStatus;
}): number | null {
  if (job.status === "COMPLETED" || job.status === "PARTIAL_SUCCESS") {
    return 100;
  }
  if (job.status === "FAILED") {
    return job.totalRows > 0
      ? Math.round((job.processedRows / job.totalRows) * 100)
      : 0;
  }
  if (job.totalRows <= 0) return null;
  return Math.min(
    99,
    Math.round((job.processedRows / job.totalRows) * 100),
  );
}

/** Any header order/language works; these are just friendly examples. */
export const IMPORT_CSV_TEMPLATE = [
  "Full name,Phone,Secondary phone,Email,Source,Project,Budget,Notes",
  "Ahmed Hassan,01000000001,,ahmed@example.com,Facebook,,2.5M,Wants a villa",
  "Sara Mohamed,01000000002,01000000003,sara@example.com,Website,,,",
].join("\n");

export const MAX_IMPORT_FILE_SIZE_BYTES = 25 * 1024 * 1024;

export function downloadImportTemplate() {
  const blob = new Blob(["\uFEFF" + IMPORT_CSV_TEMPLATE], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "leads-import-template.csv";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function isActiveImportStatus(status: ImportJobStatus): boolean {
  return status === "PENDING" || status === "PROCESSING";
}
