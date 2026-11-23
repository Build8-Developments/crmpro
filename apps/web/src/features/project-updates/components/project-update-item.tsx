"use client";

import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { ProjectUpdateTypeBadge } from "@/features/project-updates/components/project-update-type-badge";
import type { ProjectUpdate } from "@/features/project-updates/types";
import {
  formatUpdateAge,
  isEdited,
} from "@/features/project-updates/utils/project-update-format";

export function ProjectUpdateItem({
  update,
  now,
  onEdit,
  onDelete,
}: {
  update: ProjectUpdate;
  /** From `useNow` in the parent (keeps render pure). */
  now: number;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <article className="space-y-1.5 px-3 py-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <ProjectUpdateTypeBadge type={update.type} />
          <h4 className="text-sm leading-snug font-medium break-words">{update.title}</h4>
        </div>
        {onEdit || onDelete ? (
          <div className="flex shrink-0 items-center">
            {onEdit ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                aria-label="Edit update"
                onClick={onEdit}
              >
                <AppIcons.edit className="size-3.5" />
              </Button>
            ) : null}
            {onDelete ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:text-destructive"
                aria-label="Delete update"
                onClick={onDelete}
              >
                <AppIcons.trash className="size-3.5" />
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
      {update.body ? (
        <p className="text-sm whitespace-pre-line break-words text-muted-foreground">
          {update.body}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground/80">
        {update.author?.fullName ?? "Former user"} ·{" "}
        <time dateTime={update.createdAt} title={new Date(update.createdAt).toLocaleString()}>
          {formatUpdateAge(update.createdAt, now)}
        </time>
        {isEdited(update) ? " · edited" : null}
      </p>
    </article>
  );
}
