"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useLead,
  useLeadActivities,
  useLeadDuplicates,
  useLeadNotes,
} from "@/features/leads/hooks";
import {
  useArchiveLead,
  useCreateLeadNote,
  useRestoreLead,
} from "@/features/leads/mutations";
import { useLeadUiStore } from "@/features/leads/stores/lead-ui-store";
import { LeadStageBadge } from "@/features/leads/components/lead-status-badge";
import { LeadAssigneeCell } from "@/features/leads/components/leads-table-cells";
import {
  formatLastContacted,
  getPrimaryProjectInterest,
} from "@/features/leads/utils/lead-formatters";
import { describeLeadActivity, type TimelineTone } from "@/features/leads/utils/lead-timeline";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { LeadFiles } from "./lead-files";
import { LeadProfileSummary } from "./lead-profile-summary";
import { MaskedContact } from "./masked-contact";
import { LeadNextSteps } from "./lead-next-steps";
import { CHANNEL_ICONS, HeatBadge } from "./workflow-visuals";
import { toast } from "@/lib/toast";
import { usePermissions } from "@/hooks/use-permissions";
import { ApiError } from "@/lib/api/client";
import type { LeadDuplicate } from "@/features/leads/types";
import { formatMergeCounts } from "@/features/leads/utils/lead-merge";
import { MergeLeadsDialog } from "./merge-leads-dialog";
import { LeadDealSection } from "@/features/deals/components/lead-deal-section";

/** The surviving lead's id when a lead 404s because it was merged away. */
function mergedIntoIdOf(error: unknown): string | null {
  if (!(error instanceof ApiError) || error.status !== 404) return null;
  const details = error.details as { mergedIntoId?: unknown } | null;
  return typeof details?.mergedIntoId === "string" ? details.mergedIntoId : null;
}

export function LeadDetailDrawer() {
  const drawerOpen = useLeadUiStore((s) => s.drawerOpen);
  const selectedLeadId = useLeadUiStore((s) => s.selectedLeadId);
  const closeDrawer = useLeadUiStore((s) => s.closeDrawer);
  const openAssignDialog = useLeadUiStore((s) => s.openAssignDialog);
  const openMoveStageDialog = useLeadUiStore((s) => s.openMoveStageDialog);
  const openEditDialog = useLeadUiStore((s) => s.openEditDialog);
  const openLogDialog = useLeadUiStore((s) => s.openLogDialog);
  const { can } = usePermissions();
  const canMerge = can("lead.merge");

  // A lead merged away 404s with the survivor's id: show the survivor instead.
  const requestedLead = useLead(selectedLeadId ?? undefined);
  const mergedIntoId = mergedIntoIdOf(requestedLead.error);
  const leadId = mergedIntoId ?? selectedLeadId ?? undefined;
  const { data: lead, isLoading, isError } = useLead(leadId);
  const { data: notes } = useLeadNotes(leadId);
  const { data: activities } = useLeadActivities(leadId);
  const { data: duplicates } = useLeadDuplicates(leadId, canMerge && Boolean(lead));
  const archiveLead = useArchiveLead();
  const restoreLead = useRestoreLead();
  const createNote = useCreateLeadNote(leadId ?? "");
  const [noteDraft, setNoteDraft] = useState("");
  const [mergeWith, setMergeWith] = useState<LeadDuplicate | null>(null);
  const openDrawer = useLeadUiStore((s) => s.openDrawer);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const noteItems = Array.isArray(notes) ? notes : [];
  const activityItems = Array.isArray(activities) ? activities : [];

  const handleClose = () => {
    closeDrawer();
    setNoteDraft("");

    if (searchParams.get("id")) {
      const params = new URLSearchParams(searchParams.toString());
      params.delete("id");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }
  };

  /** Switch the drawer (and a shared ?id= link) to another lead. */
  const showLead = (id: string) => {
    openDrawer(id);
    if (searchParams.get("id")) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("id", id);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  };

  const handleMerged = (survivorId: string) => {
    setMergeWith(null);
    if (survivorId !== leadId) showLead(survivorId);
  };

  const handleAddNote = async () => {
    const content = noteDraft.trim();
    if (!content || !leadId) return;
    await createNote.mutateAsync(content);
    setNoteDraft("");
  };

  const interest = lead ? getPrimaryProjectInterest(lead) : null;

  return (
    <Sheet open={drawerOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent className="flex h-full w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        {isLoading ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : isError || !lead ? (
          <div className="p-6">
            <SheetHeader>
              <SheetTitle>Lead unavailable</SheetTitle>
              <SheetDescription>
                This lead could not be loaded.
              </SheetDescription>
            </SheetHeader>
          </div>
        ) : (
          <>
            <SheetHeader className="shrink-0 space-y-3 border-b border-border/60 px-6 pt-6 pr-12 pb-4 text-left">
              <div className="space-y-2">
                <SheetTitle className="text-lg leading-tight">
                  {lead.fullName}
                </SheetTitle>
                <SheetDescription>{lead.pipeline.name}</SheetDescription>
                <div className="flex flex-wrap items-center gap-1.5">
                  <LeadStageBadge
                    stage={lead.stage}
                    archived={lead.status === "ARCHIVED"}
                  />
                  {!lead.stage.isClosed && lead.status === "OPEN" ? (
                    <HeatBadge heat={lead.heat} />
                  ) : null}
                  {lead.lostReason ? (
                    <span className="text-xs text-muted-foreground">
                      {lead.lostReason.name}
                      {lead.lostNote ? ` — ${lead.lostNote}` : ""}
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {can("lead.update") && lead.status === "OPEN" ? (
                  <Button
                    type="button"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      openLogDialog({ leadId: lead.id, leadName: lead.fullName });
                    }}
                  >
                    <AppIcons.phone className="size-3.5" />
                    Log activity
                  </Button>
                ) : null}
                {can("lead.update") ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={(event) => {
                      event.stopPropagation();
                      openEditDialog(lead.id);
                    }}
                  >
                    Edit
                  </Button>
                ) : null}
                {can("lead.assign") && lead.status === "OPEN" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={(event) => {
                      event.stopPropagation();
                      openAssignDialog([lead.id]);
                    }}
                  >
                    <AppIcons.userPlus className="size-3.5" />
                    Assign
                  </Button>
                ) : null}
                {can("lead.update") && lead.status === "OPEN" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={(event) => {
                      event.stopPropagation();
                      openMoveStageDialog([lead.id], lead.pipeline.id);
                    }}
                  >
                    <AppIcons.stageChange className="size-3.5" />
                    Move stage
                  </Button>
                ) : null}
                {can("lead.update") && lead.status === "OPEN" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void archiveLead.mutateAsync(lead.id)}
                    disabled={archiveLead.isPending}
                  >
                    Archive
                  </Button>
                ) : null}
                {can("lead.update") && lead.status === "ARCHIVED" ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void restoreLead.mutateAsync(lead.id)}
                    disabled={restoreLead.isPending}
                  >
                    Restore
                  </Button>
                ) : null}
              </div>
            </SheetHeader>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="space-y-6 px-6 py-4 pb-8">
                {mergedIntoId ? (
                  <p className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
                    <AppIcons.merge className="size-3.5 shrink-0 text-primary" />
                    The lead you opened was merged into this one.
                  </p>
                ) : null}

                {canMerge && duplicates && duplicates.items.length > 0 ? (
                  <PossibleDuplicates
                    items={duplicates.items}
                    onMerge={(duplicate) => setMergeWith(duplicate)}
                  />
                ) : null}

                <LeadDealSection lead={lead} />

                <LeadNextSteps lead={lead} />

                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Contact
                  </h3>
                  <div className="rounded-lg border bg-muted/15 p-3 text-sm">
                    <dl className="space-y-1.5">
                      <ContactRow label="Phone">
                        <MaskedContact leadId={lead.id} field="primaryPhone" masked={lead.primaryPhone} />
                      </ContactRow>
                      {lead.secondaryPhone ? (
                        <ContactRow label="Second">
                          <MaskedContact leadId={lead.id} field="secondaryPhone" masked={lead.secondaryPhone} />
                        </ContactRow>
                      ) : null}
                      <ContactRow label="Email">
                        {lead.email ? (
                          <MaskedContact leadId={lead.id} field="email" masked={lead.email} />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </ContactRow>
                    </dl>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>Last contact {formatLastContacted(lead.lastContactedAt)}</span>
                      <span>
                        {lead.contactAttempts} attempt{lead.contactAttempts === 1 ? "" : "s"}
                        {lead.unansweredStreak > 0
                          ? ` · ${lead.unansweredStreak} unanswered in a row`
                          : ""}
                      </span>
                      <span>In stage {formatRelativeTime(lead.stageEnteredAt).replace(/ ago$/, "")}</span>
                    </div>
                  </div>
                </section>

                <section className="grid grid-cols-2 gap-3 text-sm">
                  <InfoItem label="Source" value={lead.source?.name ?? "—"} />
                  <InfoItem
                    label="Agent"
                    value={
                      lead.assignee ? (
                        <LeadAssigneeCell assignee={lead.assignee} />
                      ) : (
                        <span className="text-amber-700 dark:text-amber-400">
                          Unassigned
                        </span>
                      )
                    }
                  />
                  <InfoItem
                    label="Project"
                    value={
                      interest
                        ? `${interest.project.name}${
                            lead.projectInterests.length > 1
                              ? ` +${lead.projectInterests.length - 1}`
                              : ""
                          }`
                        : "—"
                    }
                  />
                  <InfoItem
                    label="Created"
                    value={formatRelativeTime(lead.createdAt)}
                  />
                </section>

                <LeadProfileSummary lead={lead} />

                <LeadFiles leadId={lead.id} />

                {can("lead-note.read") ? (
                  <section className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Notes
                    </h3>
                    {can("lead-note.create") && lead.status === "OPEN" ? (
                      <div className="flex gap-2">
                        <Input
                          value={noteDraft}
                          onChange={(event) => setNoteDraft(event.target.value)}
                          placeholder="Add a note..."
                          className="h-9 text-sm"
                        />
                        <Button
                          type="button"
                          size="sm"
                          disabled={!noteDraft.trim() || createNote.isPending}
                          onClick={() => void handleAddNote()}
                        >
                          Add
                        </Button>
                      </div>
                    ) : lead.status === "ARCHIVED" ? (
                      <p className="text-xs text-muted-foreground">
                        Restore this lead to add notes.
                      </p>
                    ) : null}
                    <div className="space-y-2">
                      {noteItems.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          No notes yet.
                        </p>
                      ) : null}
                      {noteItems.map((note) => (
                        <div
                          key={note.id}
                          className="rounded-lg border bg-card p-3 text-sm"
                        >
                          <p className="whitespace-pre-wrap">{note.content}</p>
                          <p className="mt-2 text-[10px] text-muted-foreground">
                            {note.author.email} ·{" "}
                            {formatRelativeTime(note.createdAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Activity
                  </h3>
                  <div className="space-y-2">
                    {activityItems.length === 0 ? (
                      <p className="text-xs text-muted-foreground">
                        No activity yet.
                      </p>
                    ) : null}
                    {activityItems.map((activity) => {
                      const entry = describeLeadActivity(activity);
                      const Icon = entry.channel
                        ? CHANNEL_ICONS[entry.channel]
                        : TIMELINE_ICONS[entry.kind];
                      return (
                        <div
                          key={activity.id}
                          className="flex items-start gap-2.5 rounded-lg border bg-card p-3"
                        >
                          <div
                            className={cn(
                              "flex size-7 shrink-0 items-center justify-center rounded-md",
                              TONE_CLASSES[entry.tone],
                            )}
                          >
                            <Icon className="size-3.5" stroke={2} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-medium">{entry.title}</p>
                            {entry.detail ? (
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {entry.detail}
                              </p>
                            ) : null}
                            <p className="mt-0.5 text-[10px] text-muted-foreground">
                              {activity.actor?.email ?? "System"} ·{" "}
                              {formatRelativeTime(activity.createdAt)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              </div>
            </div>

            {canMerge && duplicates ? (
              <MergeLeadsDialog
                lead={lead}
                leadCounts={duplicates.counts}
                duplicate={mergeWith}
                onClose={() => setMergeWith(null)}
                onMerged={handleMerged}
              />
            ) : null}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

const TONE_CLASSES: Record<TimelineTone, string> = {
  default: "bg-sky-500/12 text-sky-700 dark:text-sky-400",
  positive: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
  negative: "bg-destructive/10 text-destructive",
  muted: "bg-muted text-muted-foreground",
  accent: "bg-primary/12 text-primary",
};

const TIMELINE_ICONS = {
  created: AppIcons.userPlus,
  assignment: AppIcons.userPlus,
  stage: AppIcons.stageChange,
  note: AppIcons.edit,
  project: AppIcons.projects,
  interaction: AppIcons.phone,
  task: AppIcons.clock,
  status: AppIcons.archive,
  file: AppIcons.files,
  contact: AppIcons.eye,
  merge: AppIcons.merge,
  deal: AppIcons.deals,
  other: AppIcons.activity,
} as const;

/** Compact "same person?" notice; each match can be merged from here. */
function PossibleDuplicates({
  items,
  onMerge,
}: {
  items: LeadDuplicate[];
  onMerge: (duplicate: LeadDuplicate) => void;
}) {
  return (
    <section className="space-y-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
        <AppIcons.alertTriangle className="size-3.5" />
        Possible duplicates ({items.length})
      </h3>
      <ul className="space-y-1.5">
        {items.map((item) => {
          const counts = formatMergeCounts(item.counts);
          return (
            <li key={item.id} className="flex items-center gap-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{item.fullName}</p>
                <p className="truncate text-xs text-muted-foreground">
                  Same {item.matchedOn.join(" & ")} · {item.stage.name} ·{" "}
                  {item.assignee?.name ?? "Unassigned"}
                  {counts ? ` · ${counts}` : ""}
                </p>
              </div>
              <Button
                type="button"
                size="xs"
                variant="outline"
                onClick={() => onMerge(item)}
              >
                <AppIcons.merge />
                Merge
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function ContactRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-7 items-center gap-3">
      <dt className="w-14 shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd className="min-w-0 flex-1">{children}</dd>
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-muted/10 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  );
}
