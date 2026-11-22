"use client";

import { useState } from "react";
import type { LeadMergeField, LeadMergeFieldChoice } from "@crmpro/shared";
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
import { LeadStageBadge } from "@/features/leads/components/lead-status-badge";
import { useMergeLeads } from "@/features/leads/mutations";
import type { Lead, LeadDuplicate, LeadMergeCounts } from "@/features/leads/types";
import {
  MERGE_FIELD_LABELS,
  formatMergeCounts,
  formatMergeFieldValue,
  isOlderLead,
} from "@/features/leads/utils/lead-merge";
import { usePermissions } from "@/hooks/use-permissions";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

type Side = "current" | "duplicate";

interface MergeLeadsDialogProps {
  /** The lead open in the drawer. */
  lead: Lead;
  /** What hangs off `lead` (moves when it is the one merged away). */
  leadCounts: LeadMergeCounts;
  /** The duplicate to merge with; null closes the dialog. */
  duplicate: LeadDuplicate | null;
  onClose: () => void;
  /** Called with the surviving lead's id once the merge is done. */
  onMerged: (survivorId: string) => void;
}

export function MergeLeadsDialog({
  lead,
  leadCounts,
  duplicate,
  onClose,
  onMerged,
}: MergeLeadsDialogProps) {
  return (
    <Dialog open={Boolean(duplicate)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {duplicate ? (
          // Keyed so every duplicate starts from fresh defaults.
          <MergeLeadsForm
            key={`${lead.id}:${duplicate.id}`}
            lead={lead}
            leadCounts={leadCounts}
            duplicate={duplicate}
            onClose={onClose}
            onMerged={onMerged}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function MergeLeadsForm({
  lead,
  leadCounts,
  duplicate,
  onClose,
  onMerged,
}: MergeLeadsDialogProps & { duplicate: LeadDuplicate }) {
  const { can } = usePermissions();
  const canAssign = can("lead.assign");
  const mergeLeads = useMergeLeads();
  // A live deal must stay on its (won) lead, so that lead is kept by default.
  const [keep, setKeep] = useState<Side>(() =>
    duplicate.liveDeal && !lead.liveDeal
      ? "duplicate"
      : lead.liveDeal && !duplicate.liveDeal
        ? "current"
        : isOlderLead(lead, duplicate)
          ? "current"
          : "duplicate",
  );
  const [picks, setPicks] = useState<Partial<Record<LeadMergeField, Side>>>({});

  const leadsBySide: Record<Side, Lead> = { current: lead, duplicate };
  const other: Side = keep === "current" ? "duplicate" : "current";
  const survivor = leadsBySide[keep];
  const mergedAway = leadsBySide[other];
  const fields = duplicate.differingFields;

  /** Same default as the API: keep the survivor's value, fill its blanks. */
  const pickFor = (field: LeadMergeField): Side => {
    if (field === "assignee" && !canAssign) return keep;
    const picked = picks[field];
    if (picked) return picked;
    const survivorBlank = formatMergeFieldValue(survivor, field) === null;
    const otherHasValue = formatMergeFieldValue(mergedAway, field) !== null;
    return survivorBlank && otherHasValue ? other : keep;
  };

  // The API only merges into an open lead.
  const survivorArchived = survivor.status === "ARCHIVED";
  const mergedAwayHasDeal = Boolean(leadsBySide[other].liveDeal);
  const movingCounts = keep === "current" ? duplicate.counts : leadCounts;
  const moving = formatMergeCounts(movingCounts);
  const survivorName = formatMergeFieldValue(leadsBySide[pickFor("fullName")], "fullName");

  const handleMerge = async () => {
    const choices: Partial<Record<LeadMergeField, LeadMergeFieldChoice>> = {};
    for (const field of fields) {
      choices[field] = pickFor(field) === keep ? "target" : "source";
    }
    try {
      const result = await mergeLeads.mutateAsync({
        targetLeadId: survivor.id,
        sourceLeadId: mergedAway.id,
        fields: choices,
      });
      onMerged(result.lead.id);
    } catch {
      // Error toast is handled by useApiMutation
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Merge duplicate leads</DialogTitle>
        <DialogDescription>
          Pick the lead to keep. The other one&apos;s history, tasks, notes and files move
          onto it, and the other lead is removed.
        </DialogDescription>
      </DialogHeader>

      <div role="radiogroup" aria-label="Lead to keep" className="grid gap-3 sm:grid-cols-2">
        {(["current", "duplicate"] as const).map((side) => (
          <LeadChoiceCard
            key={side}
            label={side === "current" ? "This lead" : "Duplicate"}
            lead={leadsBySide[side]}
            selected={keep === side}
            onSelect={() => setKeep(side)}
          />
        ))}
      </div>

      {fields.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Pick the details to keep
          </h3>
          <div className="divide-y rounded-lg border">
            {fields.map((field) => {
              const locked = field === "assignee" && !canAssign;
              return (
                <fieldset key={field} className="grid gap-2 px-3 py-2.5 sm:grid-cols-[8rem_1fr_1fr] sm:items-center">
                  <legend className="sr-only">{MERGE_FIELD_LABELS[field]}</legend>
                  <span aria-hidden className="text-xs font-medium text-muted-foreground">
                    {MERGE_FIELD_LABELS[field]}
                  </span>
                  {(["current", "duplicate"] as const).map((side) => (
                    <label
                      key={side}
                      className={cn(
                        "flex min-w-0 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                        pickFor(field) === side ? "bg-primary/8" : "hover:bg-muted/50",
                        locked && "cursor-not-allowed opacity-70",
                      )}
                    >
                      <input
                        type="radio"
                        name={`merge-${field}`}
                        className="accent-primary"
                        checked={pickFor(field) === side}
                        disabled={locked}
                        onChange={() => setPicks((current) => ({ ...current, [field]: side }))}
                      />
                      <span className="truncate">
                        {formatMergeFieldValue(leadsBySide[side], field) ?? (
                          <span className="text-muted-foreground">Empty</span>
                        )}
                      </span>
                    </label>
                  ))}
                  {locked ? (
                    <p className="text-[11px] text-muted-foreground sm:col-start-2 sm:col-span-2">
                      Changing the owner needs the permission to assign leads.
                    </p>
                  ) : null}
                </fieldset>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Both leads have the same details; only their history needs combining.
        </p>
      )}

      <div className="space-y-1.5 rounded-lg border bg-muted/20 p-3 text-sm">
        <p className="flex items-start gap-2">
          <AppIcons.merge className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>
            {moving ? `${moving} move to ` : "Nothing else to move; "}
            <span className="font-medium">{survivorName}</span>
            {moving ? "." : " keeps its history."}
          </span>
        </p>
        {mergedAwayHasDeal ? (
          <p className="text-xs font-medium text-destructive">
            The other lead has an active deal. Keep that lead instead, or cancel its deal
            first.
          </p>
        ) : null}
        {survivorArchived ? (
          <p className="text-xs font-medium text-destructive">
            The lead you keep is archived. Restore it first, or keep the other lead.
          </p>
        ) : null}
        <p className="text-xs text-muted-foreground">
          Stage, pipeline and status stay as on the lead you keep. Its phone numbers stay; a
          different number from the other lead fills the second phone if that is empty.
          Contact attempts are added up and project interests combined.
        </p>
      </div>

      <DialogFooter className="sm:items-center">
        <p className="mr-auto text-xs text-muted-foreground">This can&apos;t be undone.</p>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={() => void handleMerge()}
          disabled={mergeLeads.isPending || survivorArchived || mergedAwayHasDeal}
        >
          {mergeLeads.isPending ? "Merging…" : "Merge leads"}
        </Button>
      </DialogFooter>
    </>
  );
}

function LeadChoiceCard({
  label,
  lead,
  selected,
  onSelect,
}: {
  label: string;
  lead: Lead;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "min-w-0 space-y-1.5 rounded-lg border p-3 text-left text-sm transition-colors",
        selected ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:bg-muted/40",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span
          className={cn(
            "text-[11px] font-medium",
            selected ? "text-primary" : "text-muted-foreground",
          )}
        >
          {selected ? "Keep" : "Merge away"}
        </span>
      </div>
      <p className="truncate font-medium">{lead.fullName}</p>
      <p className="truncate text-xs text-muted-foreground">
        {lead.primaryPhone}
        {lead.secondaryPhone ? ` · ${lead.secondaryPhone}` : ""}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <LeadStageBadge stage={lead.stage} archived={lead.status === "ARCHIVED"} />
      </div>
      <p className="truncate text-xs text-muted-foreground">
        {lead.assignee?.name ?? "Unassigned"} · created {formatRelativeTime(lead.createdAt)}
      </p>
    </button>
  );
}
