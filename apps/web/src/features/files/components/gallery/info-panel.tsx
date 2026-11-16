"use client";

import Link from "next/link";
import {
  IconArrowsMove,
  IconDownload,
  IconEye,
  IconFolder,
  IconHome,
  IconLock,
  IconLockOpen,
  IconTrash,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useFilesStats } from "@/features/files/hooks";
import type {
  FileAsset,
  FileFolder,
  FileKind,
  FilesStats,
  FilesStatsParams,
} from "@/features/files/types";
import {
  formatFileSize,
  getFileTypeLabel,
} from "@/features/files/utils/file-formatters";
import { formatNumber, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { FileVisual } from "./file-visual";
import { SYSTEM_VIEWS, type GalleryLocation } from "./use-gallery-location";

const KIND_LABELS: Record<FileKind, string> = {
  image: "Images",
  pdf: "PDFs",
  spreadsheet: "Spreadsheets",
  document: "Documents",
  video: "Videos",
  audio: "Audio",
  archive: "Archives",
  other: "Other",
};

const SYSTEM_DESCRIPTIONS: Record<string, string> = {
  LEAD_ATTACHMENT: "Files attached to leads from the lead page.",
  IMPORT_FILE: "CSV files uploaded to import leads.",
  EXPORT_FILE: "CSV exports generated from your leads.",
};

export interface InfoPanelActions {
  canMove: boolean;
  canDelete: boolean;
  onMove: () => void;
  onDelete: () => void;
  onDownload: (fileId: string) => void;
  onPreview: (fileId: string) => void;
  onClearSelection: () => void;
}

/**
 * Always-visible right panel (like a media library's inspector): shows the
 * selection when there is one, otherwise the folder or library you are in.
 */
export function InfoPanel({
  location,
  currentFolder,
  folders,
  selectedFiles,
  selectedFolders,
  actions,
}: {
  location: GalleryLocation;
  currentFolder?: FileFolder;
  folders: FileFolder[];
  selectedFiles: FileAsset[];
  selectedFolders: FileFolder[];
  actions: InfoPanelActions;
}) {
  const selectionCount = selectedFiles.length + selectedFolders.length;

  if (selectionCount === 1 && selectedFiles.length === 1) {
    return (
      <FileInfo file={selectedFiles[0]} folders={folders} actions={actions} />
    );
  }
  if (selectionCount === 1 && selectedFolders.length === 1) {
    return (
      <FolderInfo folder={selectedFolders[0]} actions={actions} selected />
    );
  }
  if (selectionCount > 1) {
    return (
      <SelectionInfo
        files={selectedFiles}
        folders={selectedFolders}
        actions={actions}
      />
    );
  }
  if (location.kind === "system") {
    return <SystemInfo category={location.category} />;
  }
  if (currentFolder) {
    return <FolderInfo folder={currentFolder} actions={actions} />;
  }
  return <LibraryOverview />;
}

/* ─── Shared bits ─────────────────────────────────────────────────────────── */

function PanelSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2.5 border-b border-border/60 p-4 last:border-b-0">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Facts({ rows }: { rows: [string, React.ReactNode][] }) {
  return (
    <dl className="space-y-2 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-3">
          <dt className="shrink-0 text-muted-foreground">{label}</dt>
          <dd className="min-w-0 truncate text-right">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * `quota` colours by how full a limit is (amber/red near the cap);
 * `relative` is a plain comparison bar where full width just means "largest".
 */
function Meter({
  value,
  max,
  variant = "relative",
}: {
  value: number;
  max: number;
  variant?: "quota" | "relative";
}) {
  const ratio = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <div
      className="h-1.5 overflow-hidden rounded-full bg-muted"
      role="presentation"
    >
      <div
        className={cn(
          "h-full rounded-full",
          variant === "relative"
            ? "bg-primary/70"
            : ratio >= 0.95
              ? "bg-destructive"
              : ratio >= 0.8
                ? "bg-amber-500"
                : "bg-primary",
        )}
        style={{ width: `${Math.max(ratio * 100, ratio > 0 ? 2 : 0)}%` }}
      />
    </div>
  );
}

function StatsBlocks({
  params,
  showStorage,
  emptyLabel,
}: {
  params: FilesStatsParams;
  showStorage?: boolean;
  emptyLabel: string;
}) {
  const { data, isLoading } = useFilesStats(params);
  if (isLoading || !data) {
    return (
      <div className="space-y-3 p-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  return (
    <>
      {showStorage ? <StorageSection stats={data} /> : null}
      <PanelSection title="Contents">
        <Facts
          rows={[
            ["Files", formatNumber(data.totalFiles)],
            ["Total size", formatFileSize(data.totalBytes)],
          ]}
        />
      </PanelSection>
      {data.totalFiles === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <>
          <KindsSection stats={data} />
          <UploadersSection stats={data} />
        </>
      )}
    </>
  );
}

function StorageSection({ stats }: { stats: FilesStats }) {
  const { usedBytes, limitBytes } = stats.storage;
  return (
    <PanelSection title="Storage">
      <div className="flex items-baseline justify-between text-sm">
        <span className="font-medium">{formatFileSize(usedBytes)}</span>
        <span className="text-muted-foreground">
          of {limitBytes === null ? "unlimited" : formatFileSize(limitBytes)}
        </span>
      </div>
      {limitBytes !== null ? (
        <Meter value={usedBytes} max={limitBytes} variant="quota" />
      ) : null}
      <p className="text-xs text-muted-foreground">
        Includes lead attachments, imports and exports.
      </p>
    </PanelSection>
  );
}

function KindsSection({ stats }: { stats: FilesStats }) {
  const max = Math.max(...stats.byKind.map((kind) => kind.bytes), 1);
  return (
    <PanelSection title="File types">
      <ul className="space-y-2.5">
        {stats.byKind.slice(0, 6).map((kind) => (
          <li key={kind.kind} className="space-y-1">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span>{KIND_LABELS[kind.kind]}</span>
              <span className="text-xs text-muted-foreground">
                {formatNumber(kind.count)} · {formatFileSize(kind.bytes)}
              </span>
            </div>
            <Meter value={kind.bytes} max={max} />
          </li>
        ))}
      </ul>
    </PanelSection>
  );
}

function UploadersSection({ stats }: { stats: FilesStats }) {
  if (stats.topUploaders.length === 0) return null;
  const max = Math.max(...stats.topUploaders.map((row) => row.bytes), 1);
  return (
    <PanelSection title="Space used by">
      <ul className="space-y-2.5">
        {stats.topUploaders.map((row) => (
          <li key={row.user.id} className="space-y-1">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate">{row.user.fullName}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatFileSize(row.bytes)}
              </span>
            </div>
            <Meter value={row.bytes} max={max} />
          </li>
        ))}
      </ul>
    </PanelSection>
  );
}

function PanelHeader({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-border/60 p-4">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{title}</p>
        {subtitle ? (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}

/* ─── Views ───────────────────────────────────────────────────────────────── */

function LibraryOverview() {
  return (
    <div>
      <PanelHeader
        icon={<IconHome className="size-5" stroke={1.5} />}
        title="All files"
        subtitle="Everything you can open in this workspace"
      />
      <StatsBlocks
        params={{}}
        showStorage
        emptyLabel="No files uploaded yet."
      />
    </div>
  );
}

function SystemInfo({ category }: { category: FileAsset["category"] }) {
  const view = SYSTEM_VIEWS.find((item) => item.category === category);
  return (
    <div>
      <PanelHeader
        icon={<IconFolder className="size-5" stroke={1.5} />}
        title={view?.label ?? "Files"}
        subtitle="Created by the app"
      />
      <p className="border-b border-border/60 p-4 text-sm text-muted-foreground">
        {SYSTEM_DESCRIPTIONS[category] ?? ""}
      </p>
      <StatsBlocks params={{ category }} emptyLabel="Nothing here yet." />
    </div>
  );
}

function FolderInfo({
  folder,
  actions,
  selected = false,
}: {
  folder: FileFolder;
  actions: InfoPanelActions;
  selected?: boolean;
}) {
  return (
    <div>
      <PanelHeader
        icon={
          folder.isPrivate ? (
            folder.isLocked ? (
              <IconLock className="size-5 text-amber-500" stroke={1.5} />
            ) : (
              <IconLockOpen className="size-5" stroke={1.5} />
            )
          ) : (
            <IconFolder className="size-5" stroke={1.5} />
          )
        }
        title={folder.name}
        subtitle={folder.isPrivate ? "Private folder" : "Folder"}
      />
      <PanelSection title="Details">
        <Facts
          rows={[
            ["Created by", folder.createdBy.fullName || "You"],
            ["Created", formatRelativeTime(folder.createdAt)],
            [
              "Access",
              folder.isPrivate
                ? folder.isLocked
                  ? "Locked"
                  : "Unlocked on this device"
                : "Everyone with file access",
            ],
          ]}
        />
      </PanelSection>
      {folder.isLocked ? (
        <p className="p-4 text-sm text-muted-foreground">
          Unlock this folder to see what&apos;s inside.
        </p>
      ) : (
        <StatsBlocks
          params={{ folderId: folder.id }}
          emptyLabel="This folder has no files yet."
        />
      )}
      {selected && (actions.canMove || actions.canDelete) ? (
        <SelectionActions actions={actions} />
      ) : null}
    </div>
  );
}

function FileInfo({
  file,
  folders,
  actions,
}: {
  file: FileAsset;
  folders: FileFolder[];
  actions: InfoPanelActions;
}) {
  const folder = file.folderId
    ? folders.find((candidate) => candidate.id === file.folderId)
    : undefined;
  const rows: [string, React.ReactNode][] = [
    ["Type", getFileTypeLabel(file.mimeType)],
    ["Size", formatFileSize(file.sizeBytes)],
    ["Uploaded by", file.uploadedBy.fullName],
    ["Added", formatRelativeTime(file.createdAt)],
    [
      "Location",
      folder?.name ?? (file.category === "OTHER" ? "Home" : "Created by the app"),
    ],
  ];
  if (file.lead) {
    rows.push([
      "Lead",
      <Link
        key="lead"
        href={`/leads?id=${file.lead.id}`}
        className="text-primary hover:underline"
      >
        {file.lead.fullName}
      </Link>,
    ]);
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => actions.onPreview(file.id)}
        aria-label={`Preview ${file.originalFilename}`}
        className="block aspect-[4/3] w-full overflow-hidden border-b border-border/60 bg-muted/30"
      >
        <FileVisual
          mimeType={file.mimeType}
          previewUrl={file.previewUrl}
          name={file.originalFilename}
          className="object-contain"
          iconClassName="size-16"
        />
      </button>
      <div className="border-b border-border/60 p-4">
        <p className="break-words text-sm font-semibold">
          {file.originalFilename}
        </p>
      </div>
      <PanelSection title="Details">
        <Facts rows={rows} />
      </PanelSection>
      <div className="flex flex-wrap gap-2 p-4">
        <Button size="sm" onClick={() => actions.onPreview(file.id)}>
          <IconEye className="size-4" /> Preview
        </Button>
        <Button size="sm" variant="outline" onClick={() => actions.onDownload(file.id)}>
          <IconDownload className="size-4" /> Download
        </Button>
        {actions.canMove ? (
          <Button size="sm" variant="outline" onClick={actions.onMove}>
            <IconArrowsMove className="size-4" /> Move
          </Button>
        ) : null}
        {actions.canDelete ? (
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={actions.onDelete}
          >
            <IconTrash className="size-4" /> Delete
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function SelectionInfo({
  files,
  folders,
  actions,
}: {
  files: FileAsset[];
  folders: FileFolder[];
  actions: InfoPanelActions;
}) {
  const totalBytes = files.reduce((sum, file) => sum + Number(file.sizeBytes), 0);
  const parts = [
    files.length ? `${files.length} file${files.length === 1 ? "" : "s"}` : null,
    folders.length
      ? `${folders.length} folder${folders.length === 1 ? "" : "s"}`
      : null,
  ].filter(Boolean);

  return (
    <div>
      <PanelHeader
        icon={<IconFolder className="size-5" stroke={1.5} />}
        title={`${files.length + folders.length} selected`}
        subtitle={parts.join(" · ")}
      />
      {files.length > 0 ? (
        <PanelSection title="Selected files">
          <Facts rows={[["Total size", formatFileSize(totalBytes)]]} />
        </PanelSection>
      ) : null}
      <SelectionActions actions={actions} />
    </div>
  );
}

function SelectionActions({ actions }: { actions: InfoPanelActions }) {
  return (
    <div className="flex flex-wrap gap-2 p-4">
      {actions.canMove ? (
        <Button size="sm" variant="outline" onClick={actions.onMove}>
          <IconArrowsMove className="size-4" /> Move
        </Button>
      ) : null}
      {actions.canDelete ? (
        <Button
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={actions.onDelete}
        >
          <IconTrash className="size-4" /> Delete
        </Button>
      ) : null}
      <Button size="sm" variant="ghost" onClick={actions.onClearSelection}>
        Clear selection
      </Button>
    </div>
  );
}
