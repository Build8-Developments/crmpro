"use client";

import { useState } from "react";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectUpdateForm } from "@/features/project-updates/components/project-update-form";
import { ProjectUpdateItem } from "@/features/project-updates/components/project-update-item";
import { useProjectUpdates } from "@/features/project-updates/hooks";
import {
  useCreateProjectUpdate,
  useDeleteProjectUpdate,
  useEditProjectUpdate,
} from "@/features/project-updates/mutations";
import type { ProjectUpdate } from "@/features/project-updates/types";
import { useNow } from "@/hooks/use-now";
import { usePermissions } from "@/hooks/use-permissions";

/**
 * A project's news, newest first. Anyone with project.update can post, edit
 * and delete (the API enforces the same rule).
 */
export function ProjectUpdatesFeed({ projectId }: { projectId: string }) {
  const { can } = usePermissions();
  const canManage = can("project.update");
  const now = useNow(60_000);
  const updates = useProjectUpdates(projectId);
  const create = useCreateProjectUpdate(projectId);
  const edit = useEditProjectUpdate();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ProjectUpdate | null>(null);
  const items = updates.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="space-y-4">
      {canManage ? (
        <section className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3">
          <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Post an update
          </h3>
          <p className="text-xs text-muted-foreground">
            Agents selling this project are notified.
          </p>
          <ProjectUpdateForm
            idPrefix={`new-update-${projectId}`}
            submitLabel="Post update"
            pendingLabel="Posting…"
            isPending={create.isPending}
            onSubmit={(input) => create.mutateAsync(input)}
          />
        </section>
      ) : null}

      {updates.isLoading ? (
        <div className="space-y-2" aria-busy="true">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : updates.isError ? (
        <div className="rounded-lg border border-destructive/30 px-3 py-6 text-center">
          <p className="text-sm text-muted-foreground">Couldn&apos;t load updates.</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-3"
            disabled={updates.isFetching}
            onClick={() => void updates.refetch()}
          >
            {updates.isFetching ? "Retrying…" : "Retry"}
          </Button>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-3 py-8 text-center">
          <AppIcons.notifications className="size-5 text-muted-foreground" />
          <p className="text-sm font-medium">No updates yet</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Price changes, new phases and availability news for this project show up here.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border/60 rounded-lg border border-border/60 bg-card">
          {items.map((update) =>
            editingId === update.id ? (
              <div key={update.id} className="p-3">
                <ProjectUpdateForm
                  idPrefix={`edit-update-${update.id}`}
                  initial={{ type: update.type, title: update.title, body: update.body }}
                  submitLabel="Save"
                  pendingLabel="Saving…"
                  isPending={edit.isPending}
                  onSubmit={async (input) => {
                    await edit.mutateAsync({ updateId: update.id, input });
                    setEditingId(null);
                  }}
                  onCancel={() => setEditingId(null)}
                />
              </div>
            ) : (
              <ProjectUpdateItem
                key={update.id}
                update={update}
                now={now}
                onEdit={canManage ? () => setEditingId(update.id) : undefined}
                onDelete={canManage ? () => setDeleting(update) : undefined}
              />
            ),
          )}
        </div>
      )}

      {updates.hasNextPage ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          disabled={updates.isFetchingNextPage}
          onClick={() => void updates.fetchNextPage()}
        >
          {updates.isFetchingNextPage ? "Loading…" : "Load older updates"}
        </Button>
      ) : null}

      <DeleteProjectUpdateDialog update={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}

function DeleteProjectUpdateDialog({
  update,
  onClose,
}: {
  update: ProjectUpdate | null;
  onClose: () => void;
}) {
  const remove = useDeleteProjectUpdate();

  const handleDelete = async () => {
    if (!update) return;
    try {
      await remove.mutateAsync(update.id);
      onClose();
    } catch {
      // Error toast already shown; keep the dialog open.
    }
  };

  return (
    <Dialog open={Boolean(update)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete this update?</DialogTitle>
          <DialogDescription>
            &quot;{update?.title}&quot; will be removed from the project&apos;s feed.
            Notifications already sent stay in people&apos;s inboxes.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={remove.isPending}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => void handleDelete()}
            disabled={remove.isPending}
          >
            {remove.isPending ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
