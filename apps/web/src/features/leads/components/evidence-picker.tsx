"use client";

import { useRef } from "react";
import { IconFileText, IconPaperclip, IconPhoto, IconX } from "@tabler/icons-react";
import { stageFileUpload } from "@/features/files/mutations";
import { formatFileSize } from "@/features/files/utils/file-formatters";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const MAX_FILES = 10;
const MAX_BYTES = 25 * 1024 * 1024;
const ACCEPT = "image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt";

export interface EvidenceItem {
  /** Local id for React keys. */
  key: string;
  file: File;
  progress: number;
  status: "uploading" | "ready" | "failed";
  objectKey?: string;
}

/**
 * Optional proof for a logged activity — reservation form, signed offer,
 * ID copy, a photo from the site visit. Files upload to storage as soon as
 * they are picked; they become lead attachments only when the log is saved.
 */
export function EvidencePicker({
  items,
  onChange,
  emphasize,
  hint,
}: {
  items: EvidenceItem[];
  onChange: (update: (items: EvidenceItem[]) => EvidenceItem[]) => void;
  /** Outcomes like "Reserved" usually come with paperwork. */
  emphasize: boolean;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const room = MAX_FILES - items.length;
    const picked = Array.from(list).slice(0, Math.max(0, room));
    if (list.length > picked.length) toast.info(`Up to ${MAX_FILES} files per activity`);

    for (const file of picked) {
      if (file.size > MAX_BYTES) {
        toast.error(`${file.name} is larger than 25 MB`);
        continue;
      }
      const key = `${file.name}-${file.size}-${Math.random().toString(36).slice(2)}`;
      onChange((current) => [...current, { key, file, progress: 0, status: "uploading" }]);
      const patch = (changes: Partial<EvidenceItem>) =>
        onChange((current) =>
          current.map((item) => (item.key === key ? { ...item, ...changes } : item)),
        );
      stageFileUpload(file, (progress) => patch({ progress }))
        .then(({ objectKey }) => patch({ objectKey, status: "ready", progress: 100 }))
        .catch(() => {
          patch({ status: "failed" });
          toast.error(`Couldn't upload ${file.name}`);
        });
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">
          Evidence <span className="font-normal text-muted-foreground">(optional)</span>
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={items.length >= MAX_FILES}
          className={cn(
            "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors duration-fast ease-enter disabled:opacity-50",
            emphasize
              ? "bg-primary/10 text-primary hover:bg-primary/15"
              : "text-muted-foreground ring-1 ring-border hover:bg-muted hover:text-foreground",
          )}
        >
          <IconPaperclip className="size-3.5" />
          Attach files
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(event) => {
            addFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {items.length === 0 && emphasize && hint ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : null}

      {items.length > 0 ? (
        <ul className="space-y-1">
          {items.map((item) => {
            const Icon = item.file.type.startsWith("image/") ? IconPhoto : IconFileText;
            return (
              <li
                key={item.key}
                className={cn(
                  "relative flex items-center gap-2 overflow-hidden rounded-md border bg-background px-2.5 py-1.5 text-xs",
                  item.status === "failed" && "border-destructive/40",
                )}
              >
                {item.status === "uploading" ? (
                  <span
                    aria-hidden
                    className="absolute inset-y-0 left-0 bg-primary/8 transition-[width] duration-base ease-enter"
                    style={{ width: `${item.progress}%` }}
                  />
                ) : null}
                <Icon className="relative size-3.5 shrink-0 text-muted-foreground" />
                <span className="relative min-w-0 flex-1 truncate">{item.file.name}</span>
                <span
                  className={cn(
                    "relative shrink-0 tabular-nums",
                    item.status === "failed" ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {item.status === "uploading"
                    ? `${Math.round(item.progress)}%`
                    : item.status === "failed"
                      ? "Failed"
                      : formatFileSize(String(item.file.size))}
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${item.file.name}`}
                  onClick={() => onChange((current) => current.filter((i) => i.key !== item.key))}
                  className="relative flex size-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <IconX className="size-3" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
