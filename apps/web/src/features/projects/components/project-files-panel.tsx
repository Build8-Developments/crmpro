"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getFileDownloadUrl } from "@/features/files/api";
import { useFiles } from "@/features/files/hooks";
import { useDeleteFile } from "@/features/files/mutations";
import { uploadFile } from "@/features/files/upload";
import { formatFileSize } from "@/features/files/utils/file-formatters";
import { usePermissions } from "@/hooks/use-permissions";
import { formatRelativeTime } from "@/lib/format";
import { queryKeys } from "@/lib/query/query-keys";
import { toast } from "@/lib/toast";
import { useQueryClient } from "@tanstack/react-query";

const MAX_PROJECT_FILE_BYTES = 25 * 1024 * 1024;

/** Brochures, price sheets and floor plans shared with the whole team. */
export function ProjectFilesPanel({ projectId }: { projectId: string }) {
  const t = useTranslations("projectFiles");
  const { can } = usePermissions();
  const canManage = can("project.update") && can("file.upload");
  const canDelete = can("project.update") && can("file.delete");
  const queryClient = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const files = useFiles(
    { projectId, category: "PROJECT_BROCHURE", limit: 50 },
    { enabled: can("file.read") },
  );
  const remove = useDeleteFile();
  const items = files.data?.items ?? [];

  const handleUpload = async (list: FileList | null) => {
    const selected = Array.from(list ?? []);
    if (selected.length === 0) return;
    setUploading(true);
    try {
      for (const file of selected) {
        if (file.size > MAX_PROJECT_FILE_BYTES) {
          toast.error(t("tooBig", { name: file.name }));
          continue;
        }
        await uploadFile(file, "PROJECT_BROCHURE", { projectId });
      }
      toast.success(t("uploaded"));
      await queryClient.invalidateQueries({ queryKey: queryKeys.files.all() });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("uploadFailed"));
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  };

  const download = async (fileId: string) => {
    const { downloadUrl } = await getFileDownloadUrl(fileId);
    window.open(downloadUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{t("help")}</p>
        {canManage ? (
          <>
            <input
              ref={input}
              type="file"
              multiple
              className="hidden"
              onChange={(event) => void handleUpload(event.target.files)}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 shrink-0"
              disabled={uploading}
              onClick={() => input.current?.click()}
            >
              {uploading ? (
                <AppIcons.loader className="size-3.5 animate-spin" />
              ) : (
                <AppIcons.upload className="size-3.5" />
              )}
              {uploading ? t("uploading") : t("upload")}
            </Button>
          </>
        ) : null}
      </div>

      {files.isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
          {t("empty")}
        </p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {items.map((file) => (
            <li key={file.id} className="flex items-center gap-3 px-3 py-2">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                <AppIcons.files className="size-4 text-muted-foreground" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.originalFilename}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {formatFileSize(file.sizeBytes)} · {file.uploadedBy.fullName} ·{" "}
                  {formatRelativeTime(file.createdAt)}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7"
                aria-label={t("download")}
                onClick={() => void download(file.id)}
              >
                <AppIcons.download className="size-3.5" />
              </Button>
              {canDelete ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-7"
                  aria-label={t("delete")}
                  disabled={remove.isPending}
                  onClick={() => void remove.mutateAsync(file.id)}
                >
                  <AppIcons.trash className="size-3.5" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
