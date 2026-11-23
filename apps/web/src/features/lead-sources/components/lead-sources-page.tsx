"use client";

import { useState } from "react";
import { IconCheck, IconPencil, IconTrash, IconX } from "@tabler/icons-react";
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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { LeadSource } from "@/features/lead-sources/api";
import {
  useCreateLeadSource,
  useDeleteLeadSource,
  useLeadSources,
  useUpdateLeadSource,
} from "@/features/lead-sources/hooks";
import { usePermissions } from "@/hooks/use-permissions";

export function LeadSourcesPage() {
  const { can } = usePermissions();
  const { data, isLoading, isError, refetch } = useLeadSources();
  const createSource = useCreateLeadSource();
  const [newName, setNewName] = useState("");
  const [pendingDelete, setPendingDelete] = useState<LeadSource | null>(null);

  const sources = data?.items ?? [];

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = newName.trim();
    if (name.length < 2) return;
    await createSource.mutateAsync(name);
    setNewName("");
  };

  return (
    <div className="space-y-4 px-4 py-5 md:px-8">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Lead Sources
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Channels your leads come from. CSV imports match sources by name.
        </p>
      </div>

      <div className="max-w-2xl overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        {can("lead-source.create") && (
          <form
            onSubmit={handleCreate}
            className="flex gap-2 border-b border-border/60 p-3"
          >
            <Input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="e.g. Property Finder, TikTok, Walk-in"
              minLength={2}
              maxLength={100}
              aria-label="New lead source name"
            />
            <Button
              type="submit"
              disabled={createSource.isPending || newName.trim().length < 2}
            >
              Add
            </Button>
          </form>
        )}

        {isLoading ? (
          <div className="space-y-2 p-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : isError ? (
          <div className="flex items-center justify-between gap-3 p-4 text-sm text-muted-foreground">
            Lead sources could not be loaded.
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        ) : sources.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted-foreground">
            <AppIcons.leadSources className="size-6" />
            No lead sources yet.
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {sources.map((source) => (
              <LeadSourceRow
                key={source.id}
                source={source}
                canUpdate={can("lead-source.update")}
                canDelete={can("lead-source.delete")}
                onDelete={() => setPendingDelete(source)}
              />
            ))}
          </ul>
        )}
      </div>

      <DeleteLeadSourceDialog
        source={pendingDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}

function LeadSourceRow({
  source,
  canUpdate,
  canDelete,
  onDelete,
}: {
  source: LeadSource;
  canUpdate: boolean;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const updateSource = useUpdateLeadSource();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(source.name);

  const cancel = () => {
    setName(source.name);
    setEditing(false);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2 || trimmed === source.name) {
      cancel();
      return;
    }
    await updateSource.mutateAsync({ id: source.id, name: trimmed });
    setEditing(false);
  };

  if (editing) {
    return (
      <li className="p-2">
        <form onSubmit={save} className="flex items-center gap-2">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === "Escape" && cancel()}
            minLength={2}
            maxLength={100}
            autoFocus
            aria-label="Lead source name"
          />
          <Button
            type="submit"
            size="icon"
            variant="ghost"
            aria-label="Save"
            disabled={updateSource.isPending}
          >
            <IconCheck />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Cancel"
            onClick={cancel}
          >
            <IconX />
          </Button>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-2 px-4 py-2.5">
      <span className="min-w-0 flex-1 truncate text-sm text-foreground">
        {source.name}
      </span>
      {canUpdate && (
        <Button
          size="icon"
          variant="ghost"
          aria-label={`Rename ${source.name}`}
          onClick={() => setEditing(true)}
        >
          <IconPencil />
        </Button>
      )}
      {canDelete && (
        <Button
          size="icon"
          variant="ghost"
          aria-label={`Delete ${source.name}`}
          onClick={onDelete}
        >
          <IconTrash />
        </Button>
      )}
    </li>
  );
}

function DeleteLeadSourceDialog({
  source,
  onClose,
}: {
  source: LeadSource | null;
  onClose: () => void;
}) {
  const deleteSource = useDeleteLeadSource();

  const confirm = async () => {
    if (!source) return;
    await deleteSource.mutateAsync(source.id);
    onClose();
  };

  return (
    <Dialog open={Boolean(source)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete lead source?</DialogTitle>
          <DialogDescription>
            &ldquo;{source?.name}&rdquo; will be removed. Sources that are
            still used by leads can&apos;t be deleted; rename them instead.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={confirm}
            disabled={deleteSource.isPending}
          >
            {deleteSource.isPending ? "Deleting..." : "Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
