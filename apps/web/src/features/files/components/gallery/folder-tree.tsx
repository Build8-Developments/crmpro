"use client";

import { useMemo, useState } from "react";
import {
  IconChevronRight,
  IconFolder,
  IconFolderOpen,
  IconHome,
  IconLock,
  IconLockOpen,
  IconPaperclip,
  IconFileImport,
  IconFileExport,
} from "@tabler/icons-react";
import type { FileFolder } from "@/features/files/types";
import { cn } from "@/lib/utils";
import { SYSTEM_VIEWS, type GalleryLocation } from "./use-gallery-location";

const SYSTEM_ICONS = {
  LEAD_ATTACHMENT: IconPaperclip,
  IMPORT_FILE: IconFileImport,
  EXPORT_FILE: IconFileExport,
} as const;

export function buildChildrenMap(folders: FileFolder[]) {
  const map = new Map<string | null, FileFolder[]>();
  for (const folder of folders) {
    const list = map.get(folder.parentId) ?? [];
    list.push(folder);
    map.set(folder.parentId, list);
  }
  return map;
}

/** Ids of a folder and all its ancestors, root first. */
export function folderPath(
  folders: FileFolder[],
  folderId: string | null,
): FileFolder[] {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const path: FileFolder[] = [];
  let current = folderId ? byId.get(folderId) : undefined;
  while (current && path.length < 20) {
    path.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return path;
}

export function FolderTree({
  folders,
  location,
  onOpenFolder,
  onOpenSystem,
}: {
  folders: FileFolder[];
  location: GalleryLocation;
  onOpenFolder: (folderId: string | null) => void;
  onOpenSystem: (category: (typeof SYSTEM_VIEWS)[number]["category"]) => void;
}) {
  const children = useMemo(() => buildChildrenMap(folders), [folders]);
  const activeFolderId = location.kind === "folder" ? location.folderId : undefined;

  // Expand the path to the open folder by default.
  const activePath = useMemo(
    () => new Set(folderPath(folders, activeFolderId ?? null).map((f) => f.id)),
    [folders, activeFolderId],
  );
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const isExpanded = (id: string) => expanded.has(id) || activePath.has(id);
  const toggle = (id: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id) || activePath.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const renderLevel = (parentId: string | null, depth: number) =>
    (children.get(parentId) ?? []).map((folder, index) => {
      const hasChildren = (children.get(folder.id) ?? []).length > 0;
      const open = isExpanded(folder.id);
      const active = activeFolderId === folder.id;
      const FolderIcon = active ? IconFolderOpen : IconFolder;
      return (
        <li key={folder.id} style={{ "--i": index } as React.CSSProperties}>
          <div
            className={cn(
              "group flex items-center rounded-md pr-1.5 text-sm transition-colors duration-fast ease-enter",
              active
                ? "bg-primary/10 text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
            style={{ paddingLeft: depth * 12 }}
          >
            <button
              type="button"
              aria-label={open ? `Collapse ${folder.name}` : `Expand ${folder.name}`}
              aria-expanded={hasChildren ? open : undefined}
              onClick={() => toggle(folder.id)}
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground",
                !hasChildren && "invisible",
              )}
            >
              <IconChevronRight
                className={cn(
                  "size-3.5 transition-[rotate] duration-slow ease-smooth motion-reduce:transition-none",
                  open && "rotate-90",
                )}
              />
            </button>
            <button
              type="button"
              onClick={() => onOpenFolder(folder.id)}
              aria-current={active ? "page" : undefined}
              className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left"
            >
              <FolderIcon
                className={cn(
                  "size-4 shrink-0",
                  active ? "text-primary" : "text-muted-foreground",
                )}
                stroke={1.75}
              />
              <span className="truncate">{folder.name}</span>
              {folder.isPrivate ? (
                folder.isLocked ? (
                  <IconLock
                    className="ml-auto size-3.5 shrink-0 text-amber-600"
                    aria-label="Private, locked"
                  />
                ) : (
                  <IconLockOpen
                    className="ml-auto size-3.5 shrink-0 text-muted-foreground"
                    aria-label="Private, unlocked"
                  />
                )
              ) : null}
            </button>
          </div>
          {hasChildren ? (
            // Folds open/closed by animating the row track (0fr ↔ 1fr), with
            // child rows drifting in one after another.
            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-gentle ease-smooth motion-reduce:transition-none",
                open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
              inert={!open}
            >
              <ul
                className={cn(
                  "min-h-0 overflow-hidden",
                  "[&>li]:transition-[opacity,translate] [&>li]:duration-slow [&>li]:ease-smooth [&>li]:motion-reduce:transition-none",
                  open
                    ? "[&>li]:delay-[calc(min(var(--i,0),8)*30ms)]"
                    : "[&>li]:-translate-y-1 [&>li]:opacity-0",
                )}
              >
                {renderLevel(folder.id, depth + 1)}
              </ul>
            </div>
          ) : null}
        </li>
      );
    });

  const homeActive = location.kind === "folder" && location.folderId === null;

  return (
    <nav aria-label="Folders" className="space-y-5 text-sm">
      <div>
        <button
          type="button"
          onClick={() => onOpenFolder(null)}
          aria-current={homeActive ? "page" : undefined}
          className={cn(
            "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left",
            homeActive
              ? "bg-primary/10 text-foreground"
              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
          )}
        >
          <IconHome
            className={cn("size-4", homeActive ? "text-primary" : "")}
            stroke={1.75}
          />
          Home
        </button>
        <ul className="mt-0.5">{renderLevel(null, 0)}</ul>
      </div>

      <div>
        <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
          Created by the app
        </p>
        <ul>
          {SYSTEM_VIEWS.map((view) => {
            const Icon = SYSTEM_ICONS[view.category];
            const active =
              location.kind === "system" && location.category === view.category;
            return (
              <li key={view.category}>
                <button
                  type="button"
                  onClick={() => onOpenSystem(view.category)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left",
                    active
                      ? "bg-primary/10 text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                  )}
                >
                  <Icon
                    className={cn("size-4", active ? "text-primary" : "")}
                    stroke={1.75}
                  />
                  {view.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
