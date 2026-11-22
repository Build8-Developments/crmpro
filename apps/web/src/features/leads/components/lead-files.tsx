"use client";

import { useMemo, useState } from "react";
import { CHANNEL_LABELS, OUTCOME_LABELS } from "@crmpro/shared";
import { IconFileText, IconPhoto } from "@tabler/icons-react";
import { getFileDownloadUrl } from "@/features/files/api";
import { FilePreviewDialog } from "@/features/files/components/gallery/file-preview-dialog";
import type { FileAsset } from "@/features/files/types";
import { formatFileSize } from "@/features/files/utils/file-formatters";
import { useLeadAttachments } from "@/features/leads/hooks";
import type { LeadAttachment } from "@/features/leads/types";
import { formatRelativeTime } from "@/lib/format";
import { toast } from "@/lib/toast";

/** The previewer works on gallery files; lead attachments carry what it needs. */
function toPreviewFile(file: LeadAttachment, leadId: string): FileAsset {
  return {
    id: file.id,
    category: "LEAD_ATTACHMENT",
    originalFilename: file.originalFilename,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    leadId,
    projectId: null,
    folderId: null,
    createdAt: file.createdAt,
    uploadedBy: { id: file.uploadedBy.id, fullName: file.uploadedBy.name, email: "" },
    lead: null,
    project: null,
  };
}

/** Documents on this lead; evidence shows which activity it proves. */
export function LeadFiles({ leadId }: { leadId: string }) {
  const { data: files } = useLeadAttachments(leadId);
  const [openId, setOpenId] = useState<string | null>(null);
  const previewFiles = useMemo(
    () => (files ?? []).map((file) => toPreviewFile(file, leadId)),
    [files, leadId],
  );

  if (!files || files.length === 0) return null;

  const download = async (fileId: string) => {
    try {
      const { downloadUrl } = await getFileDownloadUrl(fileId);
      window.open(downloadUrl, "_blank", "noopener");
    } catch {
      toast.error("Couldn't download the file");
    }
  };

  return (
    <section className="space-y-2">
      <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        Files · {files.length}
      </h3>
      <ul className="space-y-1.5">
        {files.map((file) => {
          const Icon = file.mimeType.startsWith("image/") ? IconPhoto : IconFileText;
          return (
            <li key={file.id}>
              <button
                type="button"
                onClick={() => setOpenId(file.id)}
                className="flex w-full items-center gap-3 rounded-lg border bg-card p-2.5 text-left transition-colors duration-fast ease-enter hover:bg-muted/60"
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">
                    {file.originalFilename}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {file.interaction
                      ? `Evidence · ${CHANNEL_LABELS[file.interaction.channel]} — ${
                          OUTCOME_LABELS[file.interaction.outcome]
                        }`
                      : "Attachment"}
                    {` · ${formatFileSize(file.sizeBytes)} · ${file.uploadedBy.name} · ${formatRelativeTime(file.createdAt)}`}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <FilePreviewDialog
        files={previewFiles}
        fileId={openId}
        onChangeFile={setOpenId}
        onClose={() => setOpenId(null)}
        onDownload={(id) => void download(id)}
      />
    </section>
  );
}
