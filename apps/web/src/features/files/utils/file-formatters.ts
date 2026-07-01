import type { FileAssetCategory } from "@/features/files/types";

const CATEGORY_LABELS: Record<FileAssetCategory, string> = {
  AVATAR: "Avatar",
  LEAD_ATTACHMENT: "Lead attachment",
  PROJECT_BROCHURE: "Project brochure",
  IMPORT_FILE: "Import",
  EXPORT_FILE: "Export",
  OTHER: "Other",
};

export function formatFileCategory(category: FileAssetCategory): string {
  return CATEGORY_LABELS[category] ?? category;
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

export const MAX_UPLOAD_FILE_SIZE_BYTES = 25 * 1024 * 1024;
