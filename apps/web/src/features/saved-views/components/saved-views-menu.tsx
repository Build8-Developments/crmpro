"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
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
import {
  useLeadsTableStore,
  type LeadsTableFilters,
} from "@/features/leads/stores/leads-table-store";
import {
  createSavedView,
  deleteSavedView,
  getSavedViews,
  type SavedView,
} from "@/features/saved-views/api";
import { usePermissions } from "@/hooks/use-permissions";
import { queryKeys } from "@/lib/query/query-keys";
import { useApiMutation } from "@/lib/query/use-api-mutation";

/**
 * Saved filter + sort combinations for the leads page. Views only store
 * filter values; results always follow the viewer's own lead scope.
 */
export function SavedViewsMenu() {
  const t = useTranslations("savedViews");
  const { can } = usePermissions();
  const filters = useLeadsTableStore((s) => s.filters);
  const sortBy = useLeadsTableStore((s) => s.sortBy);
  const sortOrder = useLeadsTableStore((s) => s.sortOrder);
  const clearFilters = useLeadsTableStore((s) => s.clearFilters);
  const setFilters = useLeadsTableStore((s) => s.setFilters);
  const setSort = useLeadsTableStore((s) => s.setSort);
  const [saving, setSaving] = useState(false);
  const { data } = useQuery({
    queryKey: queryKeys.savedViews.all(),
    queryFn: async () => (await getSavedViews()).items,
    staleTime: 60 * 1000,
  });
  const remove = useApiMutation({
    mutationFn: (id: string) => deleteSavedView(id),
    successMessage: t("deleted"),
    invalidateKeys: [queryKeys.savedViews.all()],
  });

  const views = data ?? [];
  const mine = views.filter((view) => view.isOwn);
  const shared = views.filter((view) => !view.isOwn);

  const apply = (view: SavedView) => {
    clearFilters();
    setFilters(view.filters as Partial<LeadsTableFilters>);
    if (view.sort.sortBy) {
      setSort(
        view.sort.sortBy as Parameters<typeof setSort>[0],
        view.sort.sortOrder ?? "desc",
      );
    }
  };

  const renderItem = (view: SavedView) => (
    <DropdownMenuItem key={view.id} onClick={() => apply(view)} className="justify-between gap-2">
      <span className="truncate">{view.name}</span>
      {view.isOwn ? (
        <button
          type="button"
          aria-label={t("delete")}
          className="text-muted-foreground hover:text-destructive"
          onClick={(event) => {
            event.stopPropagation();
            void remove.mutateAsync(view.id);
          }}
        >
          <AppIcons.trash className="size-3.5" />
        </button>
      ) : (
        <span className="text-[10px] text-muted-foreground">{view.user.name}</span>
      )}
    </DropdownMenuItem>
  );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-8">
            <AppIcons.list className="size-3.5" />
            {t("button")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-60">
          <DropdownMenuItem onClick={() => clearFilters()}>{t("allLeads")}</DropdownMenuItem>
          {mine.length ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[11px]">{t("mine")}</DropdownMenuLabel>
              {mine.map(renderItem)}
            </>
          ) : null}
          {shared.length ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className="text-[11px]">{t("shared")}</DropdownMenuLabel>
              {shared.map(renderItem)}
            </>
          ) : null}
          {!views.length ? (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">{t("empty")}</p>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setSaving(true)}>
            <AppIcons.create className="size-3.5" />
            {t("save")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <SaveViewDialog
        open={saving}
        onClose={() => setSaving(false)}
        canShare={can("saved-view.share")}
        snapshot={{ filters, sort: { sortBy, sortOrder } }}
      />
    </>
  );
}

function SaveViewDialog({
  open,
  onClose,
  canShare,
  snapshot,
}: {
  open: boolean;
  onClose: () => void;
  canShare: boolean;
  snapshot: { filters: LeadsTableFilters; sort: { sortBy: string; sortOrder: string } };
}) {
  const t = useTranslations("savedViews");
  const tCommon = useTranslations("common");
  const [name, setName] = useState("");
  const [isShared, setIsShared] = useState(false);
  const create = useApiMutation({
    mutationFn: () =>
      createSavedView({
        name: name.trim(),
        filters: snapshot.filters as Record<string, unknown>,
        sort: snapshot.sort,
        isShared: canShare && isShared,
      }),
    successMessage: t("saved"),
    invalidateKeys: [queryKeys.savedViews.all()],
  });

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("save")}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            try {
              await create.mutateAsync(undefined);
              setName("");
              onClose();
            } catch {
              // toast shown
            }
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="view-name">{t("name")}</Label>
            <Input
              id="view-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={60}
              required
              autoFocus
            />
          </div>
          {canShare ? (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isShared} onCheckedChange={(value) => setIsShared(Boolean(value))} />
              {t("share")}
            </label>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={!name.trim() || create.isPending}>
              {create.isPending ? t("saving") : t("create")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
