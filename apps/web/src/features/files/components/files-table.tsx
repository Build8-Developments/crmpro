"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { AppIcons } from "@/components/icons/app-icons";
import { Badge } from "@/components/ui/badge";
import { FileRowActions } from "@/features/files/components/file-row-actions";
import type { FileAsset, FilesSortField } from "@/features/files/types";
import {
  formatFileCategory,
  formatFileSize,
  getFileTypeLabel,
} from "@/features/files/utils/file-formatters";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

interface FilesTableProps {
  files: FileAsset[];
  sortBy: FilesSortField;
  sortOrder: "asc" | "desc";
  onSortChange: (sortBy: FilesSortField, sortOrder: "asc" | "desc") => void;
  highlightedFileId?: string | null;
  onHighlightFile?: (fileId: string) => void;
}

function SortableHeader({
  label,
  column,
  sortBy,
  sortOrder,
  onSortChange,
  className,
}: {
  label: string;
  column: FilesSortField;
  sortBy: FilesSortField;
  sortOrder: "asc" | "desc";
  onSortChange: (sortBy: FilesSortField, sortOrder: "asc" | "desc") => void;
  className?: string;
}) {
  const isSorted = sortBy === column;

  return (
    <th
      className={cn(
        "h-9 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase",
        className,
      )}
    >
      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-0.5 transition-colors hover:text-foreground",
          isSorted && "text-foreground",
        )}
        onClick={() =>
          onSortChange(
            column,
            isSorted && sortOrder === "desc" ? "asc" : "desc",
          )
        }
      >
        {label}
        {isSorted ? (
          <AppIcons.chevronDown
            className={cn("size-3", sortOrder === "asc" && "rotate-180")}
          />
        ) : null}
      </button>
    </th>
  );
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.includes("pdf")) {
    return <AppIcons.exports className="size-4" />;
  }
  if (mimeType.includes("csv") || mimeType.includes("spreadsheet")) {
    return <AppIcons.imports className="size-4" />;
  }
  return <AppIcons.files className="size-4" />;
}

export function FilesTable({
  files,
  sortBy,
  sortOrder,
  onSortChange,
  highlightedFileId,
  onHighlightFile,
}: FilesTableProps) {
  const highlightRef = useRef<HTMLTableRowElement | null>(null);

  useEffect(() => {
    if (!highlightedFileId || !highlightRef.current) return;
    highlightRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [highlightedFileId, files]);

  return (
    <div className="overflow-hidden rounded-lg border border-border/70 bg-background">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse text-sm">
          <thead className="border-b border-border/60 bg-muted/30">
            <tr>
              <th className="h-9 px-3 text-left font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
                File
              </th>
              <th className="h-9 px-3 text-left font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
                Category
              </th>
              <th className="h-9 px-3 text-left font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
                Linked to
              </th>
              <SortableHeader
                label="Size"
                column="sizeBytes"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={onSortChange}
                className="text-left"
              />
              <SortableHeader
                label="Uploaded"
                column="createdAt"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSortChange={onSortChange}
                className="text-left"
              />
              <th className="h-9 w-12 px-3" />
            </tr>
          </thead>
          <tbody>
            {files.map((file) => {
              const highlighted = file.id === highlightedFileId;
              return (
                <tr
                  key={file.id}
                  ref={highlighted ? highlightRef : undefined}
                  className={cn(
                    "border-b border-border/40 transition-colors last:border-b-0",
                    highlighted && "bg-primary/5",
                  )}
                  onMouseEnter={() => onHighlightFile?.(file.id)}
                >
                  <td className="px-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                        <FileIcon mimeType={file.mimeType} />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {file.originalFilename}
                        </p>
                        <p className="truncate text-[11px] text-muted-foreground">
                          {getFileTypeLabel(file.mimeType)} ·{" "}
                          {file.uploadedBy.fullName}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {formatFileCategory(file.category)}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {file.lead ? (
                      <Link
                        href={`/leads?id=${file.lead.id}`}
                        className="text-primary hover:underline"
                      >
                        {file.lead.fullName}
                      </Link>
                    ) : file.project ? (
                      <Link
                        href={`/projects?projectId=${file.project.id}`}
                        className="text-primary hover:underline"
                      >
                        {file.project.name}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-xs tabular-nums text-muted-foreground">
                    {formatFileSize(file.sizeBytes)}
                  </td>
                  <td className="px-3 py-2.5 text-xs text-muted-foreground">
                    {formatRelativeTime(file.createdAt)}
                  </td>
                  <td className="px-3 py-2.5">
                    <FileRowActions file={file} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
