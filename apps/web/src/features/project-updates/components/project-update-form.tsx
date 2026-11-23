"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PROJECT_UPDATE_BODY_MAX,
  PROJECT_UPDATE_TITLE_MAX,
  PROJECT_UPDATE_TYPES,
  type CreateProjectUpdateInput,
  type ProjectUpdateType,
} from "@/features/project-updates/types";
import { PROJECT_UPDATE_TYPE_LABELS } from "@/features/project-updates/utils/project-update-format";

const TEXTAREA_CLASS =
  "w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow,border-color] duration-fast ease-enter focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

/**
 * Post or edit an update. Starts from `initial`; remount (key) to reset.
 * Resolves `onSubmit` → the form clears (new post) or the caller closes it.
 */
export function ProjectUpdateForm({
  idPrefix,
  initial,
  submitLabel,
  pendingLabel,
  isPending,
  onSubmit,
  onCancel,
}: {
  idPrefix: string;
  initial?: CreateProjectUpdateInput;
  submitLabel: string;
  pendingLabel: string;
  isPending: boolean;
  onSubmit: (input: CreateProjectUpdateInput) => Promise<unknown>;
  onCancel?: () => void;
}) {
  const [type, setType] = useState<ProjectUpdateType>(initial?.type ?? "GENERAL");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const canSubmit = title.trim().length > 0 && !isPending;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;
    try {
      await onSubmit({ type, title: title.trim(), body: body.trim() || null });
    } catch {
      // The mutation already showed the error; keep the draft.
      return;
    }
    if (!initial) {
      setType("GENERAL");
      setTitle("");
      setBody("");
    }
  };

  return (
    <form onSubmit={(event) => void handleSubmit(event)} className="space-y-2.5">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[10rem_minmax(0,1fr)]">
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-type`} className="sr-only">
            Type
          </Label>
          <Select value={type} onValueChange={(value) => setType(value as ProjectUpdateType)}>
            <SelectTrigger id={`${idPrefix}-type`} className="h-9 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PROJECT_UPDATE_TYPES.map((value) => (
                <SelectItem key={value} value={value}>
                  {PROJECT_UPDATE_TYPE_LABELS[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`${idPrefix}-title`} className="sr-only">
            Title
          </Label>
          <Input
            id={`${idPrefix}-title`}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. New price list from December"
            maxLength={PROJECT_UPDATE_TITLE_MAX}
            className="h-9"
          />
        </div>
      </div>
      <Label htmlFor={`${idPrefix}-body`} className="sr-only">
        Details
      </Label>
      <textarea
        id={`${idPrefix}-body`}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Details (optional): what changed, from when, what to tell clients"
        maxLength={PROJECT_UPDATE_BODY_MAX}
        rows={3}
        className={TEXTAREA_CLASS}
      />
      <div className="flex items-center justify-end gap-2">
        {onCancel ? (
          <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" size="sm" disabled={!canSubmit}>
          {isPending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
