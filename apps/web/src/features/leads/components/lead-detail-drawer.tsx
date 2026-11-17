"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
import { LeadFollowUpsSection } from "@/features/leads/components/lead-follow-ups-section";
import { LeadTimelineItem } from "@/features/leads/components/lead-timeline-item";
import { LogActivityDialog } from "@/features/leads/components/log-activity-dialog";
import type { InteractionType } from "@/features/leads/types";
import { toWhatsAppUrl } from "@/features/leads/utils/whatsapp";
import { useDefaultDialCode } from "@/features/tenant-settings/hooks";
import { formatDueDate } from "@/features/tasks/utils";
import { formatRelativeTime } from "@/lib/format";
import { toast } from "@/lib/toast";
import { usePermissions } from "@/hooks/use-permissions";

export function LeadDetailDrawer() {
  const drawerOpen = useLeadUiStore((s) => s.drawerOpen);
  const selectedLeadId = useLeadUiStore((s) => s.selectedLeadId);
  const closeDrawer = useLeadUiStore((s) => s.closeDrawer);
  const openAssignDialog = useLeadUiStore((s) => s.openAssignDialog);
  const openMoveStageDialog = useLeadUiStore((s) => s.openMoveStageDialog);
  const openEditDialog = useLeadUiStore((s) => s.openEditDialog);
  const { can } = usePermissions();

  const { data: lead, isLoading, isError } = useLead(selectedLeadId ?? undefined);
  const { data: notes } = useLeadNotes(selectedLeadId ?? undefined);
  const { data: activities } = useLeadActivities(selectedLeadId ?? undefined);
  const archiveLead = useArchiveLead();
  const restoreLead = useRestoreLead();
  const createNote = useCreateLeadNote(selectedLeadId ?? "");
  const [noteDraft, setNoteDraft] = useState("");
  const [loggingType, setLoggingType] = useState<InteractionType | null>(null);
  const tActivity = useTranslations("activity.actions");
  const tTasks = useTranslations("tasks.section");
  const dialCode = useDefaultDialCode();
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

  const handleAddNote = async () => {
    const content = noteDraft.trim();
    if (!content || !selectedLeadId) return;
    await createNote.mutateAsync(content);
    setNoteDraft("");
  };

  const copyPhone = async (phone: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      toast.success("Copied");
    } catch {
      toast.error("Copy failed");
    }
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
                <div>
                  <LeadStageBadge
                    stage={lead.stage}
                    archived={lead.status === "ARCHIVED"}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
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

              {can("lead-activity.create") && lead.status === "OPEN" ? (
                <div className="grid grid-cols-4 gap-1.5">
                  <QuickActionButton
                    icon={AppIcons.phone}
                    label={tActivity("call")}
                    onClick={() => setLoggingType("CALL")}
                  />
                  <QuickActionButton
                    icon={AppIcons.whatsapp}
                    label={tActivity("whatsapp")}
                    onClick={() => {
                      window.open(
                        toWhatsAppUrl(lead.primaryPhone, dialCode),
                        "_blank",
                        "noopener,noreferrer",
                      );
                      setLoggingType("WHATSAPP");
                    }}
                  />
                  <QuickActionButton
                    icon={AppIcons.users}
                    label={tActivity("meeting")}
                    onClick={() => setLoggingType("MEETING")}
                  />
                  <QuickActionButton
                    icon={AppIcons.mapPin}
                    label={tActivity("visit")}
                    onClick={() => setLoggingType("SITE_VISIT")}
                  />
                </div>
              ) : null}
            </SheetHeader>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="space-y-6 px-6 py-4 pb-8">
                <section className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Contact
                  </h3>
                  <div className="rounded-lg border bg-muted/15 p-3 text-sm">
                    <div className="flex items-center gap-1">
                      <a
                        href={`tel:${lead.primaryPhone}`}
                        className="tabular-nums hover:underline"
                      >
                        {lead.primaryPhone}
                      </a>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        className="size-5"
                        onClick={() => void copyPhone(lead.primaryPhone)}
                        aria-label="Copy phone"
                      >
                        <AppIcons.copy className="size-2.5" />
                      </Button>
                    </div>
                    {lead.secondaryPhone ? (
                      <p className="mt-1 tabular-nums text-muted-foreground">
                        {lead.secondaryPhone}
                      </p>
                    ) : null}
                    <p className="text-muted-foreground">
                      {lead.email ?? "No email"}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Last contacted {formatLastContacted(lead.lastContactedAt)}
                    </p>
                    {lead.nextFollowUpAt ? (
                      <p className="text-xs text-muted-foreground">
                        {tTasks("due", { when: formatDueDate(lead.nextFollowUpAt) })}
                      </p>
                    ) : null}
                  </div>
                </section>

                <LeadFollowUpsSection
                  leadId={lead.id}
                  leadOpen={lead.status === "OPEN"}
                />

                <section className="grid grid-cols-2 gap-3 text-sm">
                  <InfoItem label="Source" value={lead.source?.name ?? "—"} />
                  <InfoItem
                    label="Agent"
                    value={
                      lead.assignee ? (
                        <LeadAssigneeCell assignee={lead.assignee} />
                      ) : (
                        <span className="text-amber-600 dark:text-amber-400">
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

                {lead.projectInterests.length > 1 ? (
                  <section className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Interested projects
                    </h3>
                    <ul className="space-y-1.5">
                      {lead.projectInterests.map((item) => (
                        <li
                          key={item.projectId}
                          className="flex items-center justify-between rounded-md border bg-card px-3 py-2 text-sm"
                        >
                          <span className="truncate">{item.project.name}</span>
                          {item.interestLevel ? (
                            <span className="text-[11px] font-medium text-muted-foreground">
                              {item.interestLevel}
                            </span>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  </section>
                ) : null}

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
                    {activityItems.map((activity) => (
                      <LeadTimelineItem key={activity.id} activity={activity} />
                    ))}
                  </div>
                </section>
              </div>
            </div>
          </>
        )}
      </SheetContent>
      <LogActivityDialog
        lead={lead && loggingType ? { id: lead.id, fullName: lead.fullName } : null}
        type={loggingType}
        onClose={() => setLoggingType(null)}
      />
    </Sheet>
  );
}

function QuickActionButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof AppIcons.phone;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-1 rounded-lg border bg-card px-2 py-2 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
    >
      <Icon className="size-4" />
      {label}
    </button>
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
