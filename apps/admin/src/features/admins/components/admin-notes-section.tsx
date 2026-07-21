"use client";

import { useState } from "react";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAdminNotes } from "@/features/admins/hooks";
import {
  useCreateAdminNote,
  useDeleteAdminNote,
  useUpdateAdminNote,
} from "@/features/admins/mutations";
import type { AdminNoteItem } from "@/features/admins/types";
import { usePermissions } from "@/hooks/use-permissions";
import { formatRelativeTime } from "@/lib/format";
import { ADMIN_PERMISSIONS } from "@crmpro/shared";

interface AdminNotesSectionProps {
  adminId: string;
}

export function AdminNotesSection({ adminId }: AdminNotesSectionProps) {
  const { data: notes, isLoading } = useAdminNotes(adminId);
  const createNote = useCreateAdminNote(adminId);
  const { can } = usePermissions();
  const [draft, setDraft] = useState("");

  const canManage = can(ADMIN_PERMISSIONS.ADMIN_MANAGE);
  const canRead =
    canManage || can(ADMIN_PERMISSIONS.AUDIT_READ);

  if (!canRead) return null;

  const handleAdd = async () => {
    const content = draft.trim();
    if (!content) return;
    await createNote.mutateAsync({ content });
    setDraft("");
  };

  return (
    <section className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Notes
      </h2>

      {canManage ? (
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Add a note..."
            className="h-9 text-sm"
            maxLength={5000}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void handleAdd();
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            disabled={!draft.trim() || createNote.isPending}
            onClick={() => void handleAdd()}
          >
            Add
          </Button>
        </div>
      ) : null}

      <div className="space-y-2">
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Loading notes…</p>
        ) : null}
        {!isLoading && (notes?.length ?? 0) === 0 ? (
          <p className="text-xs text-muted-foreground">No notes yet.</p>
        ) : null}
        {(notes ?? []).map((note) => (
          <AdminNoteCard
            key={note.id}
            note={note}
            adminId={adminId}
            canManage={canManage}
          />
        ))}
      </div>
    </section>
  );
}

function AdminNoteCard({
  note,
  adminId,
  canManage,
}: {
  note: AdminNoteItem;
  adminId: string;
  canManage: boolean;
}) {
  const updateNote = useUpdateAdminNote(adminId);
  const deleteNote = useDeleteAdminNote(adminId);
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(note.content);

  const canEdit = canManage;

  const handleSave = async () => {
    const trimmed = content.trim();
    if (!trimmed || trimmed === note.content) {
      setEditing(false);
      setContent(note.content);
      return;
    }
    await updateNote.mutateAsync({
      noteId: note.id,
      input: { content: trimmed },
    });
    setEditing(false);
  };

  return (
    <div className="rounded-lg border bg-card p-3 text-sm">
      {editing ? (
        <div className="space-y-2">
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            maxLength={5000}
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              disabled={updateNote.isPending || !content.trim()}
              onClick={() => void handleSave()}
            >
              Save
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setEditing(false);
                setContent(note.content);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="whitespace-pre-wrap">{note.content}</p>
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-[10px] text-muted-foreground">
              {note.author.fullName} · {formatRelativeTime(note.createdAt)}
            </p>
            {canEdit ? (
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Edit note"
                  onClick={() => setEditing(true)}
                >
                  <AppIcons.edit className="size-3" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label="Delete note"
                  disabled={deleteNote.isPending}
                  onClick={() => void deleteNote.mutateAsync(note.id)}
                >
                  <AppIcons.close className="size-3" />
                </Button>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
