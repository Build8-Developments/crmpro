"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  IconArrowsMove,
  IconCheck,
  IconDotsVertical,
  IconFolder,
  IconFolderPlus,
  IconInfoCircle,
  IconLayoutGrid,
  IconList,
  IconLock,
  IconLockOpen,
  IconMinus,
  IconPencil,
  IconTrash,
  IconUpload,
  IconX,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { getFileDownloadUrl } from "@/features/files/api";
import { useFiles, useFolders } from "@/features/files/hooks";
import { useLockFolder, useUploadToFolder } from "@/features/files/mutations";
import type { FileAsset, FileFolder } from "@/features/files/types";
import {
  formatFileSize,
  getFileTypeLabel,
} from "@/features/files/utils/file-formatters";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePageBreadcrumbs } from "@/hooks/use-page-breadcrumbs";
import { usePermissions } from "@/hooks/use-permissions";
import { formatRelativeTime } from "@/lib/format";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { FilePreviewDialog } from "./file-preview-dialog";
import { FileVisual } from "./file-visual";
import {
  DeleteFolderDialog,
  DeleteItemsDialog,
  FolderFormDialog,
  FolderPrivacyDialog,
  LockedFolderScreen,
  MoveItemsDialog,
} from "./folder-dialogs";
import { FolderTree, buildChildrenMap, folderPath } from "./folder-tree";
import { InfoPanel, type InfoPanelActions } from "./info-panel";
import { SYSTEM_VIEWS, useGalleryLocation } from "./use-gallery-location";

const PAGE_SIZE = 60;

type Selection = { files: Set<string>; folders: Set<string> };
const EMPTY_SELECTION: Selection = { files: new Set(), folders: new Set() };

async function openDownload(fileId: string) {
  try {
    const { downloadUrl } = await getFileDownloadUrl(fileId);
    window.open(downloadUrl, "_blank", "noopener,noreferrer");
  } catch (error) {
    toast.error(error instanceof Error ? error.message : "Download failed");
  }
}

export function FilesGalleryPage() {
  const { can } = usePermissions();
  const gallery = useGalleryLocation();
  const { location, view } = gallery;
  const foldersQuery = useFolders();
  const folders = useMemo(() => foldersQuery.data ?? [], [foldersQuery.data]);

  const [searchDraft, setSearchDraft] = useState(gallery.search);
  const debouncedSearch = useDebouncedValue(searchDraft, 350);
  useEffect(() => {
    if (debouncedSearch !== gallery.search) gallery.setSearch(debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync draft → URL only
  }, [debouncedSearch]);

  const [page, setPage] = useState(1);
  const [selection, setSelection] = useState<Selection>(EMPTY_SELECTION);
  const [folderPanelOpen, setFolderPanelOpen] = useState(false);
  const [infoSheetOpen, setInfoSheetOpen] = useState(false);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<
    | { kind: "create" }
    | { kind: "rename"; folder: FileFolder }
    | { kind: "privacy"; folder: FileFolder }
    | { kind: "delete-folder"; folder: FileFolder }
    | { kind: "move" }
    | { kind: "delete-items" }
    | null
  >(null);

  const locationKey = JSON.stringify(location) + gallery.search;
  const [lastLocationKey, setLastLocationKey] = useState(locationKey);
  if (lastLocationKey !== locationKey) {
    // Reset paging and selection whenever the user navigates.
    setLastLocationKey(locationKey);
    setPage(1);
    setSelection(EMPTY_SELECTION);
  }

  const currentFolderId = location.kind === "folder" ? location.folderId : null;
  const currentFolder = currentFolderId
    ? folders.find((folder) => folder.id === currentFolderId)
    : undefined;
  const path = useMemo(
    () => folderPath(folders, currentFolderId),
    [folders, currentFolderId],
  );
  const lockRoot = useMemo(() => {
    if (!currentFolder?.isLocked) return null;
    return [...path].reverse().find((f) => f.isPrivate && f.isLocked) ?? null;
  }, [currentFolder, path]);

  const systemView =
    location.kind === "system"
      ? SYSTEM_VIEWS.find((v) => v.category === location.category)
      : undefined;

  usePageBreadcrumbs(
    systemView
      ? [{ label: systemView.label }]
      : path.map((folder, index) => ({
          label: folder.name,
          href:
            index === path.length - 1 ? undefined : `/files?folder=${folder.id}`,
        })),
  );

  const searching = gallery.search.trim().length > 0;
  const filesQuery = useFiles(
    {
      page,
      limit: PAGE_SIZE,
      search: gallery.search.trim() || undefined,
      ...(location.kind === "system"
        ? { category: location.category }
        : searching
          ? {} // whole library; locked folders are excluded server-side
          : { folderId: location.folderId ?? "root" }),
    },
    {
      enabled:
        !lockRoot &&
        (location.kind === "system" || !currentFolderId || Boolean(currentFolder)),
    },
  );
  const files = useMemo(() => filesQuery.data?.items ?? [], [filesQuery.data]);
  const pagination = filesQuery.data?.pagination;

  const liveSubfolders = useMemo(() => {
    if (location.kind !== "folder" || searching) return [];
    return buildChildrenMap(folders).get(location.folderId) ?? [];
  }, [folders, location, searching]);

  /*
   * Smooth folder switching: while the new folder's files are loading, keep
   * showing the previous view (dimmed) instead of mixing the new subfolders
   * with the old files; when the data lands, slide the new view in from the
   * direction you moved (deeper → from the right, up → from the left).
   */
  const fresh = !filesQuery.isPlaceholderData && !filesQuery.isLoading;
  const depth = location.kind === "system" ? 1 : path.length;
  const [settled, setSettled] = useState({
    key: locationKey,
    subfolders: liveSubfolders,
    depth,
    direction: 0,
  });
  if (
    fresh &&
    (settled.key !== locationKey || settled.subfolders !== liveSubfolders)
  ) {
    setSettled({
      key: locationKey,
      subfolders: liveSubfolders,
      depth,
      direction:
        settled.key === locationKey ? 0 : Math.sign(depth - settled.depth),
    });
  }
  const switching = !fresh && settled.key !== locationKey;
  const subfolders = switching ? settled.subfolders : liveSubfolders;

  const inSystemView = location.kind === "system";
  const canUpload = can("file.upload") && !inSystemView && !lockRoot;

  const upload = useUploadToFolder();
  const lockFolder = useLockFolder();
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const startUpload = (list: FileList | null) => {
    const picked = list ? Array.from(list) : [];
    if (picked.length === 0 || !canUpload) return;
    upload.mutate({ files: picked, folderId: currentFolderId ?? undefined });
  };

  /* ─── Selection ─────────────────────────────────────────────────────────── */

  const selectedFiles = files.filter((file) => selection.files.has(file.id));
  const selectedFolders = subfolders.filter((folder) =>
    selection.folders.has(folder.id),
  );
  const selectionCount = selectedFiles.length + selectedFolders.length;
  const selectableCount = files.length + subfolders.length;
  const allSelected = selectableCount > 0 && selectionCount === selectableCount;

  const toggle = (kind: "files" | "folders", id: string) =>
    setSelection((current) => {
      const next = new Set(current[kind]);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...current, [kind]: next };
    });
  const selectOnlyFile = (id: string) =>
    setSelection((current) =>
      current.files.size === 1 && current.files.has(id) && current.folders.size === 0
        ? EMPTY_SELECTION
        : { files: new Set([id]), folders: new Set() },
    );
  const clearSelection = () => setSelection(EMPTY_SELECTION);
  const selectAll = () =>
    setSelection(
      allSelected
        ? EMPTY_SELECTION
        : {
            files: new Set(files.map((file) => file.id)),
            folders: new Set(subfolders.map((folder) => folder.id)),
          },
    );

  const canMoveSelection =
    selectionCount > 0 &&
    can("file.upload") &&
    selectedFiles.every((file) => file.category === "OTHER") &&
    selectedFolders.every((folder) => folder.canManage && !folder.isLocked);
  const canDeleteSelection =
    selectionCount > 0 &&
    can("file.delete") &&
    selectedFolders.every((folder) => folder.canManage && !folder.isLocked);

  const panelActions: InfoPanelActions = {
    canMove:
      selectionCount > 0
        ? canMoveSelection
        : false,
    canDelete: selectionCount > 0 ? canDeleteSelection : false,
    onMove: () => setDialog({ kind: "move" }),
    onDelete: () => setDialog({ kind: "delete-items" }),
    onDownload: (fileId) => void openDownload(fileId),
    onPreview: (fileId) => setPreviewFileId(fileId),
    onClearSelection: clearSelection,
  };

  const title = systemView?.label ?? currentFolder?.name ?? "Home";
  const showCheckboxes = selectionCount > 0;

  const folderTree = (
    <FolderTree
      folders={folders}
      location={location}
      onOpenFolder={(id) => {
        gallery.openFolder(id);
        setSearchDraft("");
        setFolderPanelOpen(false);
      }}
      onOpenSystem={(category) => {
        gallery.openSystem(category);
        setSearchDraft("");
        setFolderPanelOpen(false);
      }}
    />
  );

  const infoPanel = (
    <InfoPanel
      location={location}
      currentFolder={currentFolder}
      folders={folders}
      selectedFiles={selectedFiles}
      selectedFolders={selectedFolders}
      actions={panelActions}
    />
  );

  return (
    <div className="flex min-h-0 flex-1">
      {/* Folder panel (desktop) */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border/60 md:flex">
        <div className="flex h-12 items-center justify-between border-b border-border/60 px-3">
          <span className="text-sm font-semibold">Folders</span>
          {can("file.upload") ? (
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label="New folder"
              title="New folder"
              disabled={inSystemView || Boolean(lockRoot)}
              onClick={() => setDialog({ kind: "create" })}
            >
              <IconFolderPlus className="size-4" />
            </Button>
          ) : null}
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {foldersQuery.isLoading ? (
            <div className="space-y-2 p-1">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-4/5" />
              <Skeleton className="h-6 w-3/5" />
            </div>
          ) : (
            folderTree
          )}
        </div>
      </aside>

      {/* Folder panel (mobile) */}
      <Sheet open={folderPanelOpen} onOpenChange={setFolderPanelOpen}>
        <SheetContent side="left" className="w-72 p-3">
          <SheetTitle className="px-2 pt-1 text-sm">Folders</SheetTitle>
          {folderTree}
        </SheetContent>
      </Sheet>

      {/* Main */}
      <section
        className="relative flex min-w-0 flex-1 flex-col"
        onDragOver={(event) => {
          if (!canUpload || !event.dataTransfer.types.includes("Files")) return;
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={(event) => {
          if (event.currentTarget.contains(event.relatedTarget as Node)) return;
          setDragging(false);
        }}
        onDrop={(event) => {
          if (!canUpload) return;
          event.preventDefault();
          setDragging(false);
          startUpload(event.dataTransfer.files);
        }}
      >
        {/* Header */}
        <div className="flex flex-wrap items-center gap-2 border-b border-border/60 px-3 py-2 md:h-12 md:flex-nowrap md:px-4 md:py-0">
          <Button
            size="sm"
            variant="outline"
            className="md:hidden"
            onClick={() => setFolderPanelOpen(true)}
          >
            <IconFolder className="size-4" />
            Folders
          </Button>
          <div className="flex min-w-0 items-center gap-1.5">
            <h1 className="truncate text-sm font-semibold">{title}</h1>
            {currentFolder?.isPrivate ? (
              currentFolder.isLocked ? (
                <IconLock className="size-4 shrink-0 text-amber-600" aria-label="Private" />
              ) : (
                <IconLockOpen
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-label="Private, unlocked"
                />
              )
            ) : null}
            {currentFolder && !currentFolder.isLocked && currentFolder.canManage ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="icon-sm" variant="ghost" aria-label="Folder actions">
                    <IconDotsVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem
                    onSelect={() => setDialog({ kind: "rename", folder: currentFolder })}
                  >
                    <IconPencil className="size-4" /> Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => setDialog({ kind: "privacy", folder: currentFolder })}
                  >
                    <IconLock className="size-4" />
                    {currentFolder.isPrivate ? "Password…" : "Make private…"}
                  </DropdownMenuItem>
                  {currentFolder.isPrivate ? (
                    <DropdownMenuItem onSelect={() => lockFolder.mutate(currentFolder.id)}>
                      <IconLock className="size-4" /> Lock now
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={() =>
                      setDialog({ kind: "delete-folder", folder: currentFolder })
                    }
                  >
                    <IconTrash className="size-4" /> Delete folder
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>

          <div className="ml-auto flex w-full items-center gap-2 md:w-auto">
            <Input
              value={searchDraft}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Search all files"
              aria-label="Search files"
              className="h-8 min-w-0 flex-1 md:w-52 md:flex-none"
              disabled={Boolean(lockRoot)}
            />
            <div
              className="flex rounded-md border border-border/60 p-0.5"
              role="group"
              aria-label="View"
            >
              <Button
                size="icon-xs"
                variant={view === "grid" ? "secondary" : "ghost"}
                aria-label="Grid view"
                aria-pressed={view === "grid"}
                onClick={() => gallery.setView("grid")}
              >
                <IconLayoutGrid />
              </Button>
              <Button
                size="icon-xs"
                variant={view === "list" ? "secondary" : "ghost"}
                aria-label="List view"
                aria-pressed={view === "list"}
                onClick={() => gallery.setView("list")}
              >
                <IconList />
              </Button>
            </div>
            <Button
              size="icon-sm"
              variant="ghost"
              className="lg:hidden"
              aria-label="Show details"
              onClick={() => setInfoSheetOpen(true)}
            >
              <IconInfoCircle className="size-4" />
            </Button>
            {can("file.upload") ? (
              <Button
                size="sm"
                variant="outline"
                className="hidden md:inline-flex"
                disabled={inSystemView || Boolean(lockRoot)}
                onClick={() => setDialog({ kind: "create" })}
              >
                <IconFolderPlus className="size-4" />
                New folder
              </Button>
            ) : null}
            {can("file.upload") ? (
              <>
                <input
                  ref={fileInput}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    startUpload(event.target.files);
                    event.target.value = "";
                  }}
                />
                <Button
                  size="sm"
                  disabled={!canUpload || upload.isPending}
                  onClick={() => fileInput.current?.click()}
                >
                  <IconUpload className="size-4" />
                  {upload.isPending ? "Uploading…" : "Upload"}
                </Button>
              </>
            ) : null}
          </div>
        </div>

        {/* Selection bar: select-all + bulk actions */}
        {!lockRoot && selectableCount > 0 ? (
          <div
            className={cn(
              "flex h-10 items-center gap-2 border-b border-border/60 px-3 text-sm md:px-4",
              selectionCount > 0 && "bg-primary/5",
            )}
          >
            <SelectBox
              checked={allSelected ? true : selectionCount > 0 ? "mixed" : false}
              label={allSelected ? "Clear selection" : "Select all"}
              onToggle={selectAll}
              alwaysVisible
            />
            <span className={cn(selectionCount > 0 ? "font-medium" : "text-muted-foreground")}>
              {selectionCount > 0
                ? `${selectionCount} selected`
                : `${selectableCount} item${selectableCount === 1 ? "" : "s"}`}
            </span>
            {selectionCount > 0 ? (
              <div className="ml-auto flex items-center gap-1">
                {canMoveSelection ? (
                  <Button size="sm" variant="ghost" onClick={() => setDialog({ kind: "move" })}>
                    <IconArrowsMove className="size-4" /> Move
                  </Button>
                ) : null}
                {canDeleteSelection ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDialog({ kind: "delete-items" })}
                  >
                    <IconTrash className="size-4" /> Delete
                  </Button>
                ) : null}
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Clear selection"
                  onClick={clearSelection}
                >
                  <IconX className="size-4" />
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Content */}
        {lockRoot && currentFolder ? (
          <LockedFolderScreen folder={currentFolder} lockRootId={lockRoot.id} />
        ) : (
          <div
            className="flex-1 overflow-y-auto p-3 md:p-4"
            onClick={(event) => {
              // Clicking empty space clears the selection, like a desktop file manager.
              if (event.target === event.currentTarget) clearSelection();
            }}
          >
            {searching ? (
              <p className="mb-3 text-xs text-muted-foreground">
                Results across all files you can open. Private folders you
                haven&apos;t unlocked are not searched.
              </p>
            ) : null}

            <div
              key={settled.key}
              className={cn(
                "motion-safe:animate-slide-in transition-opacity duration-base ease-enter",
                switching && "pointer-events-none opacity-60",
              )}
              style={
                { "--slide": `${settled.direction}rem` } as React.CSSProperties
              }
            >
            {filesQuery.isLoading ? (
              <GallerySkeleton view={view} />
            ) : selectableCount === 0 ? (
              <EmptyState
                canUpload={canUpload}
                searching={searching}
                onUpload={() => fileInput.current?.click()}
              />
            ) : view === "grid" ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                {subfolders.map((folder) => (
                  <FolderTile
                    key={folder.id}
                    folder={folder}
                    selected={selection.folders.has(folder.id)}
                    showCheckbox={showCheckboxes}
                    onToggle={() => toggle("folders", folder.id)}
                    onOpen={() => gallery.openFolder(folder.id)}
                  />
                ))}
                {files.map((file) => (
                  <AssetCard
                    key={file.id}
                    file={file}
                    selected={selection.files.has(file.id)}
                    showCheckbox={showCheckboxes}
                    onToggle={() => toggle("files", file.id)}
                    onClick={(additive) =>
                      additive ? toggle("files", file.id) : selectOnlyFile(file.id)
                    }
                    onOpen={() => setPreviewFileId(file.id)}
                  />
                ))}
              </div>
            ) : (
              <AssetList
                folders={subfolders}
                files={files}
                selection={selection}
                onOpenFolder={(id) => gallery.openFolder(id)}
                onToggle={toggle}
                onClickFile={(id, additive) =>
                  additive ? toggle("files", id) : selectOnlyFile(id)
                }
                onOpenFile={(id) => setPreviewFileId(id)}
              />
            )}

            </div>

            {pagination && pagination.totalPages > 1 ? (
              <div className="mt-4 flex items-center justify-center gap-2 text-sm">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            ) : null}
          </div>
        )}

        {dragging ? (
          <div className="pointer-events-none absolute inset-2 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary/5 text-sm font-medium text-primary">
            Drop files to upload to {title}
          </div>
        ) : null}
      </section>

      {/* Info panel: always present on wide screens so the layout never shifts */}
      <aside
        aria-label="Details"
        className="hidden w-80 shrink-0 overflow-y-auto border-l border-border/60 lg:block"
      >
        {infoPanel}
      </aside>
      <Sheet open={infoSheetOpen} onOpenChange={setInfoSheetOpen}>
        <SheetContent side="right" className="w-80 overflow-y-auto p-0">
          <SheetTitle className="sr-only">Details</SheetTitle>
          {infoPanel}
        </SheetContent>
      </Sheet>

      <FilePreviewDialog
        files={files}
        fileId={previewFileId}
        onChangeFile={(id) => {
          setPreviewFileId(id);
          setSelection({ files: new Set([id]), folders: new Set() });
        }}
        onClose={() => setPreviewFileId(null)}
        onDownload={(id) => void openDownload(id)}
      />

      {/* Dialogs */}
      <FolderFormDialog
        open={dialog?.kind === "create"}
        onOpenChange={(open) => !open && setDialog(null)}
        parentId={currentFolderId}
        onCreated={(folder) => gallery.openFolder(folder.id)}
      />
      {dialog?.kind === "rename" ? (
        <FolderFormDialog
          key={dialog.folder.id}
          open
          onOpenChange={(open) => !open && setDialog(null)}
          parentId={dialog.folder.parentId}
          folder={dialog.folder}
        />
      ) : null}
      <FolderPrivacyDialog
        folder={dialog?.kind === "privacy" ? dialog.folder : null}
        onOpenChange={(open) => !open && setDialog(null)}
      />
      <DeleteFolderDialog
        folder={dialog?.kind === "delete-folder" ? dialog.folder : null}
        onOpenChange={(open) => !open && setDialog(null)}
        onDeleted={(folder) => gallery.openFolder(folder.parentId)}
      />
      {dialog?.kind === "move" ? (
        <MoveItemsDialog
          fileIds={selectedFiles.map((file) => file.id)}
          folderIds={selectedFolders.map((folder) => folder.id)}
          folders={folders}
          currentFolderId={currentFolderId}
          onOpenChange={(open) => !open && setDialog(null)}
          onMoved={clearSelection}
        />
      ) : null}
      {dialog?.kind === "delete-items" ? (
        <DeleteItemsDialog
          fileIds={selectedFiles.map((file) => file.id)}
          folders={selectedFolders}
          onOpenChange={(open) => !open && setDialog(null)}
          onDeleted={clearSelection}
        />
      ) : null}
    </div>
  );
}

/* ─── Pieces ──────────────────────────────────────────────────────────────── */

/** Checkbox shown on hover, or always once anything is selected. */
function SelectBox({
  checked,
  label,
  onToggle,
  alwaysVisible = false,
  className,
}: {
  checked: boolean | "mixed";
  label: string;
  onToggle: () => void;
  alwaysVisible?: boolean;
  className?: string;
}) {
  const on = checked === true || checked === "mixed";
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      onDoubleClick={(event) => event.stopPropagation()}
      className={cn(
        "flex size-5 shrink-0 items-center justify-center rounded border shadow-sm transition-opacity",
        "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        on
          ? "border-primary bg-primary text-primary-foreground opacity-100"
          : "border-border bg-background/90",
        !on && !alwaysVisible && "opacity-0 group-hover:opacity-100",
        className,
      )}
    >
      {checked === "mixed" ? (
        <IconMinus className="size-3.5" stroke={3} />
      ) : checked ? (
        <IconCheck className="size-3.5" stroke={3} />
      ) : null}
    </button>
  );
}

function FolderTile({
  folder,
  selected,
  showCheckbox,
  onToggle,
  onOpen,
}: {
  folder: FileFolder;
  selected: boolean;
  showCheckbox: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border transition-colors",
        selected
          ? "border-primary ring-2 ring-primary/30"
          : "border-border/60 hover:border-primary/50",
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="flex flex-col text-left"
        aria-label={`Open folder ${folder.name}`}
      >
        <div className="flex aspect-[4/3] items-center justify-center bg-muted/40">
          <IconFolder className="size-12 text-muted-foreground/70" stroke={1.25} />
        </div>
        <div className="flex items-center gap-1.5 px-2.5 pt-2">
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {folder.name}
          </span>
          {folder.isPrivate ? (
            folder.isLocked ? (
              <IconLock className="size-3.5 shrink-0 text-amber-600" aria-label="Locked" />
            ) : (
              <IconLockOpen
                className="size-3.5 shrink-0 text-muted-foreground"
                aria-label="Unlocked"
              />
            )
          ) : null}
        </div>
        <p className="px-2.5 pb-2 text-xs text-muted-foreground">
          {folder.fileCount === null
            ? "Private"
            : `${folder.fileCount} file${folder.fileCount === 1 ? "" : "s"}`}
        </p>
      </button>
      <SelectBox
        checked={selected}
        label={`Select folder ${folder.name}`}
        onToggle={onToggle}
        alwaysVisible={showCheckbox}
        className="absolute left-2 top-2"
      />
    </div>
  );
}

function AssetCard({
  file,
  selected,
  showCheckbox,
  onToggle,
  onClick,
  onOpen,
}: {
  file: FileAsset;
  selected: boolean;
  showCheckbox: boolean;
  onToggle: () => void;
  onClick: (additive: boolean) => void;
  onOpen: () => void;
}) {
  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-lg border transition-colors",
        selected
          ? "border-primary ring-2 ring-primary/30"
          : "border-border/60 hover:border-primary/50",
      )}
    >
      <button
        type="button"
        onClick={(event) => onClick(event.metaKey || event.ctrlKey || event.shiftKey)}
        onDoubleClick={onOpen}
        aria-pressed={selected}
        aria-label={`${file.originalFilename}, ${getFileTypeLabel(file.mimeType)}`}
        className="flex flex-col text-left"
      >
        <div className="aspect-[4/3] w-full overflow-hidden">
          <FileVisual
            mimeType={file.mimeType}
            previewUrl={file.previewUrl}
            name={file.originalFilename}
            className="transition-transform duration-200 group-hover:scale-[1.02]"
          />
        </div>
        <div className="w-full px-2.5 py-2">
          <p className="truncate text-sm font-medium" title={file.originalFilename}>
            {file.originalFilename}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {getFileTypeLabel(file.mimeType)} · {formatFileSize(file.sizeBytes)}
          </p>
        </div>
      </button>
      <SelectBox
        checked={selected}
        label={`Select ${file.originalFilename}`}
        onToggle={onToggle}
        alwaysVisible={showCheckbox}
        className="absolute left-2 top-2"
      />
    </div>
  );
}

function AssetList({
  folders,
  files,
  selection,
  onOpenFolder,
  onToggle,
  onClickFile,
  onOpenFile,
}: {
  folders: FileFolder[];
  files: FileAsset[];
  selection: Selection;
  onOpenFolder: (folderId: string) => void;
  onToggle: (kind: "files" | "folders", id: string) => void;
  onClickFile: (fileId: string, additive: boolean) => void;
  onOpenFile: (fileId: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border/60">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
          <tr>
            <th className="w-10 px-3 py-2">
              <span className="sr-only">Select</span>
            </th>
            <th className="px-3 py-2 font-medium">Name</th>
            <th className="hidden px-3 py-2 font-medium sm:table-cell">Type</th>
            <th className="hidden px-3 py-2 font-medium sm:table-cell">Size</th>
            <th className="hidden px-3 py-2 font-medium md:table-cell">Added</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {folders.map((folder) => {
            const selected = selection.folders.has(folder.id);
            return (
              <tr
                key={folder.id}
                aria-selected={selected}
                className={cn(
                  "group cursor-pointer",
                  selected ? "bg-primary/10" : "hover:bg-muted/40",
                )}
                onClick={() => onOpenFolder(folder.id)}
              >
                <td className="px-3 py-2">
                  <SelectBox
                    checked={selected}
                    label={`Select folder ${folder.name}`}
                    onToggle={() => onToggle("folders", folder.id)}
                    alwaysVisible
                  />
                </td>
                <td className="px-3 py-2">
                  <span className="flex items-center gap-2 font-medium">
                    <IconFolder className="size-4 text-muted-foreground" />
                    {folder.name}
                    {folder.isPrivate ? (
                      <IconLock className="size-3.5 text-amber-600" aria-label="Private" />
                    ) : null}
                  </span>
                </td>
                <td className="hidden px-3 py-2 text-muted-foreground sm:table-cell">
                  Folder
                </td>
                <td className="hidden px-3 py-2 text-muted-foreground sm:table-cell">
                  {folder.fileCount === null ? "—" : `${folder.fileCount} files`}
                </td>
                <td className="hidden px-3 py-2 text-muted-foreground md:table-cell">
                  {formatRelativeTime(folder.createdAt)}
                </td>
              </tr>
            );
          })}
          {files.map((file) => {
            const selected = selection.files.has(file.id);
            return (
              <tr
                key={file.id}
                aria-selected={selected}
                className={cn(
                  "group cursor-pointer",
                  selected ? "bg-primary/10" : "hover:bg-muted/40",
                )}
                onClick={(event) =>
                  onClickFile(file.id, event.metaKey || event.ctrlKey || event.shiftKey)
                }
                onDoubleClick={() => onOpenFile(file.id)}
              >
                <td className="px-3 py-2">
                  <SelectBox
                    checked={selected}
                    label={`Select ${file.originalFilename}`}
                    onToggle={() => onToggle("files", file.id)}
                    alwaysVisible
                  />
                </td>
                <td className="px-3 py-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="size-8 shrink-0 overflow-hidden rounded">
                      <FileVisual
                        mimeType={file.mimeType}
                        previewUrl={file.previewUrl}
                        name={file.originalFilename}
                        iconClassName="size-4"
                      />
                    </span>
                    <span className="truncate">{file.originalFilename}</span>
                  </span>
                </td>
                <td className="hidden px-3 py-2 text-muted-foreground sm:table-cell">
                  {getFileTypeLabel(file.mimeType)}
                </td>
                <td className="hidden px-3 py-2 text-muted-foreground sm:table-cell">
                  {formatFileSize(file.sizeBytes)}
                </td>
                <td className="hidden px-3 py-2 text-muted-foreground md:table-cell">
                  {formatRelativeTime(file.createdAt)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function GallerySkeleton({ view }: { view: "grid" | "list" }) {
  if (view === "list") {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Skeleton key={i} className="aspect-[4/3] w-full rounded-lg" />
      ))}
    </div>
  );
}

function EmptyState({
  canUpload,
  searching,
  onUpload,
}: {
  canUpload: boolean;
  searching: boolean;
  onUpload: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/70 px-6 py-16 text-center">
      <IconUpload className="size-8 text-muted-foreground" stroke={1.5} />
      <div>
        <p className="text-sm font-medium">
          {searching ? "No files match your search" : "This folder is empty"}
        </p>
        {canUpload && !searching ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Drag files here or use Upload.
          </p>
        ) : null}
      </div>
      {canUpload && !searching ? (
        <Button size="sm" onClick={onUpload}>
          <IconUpload className="size-4" /> Upload files
        </Button>
      ) : null}
    </div>
  );
}
