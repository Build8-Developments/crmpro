"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectUpdateItem } from "@/features/project-updates/components/project-update-item";
import { useProjectUpdates } from "@/features/project-updates/hooks";
import {
  useCreateProjectUpdate,
  useDeleteProjectUpdate,
} from "@/features/project-updates/mutations";
import {
  PROJECT_UPDATE_TYPES,
  type ProjectUpdateType,
} from "@/features/project-updates/types";
import { usePermissions } from "@/hooks/use-permissions";

export function ProjectUpdatesPanel({ projectId }: { projectId: string }) {
  const t = useTranslations("projectUpdates");
  const { can } = usePermissions();
  const canPost = can("project.update");
  const updates = useProjectUpdates(projectId);
  const remove = useDeleteProjectUpdate(projectId);
  const items = updates.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <div className="space-y-4">
      {canPost ? <PostUpdateForm projectId={projectId} /> : null}

      {updates.isLoading ? (
        <Skeleton className="h-28 w-full" />
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <div className="divide-y rounded-lg border">
          {items.map((update) => (
            <ProjectUpdateItem
              key={update.id}
              update={update}
              onDelete={
                canPost ? () => void remove.mutateAsync(update.id) : undefined
              }
            />
          ))}
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
          {t("loadMore")}
        </Button>
      ) : null}
    </div>
  );
}

function PostUpdateForm({ projectId }: { projectId: string }) {
  const t = useTranslations("projectUpdates");
  const create = useCreateProjectUpdate(projectId);
  const [type, setType] = useState<ProjectUpdateType>("GENERAL");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [notify, setNotify] = useState(true);

  const submit = async () => {
    await create.mutateAsync({
      type,
      title: title.trim(),
      ...(body.trim() ? { body: body.trim() } : {}),
      notify,
    });
    setTitle("");
    setBody("");
    setType("GENERAL");
  };

  return (
    <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
      <p className="text-xs font-medium">{t("postTitle")}</p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[10rem_minmax(0,1fr)]">
        <Select value={type} onValueChange={(value) => setType(value as ProjectUpdateType)}>
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROJECT_UPDATE_TYPES.map((value) => (
              <SelectItem key={value} value={value}>
                {t(`types.${value}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t("titlePlaceholder")}
          maxLength={140}
          className="h-8"
        />
      </div>
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder={t("bodyPlaceholder")}
        maxLength={4000}
        rows={3}
        className="w-full resize-y rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
      />
      <div className="flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Checkbox
            checked={notify}
            onCheckedChange={(value) => setNotify(value === true)}
          />
          {t("notifyTeam")}
        </label>
        <Button
          type="button"
          size="sm"
          className="h-8"
          disabled={title.trim().length < 2 || create.isPending}
          onClick={() => void submit()}
        >
          {create.isPending ? t("posting") : t("post")}
        </Button>
      </div>
    </div>
  );
}
