import type { FileAssetCategory } from "@/features/files/types";

const CATEGORY_LABELS: Record<FileAssetCategory, string> = {
  AVATAR: "Avatar",
  LEAD_ATTACHMENT: "Lead",
  PROJECT_BROCHURE: "Brochure",
  IMPORT_FILE: "Import",
  EXPORT_FILE: "Export",
  TENANT_LOGO: "Logo",
  OTHER: "Other",
};

export function formatFileCategory(category: FileAssetCategory): string {
  return CATEGORY_LABELS[category] ?? category;
}

export function getFileCategoryTone(category: FileAssetCategory): string {
  switch (category) {
    case "LEAD_ATTACHMENT":
      return "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300";
    case "IMPORT_FILE":
      return "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300";
    case "EXPORT_FILE":
      return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
    case "PROJECT_BROCHURE":
      return "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-300";
    case "AVATAR":
      return "border-pink-500/25 bg-pink-500/10 text-pink-700 dark:text-pink-300";
    default:
      return "border-border bg-muted/50 text-muted-foreground";
  }
}

export function formatFileSize(bytes: string | number): string {
  const value = typeof bytes === "string" ? Number(bytes) : bytes;

  if (!Number.isFinite(value) || value < 0) {
    return "—";
  }

  if (value === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"] as const;
  let size = value;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const precision = unitIndex === 0 ? 0 : size >= 10 ? 0 : 1;
  return `${size.toFixed(precision)} ${units[unitIndex]}`;
}

export function getFileTypeLabel(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "Image";
  if (mimeType.startsWith("video/")) return "Video";
  if (mimeType.startsWith("audio/")) return "Audio";
  if (mimeType.includes("pdf")) return "PDF";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) {
    return "Spreadsheet";
  }
  if (mimeType.includes("csv")) return "CSV";
  if (mimeType.includes("word") || mimeType.includes("document")) {
    return "Document";
  }
  if (mimeType.includes("zip") || mimeType.includes("compressed")) {
    return "Archive";
  }
  return "File";
}

export type FileKind = "pdf" | "csv" | "image" | "doc" | "archive" | "file";

export function getFileKind(mimeType: string): FileKind {
  if (mimeType.includes("pdf")) return "pdf";
  if (mimeType.includes("csv") || mimeType.includes("spreadsheet") || mimeType.includes("excel")) {
    return "csv";
  }
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.includes("word") || mimeType.includes("document")) return "doc";
  if (mimeType.includes("zip") || mimeType.includes("compressed")) return "archive";
  return "file";
}

export function getFileKindTone(kind: FileKind): string {
  switch (kind) {
    case "pdf":
      return "bg-rose-500/10 text-rose-600 dark:text-rose-300";
    case "csv":
      return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
    case "image":
      return "bg-sky-500/10 text-sky-600 dark:text-sky-300";
    case "doc":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-300";
    case "archive":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-300";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export const MAX_UPLOAD_FILE_SIZE_BYTES = 25 * 1024 * 1024;
