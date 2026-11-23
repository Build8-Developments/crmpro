"use client";

import { IconPlus, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FilterOption } from "@/features/leads/api";
import type { InterestLevel } from "@/features/leads/types";
import { INTEREST_LEVEL_OPTIONS } from "@/features/leads/utils/lead-filters";

export interface ProjectInterestDraft {
  projectId: string;
  interestLevel: InterestLevel;
}

const NONE = "__none__";

/** Converts drafts into the API payload shape (null levels omitted). */
export function toProjectInterestsInput(drafts: ProjectInterestDraft[]) {
  return drafts.map((draft) => ({
    projectId: draft.projectId,
    ...(draft.interestLevel ? { interestLevel: draft.interestLevel } : {}),
  }));
}

/**
 * Edits the full list of projects a lead is interested in. The API replaces the
 * lead's interests with exactly this list, so every existing interest must be
 * represented here — never send a partial list.
 */
export function ProjectInterestsField({
  value,
  options,
  onChange,
}: {
  value: ProjectInterestDraft[];
  options: FilterOption[];
  onChange: (next: ProjectInterestDraft[]) => void;
}) {
  const selectedIds = new Set(value.map((item) => item.projectId));
  const available = options.filter((option) => !selectedIds.has(option.id));
  const nameById = new Map(options.map((option) => [option.id, option.name]));

  const update = (index: number, patch: Partial<ProjectInterestDraft>) => {
    onChange(
      value.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );
  };

  const remove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const add = (projectId: string) => {
    onChange([...value, { projectId, interestLevel: null }]);
  };

  return (
    <div className="space-y-2">
      <Label>Projects</Label>

      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((item, index) => (
            <li key={item.projectId} className="flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                {nameById.get(item.projectId) ?? "Unknown project"}
              </span>
              <Select
                value={item.interestLevel ?? NONE}
                onValueChange={(next) =>
                  update(index, {
                    interestLevel:
                      next === NONE ? null : (next as InterestLevel),
                  })
                }
              >
                <SelectTrigger
                  className="w-28 shrink-0"
                  aria-label="Interest level"
                >
                  <SelectValue placeholder="Interest" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Not set</SelectItem>
                  {INTEREST_LEVEL_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${nameById.get(item.projectId) ?? "project"}`}
                onClick={() => remove(index)}
              >
                <IconX />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <Select
        value=""
        disabled={available.length === 0}
        onValueChange={(next) => next && add(next)}
      >
        <SelectTrigger className="w-full text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <IconPlus className="size-4" />
            {available.length === 0 && value.length > 0
              ? "All projects added"
              : "Add project"}
          </span>
        </SelectTrigger>
        <SelectContent>
          {available.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
