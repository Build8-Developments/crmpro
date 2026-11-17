"use client";

import { useTranslations } from "next-intl";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import type { ProjectUpdate, ProjectUpdateType } from "@/features/project-updates/types";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const TYPE_TONES: Record<ProjectUpdateType, string> = {
  PRICE_CHANGE: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  NEW_PHASE: "bg-primary/10 text-primary",
  AVAILABILITY: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  GENERAL: "bg-muted text-muted-foreground",
};

export function ProjectUpdateTypeBadge({ type }: { type: ProjectUpdateType }) {
  const t = useTranslations("projectUpdates.types");
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded px-1.5 text-[10px] font-medium",
        TYPE_TONES[type],
      )}
    >
      {t(type)}
    </span>
  );
}

export function ProjectUpdateItem({
  update,
  showProject,
  onDelete,
}: {
  update: ProjectUpdate;
  showProject?: boolean;
  onDelete?: () => void;
}) {
  const t = useTranslations("projectUpdates");

  return (
    <article className="space-y-1.5 px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <ProjectUpdateTypeBadge type={update.type} />
            {showProject ? (
              <span className="truncate text-xs font-medium text-muted-foreground">
                {update.project.name}
              </span>
            ) : null}
          </div>
          <p className="text-sm font-medium leading-snug">{update.title}</p>
        </div>
        {onDelete ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 shrink-0"
            aria-label={t("delete")}
            onClick={onDelete}
          >
            <AppIcons.trash className="size-3.5" />
          </Button>
        ) : null}
      </div>
      {update.body ? (
        <p className="whitespace-pre-line text-xs text-muted-foreground">{update.body}</p>
      ) : null}
      <p className="text-[11px] text-muted-foreground/80">
        {update.author.fullName} · {formatRelativeTime(update.createdAt)}
      </p>
    </article>
  );
}
