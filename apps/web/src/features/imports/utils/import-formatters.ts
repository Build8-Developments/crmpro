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

export const IMPORT_CSV_TEMPLATE = [
  "fullName,primaryPhone,secondaryPhone,email,sourceName,assignedUserEmail,occupation,residenceArea,purchasePurpose,paymentPreference,budgetMin,budgetMax,contactChannel,contactTime",
  "Ahmed Hassan,+201000000001,,ahmed@example.com,Facebook,,Engineer,Nasr City,Investment,Installments,3000000,5000000,WhatsApp,Evening",
  "Sara Mohamed,+201000000002,+201000000003,sara@example.com,Website,agent@example.com,Doctor,Maadi,Living,Cash,8000000,12000000,Call,Morning",
].join("\n");

export const MAX_IMPORT_FILE_SIZE_BYTES = 25 * 1024 * 1024;

export const XLSX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export const IMPORT_FILE_ACCEPT = `.csv,.xlsx,text/csv,${XLSX_MIME_TYPE}`;

export function isImportSpreadsheet(file: File): boolean {
  const name = file.name.toLowerCase();
  return name.endsWith(".csv") || name.endsWith(".xlsx");
}

/** Browsers sometimes report "" (or an Excel type for .csv). */
export function importFileContentType(file: File): string {
  if (file.name.toLowerCase().endsWith(".xlsx")) return XLSX_MIME_TYPE;
  return file.type || "text/csv";
}

export function downloadImportTemplate() {
  const blob = new Blob([IMPORT_CSV_TEMPLATE], {
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
