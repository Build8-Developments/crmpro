"use client";

import { useState } from "react";
import type { VisibilityState } from "@tanstack/react-table";
import {
  IconBookmark,
  IconBookmarkFilled,
  IconCheck,
  IconChevronDown,
  IconDeviceFloppy,
  IconPlus,
  IconSettings,
  IconTrash,
  IconUsers,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLeadsTableStore } from "@/features/leads/stores/leads-table-store";
import {
  useCreateSavedView,
  useDeleteSavedView,
  useSavedViews,
  useUpdateSavedView,
} from "@/features/saved-views/hooks";
import type { SavedView, SavedViewInput } from "@/features/saved-views/types";
import type { TableDensity, TablePreferences } from "@/hooks/use-table-preferences";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";

interface SavedViewsMenuProps {
  search: string;
  onSearchChange: (value: string) => void;
  columnVisibility: VisibilityState;
  density: TableDensity;
  onApplyDisplay: (prefs: Partial<TablePreferences>) => void;
}

/**
 * Saved views for the leads screen: filters, sort, list/board, columns and
 * density in one click. Views store settings only — the leads shown always
 * follow the viewer's own visibility.
 */
export function SavedViewsMenu({
  onSearchChange,
  columnVisibility,
  density,
  onApplyDisplay,
}: SavedViewsMenuProps) {
  const { can } = usePermissions();
  const canShare = can("lead.assign");
  const { data: views = [] } = useSavedViews();
  const applyView = useLeadsTableStore((s) => s.applyView);
  const filters = useLeadsTableStore((s) => s.filters);
  const sortBy = useLeadsTableStore((s) => s.sortBy);
  const sortOrder = useLeadsTableStore((s) => s.sortOrder);
  const layout = useLeadsTableStore((s) => s.layout);
  const updateView = useUpdateSavedView();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  const active = views.find((view) => view.id === activeId) ?? null;
  const mine = views.filter((view) => view.isOwn);
  const shared = views.filter((view) => !view.isOwn);

  const current = (): SavedViewInput => {
    // The open-lead id is a URL convenience, not part of a view.
    const { id: _id, ...rest } = filters;
    return {
      filters: rest,
      sort: { sortBy, sortOrder },
      display: { layout, columns: columnVisibility, density },
    };
  };
  const snapshot = JSON.stringify(current());
  const activeSnapshot = active
    ? JSON.stringify({
        filters: active.filters,
        sort: active.sort,
        display: { layout: active.display.layout ?? "list", columns: active.display.columns ?? columnVisibility, density: active.display.density ?? density },
      })
    : null;
  const changed = Boolean(active && activeSnapshot !== snapshot);

  const apply = (view: SavedView) => {
    applyView({
      filters: view.filters ?? {},
      sortBy: view.sort?.sortBy,
      sortOrder: view.sort?.sortOrder,
      layout: view.display?.layout,
    });
    onSearchChange("");
    onApplyDisplay({
      columnVisibility: view.display?.columns,
      density: view.display?.density,
    });
    setActiveId(view.id);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 max-w-52 gap-1.5">
            {active ? <IconBookmarkFilled className="size-3.5 text-primary" /> : <IconBookmark className="size-3.5" />}
            <span className="truncate">{active ? active.name : "Views"}</span>
            {changed ? <span className="size-1.5 shrink-0 rounded-full bg-amber-500" title="Changed since saved" /> : null}
            <IconChevronDown className="size-3.5 shrink-0 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {mine.length > 0 ? (
            <>
              <DropdownMenuLabel>My views</DropdownMenuLabel>
              {mine.map((view) => (
                <ViewItem key={view.id} view={view} active={view.id === activeId} onApply={() => apply(view)} />
              ))}
            </>
          ) : null}
          {shared.length > 0 ? (
            <>
              {mine.length > 0 ? <DropdownMenuSeparator /> : null}
              <DropdownMenuLabel>Shared with the team</DropdownMenuLabel>
              {shared.map((view) => (
                <ViewItem key={view.id} view={view} active={view.id === activeId} onApply={() => apply(view)} />
              ))}
            </>
          ) : null}
          {views.length === 0 ? (
            <p className="px-2 py-2 text-xs text-muted-foreground">
              Save the filters, columns and layout you use often, then switch in one click.
            </p>
          ) : null}
          <DropdownMenuSeparator />
          {active?.isOwn && changed ? (
            <DropdownMenuItem
              onClick={() => updateView.mutate({ id: active.id, input: current() })}
            >
              <IconDeviceFloppy className="size-4" />
              Update “{active.name}”
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onClick={() => setSaveOpen(true)}>
            <IconPlus className="size-4" />
            Save current view…
          </DropdownMenuItem>
          {mine.length > 0 ? (
            <DropdownMenuItem onClick={() => setManageOpen(true)}>
              <IconSettings className="size-4" />
              Manage views
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <SaveViewDialog
        open={saveOpen}
        canShare={canShare}
        onClose={() => setSaveOpen(false)}
        build={current}
        onSaved={(view) => setActiveId(view.id)}
      />
      <ManageViewsDialog
        open={manageOpen}
        views={mine}
        canShare={canShare}
        onClose={() => setManageOpen(false)}
        onDeleted={(id) => {
          if (id === activeId) setActiveId(null);
        }}
      />
    </>
  );
}

function ViewItem({ view, active, onApply }: { view: SavedView; active: boolean; onApply: () => void }) {
  return (
    <DropdownMenuItem onClick={onApply}>
      {active ? <IconCheck className="size-4 text-primary" /> : <span className="size-4" />}
      <span className="min-w-0 flex-1 truncate">{view.name}</span>
      {view.isOwn && view.isShared ? (
        <IconUsers className="size-3.5 text-muted-foreground" aria-label="Shared" />
      ) : null}
      {!view.isOwn ? <span className="truncate text-[11px] text-muted-foreground">{view.owner.name}</span> : null}
    </DropdownMenuItem>
  );
}

function SaveViewDialog({
  open,
  canShare,
  onClose,
  build,
  onSaved,
}: {
  open: boolean;
  canShare: boolean;
  onClose: () => void;
  build: () => SavedViewInput;
  onSaved: (view: SavedView) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-sm">
        {open ? <SaveViewForm canShare={canShare} onClose={onClose} build={build} onSaved={onSaved} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function SaveViewForm({
  canShare,
  onClose,
  build,
  onSaved,
}: {
  canShare: boolean;
  onClose: () => void;
  build: () => SavedViewInput;
  onSaved: (view: SavedView) => void;
}) {
  const create = useCreateSavedView();
  const [name, setName] = useState("");
  const [isShared, setShared] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    try {
      const view = await create.mutateAsync({ ...build(), name: name.trim(), isShared });
      onSaved(view);
      onClose();
    } catch {
      // toast handled by the mutation
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <DialogHeader>
        <DialogTitle>Save view</DialogTitle>
        <DialogDescription>
          Keeps the current filters, sort, layout, columns and density.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-1.5">
        <Label htmlFor="view-name">Name</Label>
        <Input
          id="view-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Hot leads without a next step"
          maxLength={60}
          autoFocus
        />
      </div>
      {canShare ? (
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <Checkbox checked={isShared} onCheckedChange={(value) => setShared(value === true)} />
          <span>
            Share with the team
            <span className="block text-xs text-muted-foreground">
              Everyone sees the view; each person still only sees leads they&apos;re allowed to.
            </span>
          </span>
        </label>
      ) : null}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={!name.trim() || create.isPending}>
          {create.isPending ? "Saving…" : "Save view"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function ManageViewsDialog({
  open,
  views,
  canShare,
  onClose,
  onDeleted,
}: {
  open: boolean;
  views: SavedView[];
  canShare: boolean;
  onClose: () => void;
  onDeleted: (id: string) => void;
}) {
  const update = useUpdateSavedView();
  const remove = useDeleteSavedView();
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>My views</DialogTitle>
          <DialogDescription>Share a view with the team or delete ones you no longer use.</DialogDescription>
        </DialogHeader>
        <ul className="max-h-80 divide-y divide-border/60 overflow-y-auto rounded-lg border border-border/60">
          {views.map((view) => (
            <li key={view.id} className="flex items-center gap-2 px-3 py-2">
              <span className="min-w-0 flex-1 truncate text-sm">{view.name}</span>
              {canShare ? (
                <button
                  type="button"
                  onClick={() => update.mutate({ id: view.id, input: { isShared: !view.isShared } })}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors duration-fast",
                    view.isShared
                      ? "border-primary/40 bg-primary/5 text-primary"
                      : "border-border text-muted-foreground hover:bg-muted/60",
                  )}
                >
                  <IconUsers className="size-3.5" />
                  {view.isShared ? "Shared" : "Share"}
                </button>
              ) : null}
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                className="size-7 text-muted-foreground hover:text-destructive"
                aria-label={`Delete ${view.name}`}
                onClick={() =>
                  remove.mutate(view.id, { onSuccess: () => onDeleted(view.id) })
                }
              >
                <IconTrash className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
