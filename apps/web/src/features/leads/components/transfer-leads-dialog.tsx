"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  IconAlertTriangle,
  IconArrowRight,
  IconChecklist,
  IconFlame,
  IconScale,
  IconSquareRoundedCheckFilled,
  IconUsers,
} from "@tabler/icons-react";
import { StageBadge } from "@/components/crm/stage-visuals";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getTeamWorkload,
  previewTransfer,
  type TransferInput,
  type TransferPreview,
  type UserWorkload,
} from "@/features/leads/api";
import { useBulkTransferLeads } from "@/features/leads/mutations";
import { useLeadUiStore } from "@/features/leads/stores/lead-ui-store";
import type { LeadSelectionFilters } from "@/features/leads/types";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePermissions } from "@/hooks/use-permissions";
import { formatNumber, getInitials } from "@/lib/format";
import { cn } from "@/lib/utils";

type Scope = "all" | "overdue" | "none" | "hot";

const SCOPES: Array<{ value: Scope; label: string; hint: string }> = [
  { value: "all", label: "All open leads", hint: "Everything they're working on" },
  { value: "overdue", label: "Overdue only", hint: "Follow-ups they're late on" },
  { value: "none", label: "No next step", hint: "Leads nobody is planning for" },
  { value: "hot", label: "Hot only", hint: "Visits, offers, negotiations" },
];

function scopeFilters(scope: Scope): LeadSelectionFilters | undefined {
  switch (scope) {
    case "overdue":
      return { nextStep: "overdue" };
    case "none":
      return { nextStep: "none" };
    case "hot":
      return { heat: ["HOT"] };
    default:
      return undefined;
  }
}

function scopeCount(user: UserWorkload | undefined, scope: Scope): number {
  if (!user) return 0;
  return scope === "overdue"
    ? user.overdue
    : scope === "none"
      ? user.noNextStep
      : scope === "hot"
        ? user.hotLeads
        : user.openLeads;
}

/**
 * Move someone's work to the rest of the team: pick whose leads, which of
 * them, and who takes them (one person, an even split, or balanced by current
 * load). A live preview shows exactly what moves — stages, hot, overdue, open
 * tasks — and where each person ends up before anything changes.
 */
export function TransferLeadsDialog() {
  const open = useLeadUiStore((s) => s.transferDialogOpen);
  const close = useLeadUiStore((s) => s.closeTransferDialog);
  const transfer = useBulkTransferLeads();
  const { can } = usePermissions();

  const [fromUserId, setFromUserId] = useState<string | null>(null);
  const [toUserIds, setToUserIds] = useState<string[]>([]);
  const [scope, setScope] = useState<Scope>("all");
  const [distribution, setDistribution] = useState<"EVEN" | "BALANCE">("EVEN");

  const workload = useQuery({
    queryKey: ["leads", "workload"],
    queryFn: getTeamWorkload,
    enabled: open,
    staleTime: 30_000,
  });
  const team = useMemo(
    () => [...(workload.data ?? [])].sort((a, b) => b.openLeads - a.openLeads),
    [workload.data],
  );
  const from = team.find((user) => user.userId === fromUserId);

  const input: TransferInput | null =
    fromUserId && toUserIds.length > 0
      ? { fromUserId, toUserIds, distribution, filters: scopeFilters(scope) }
      : null;
  const debouncedInput = useDebouncedValue(input, 250);
  const preview = useQuery({
    queryKey: ["leads", "transfer-preview", debouncedInput],
    queryFn: () => previewTransfer(debouncedInput!),
    enabled: open && debouncedInput !== null,
    placeholderData: (previous) => previous,
  });

  const handleClose = () => {
    close();
    setFromUserId(null);
    setToUserIds([]);
    setScope("all");
    setDistribution("EVEN");
  };

  const handleSubmit = async () => {
    if (!input) return;
    try {
      await transfer.mutateAsync(input);
      handleClose();
    } catch {
      // toast handled by useApiMutation
    }
  };

  if (!can("lead.assign")) return null;

  const moving = input ? (preview.data?.leadCount ?? null) : null;
  const allocationById = new Map((preview.data?.allocations ?? []).map((a) => [a.userId, a]));

  return (
    <Dialog open={open} onOpenChange={(next) => !next && handleClose()}>
      <DialogContent className="sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>Transfer leads</DialogTitle>
          <DialogDescription>
            Hand someone&apos;s leads to the team — when they leave, go on leave or have too much.
            Open next steps move with each lead; won and lost leads stay put.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-5">
            <Step number={1} title="Whose leads?">
              {workload.isLoading ? (
                <ListSkeleton />
              ) : (
                <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                  {team.map((user) => (
                    <PersonRow
                      key={user.userId}
                      user={user}
                      selected={fromUserId === user.userId}
                      onClick={() => {
                        setFromUserId(user.userId);
                        setToUserIds((ids) => ids.filter((id) => id !== user.userId));
                      }}
                      detail={<WorkloadChips user={user} />}
                    />
                  ))}
                </div>
              )}
            </Step>

            <Step number={2} title="Which of their leads?">
              <div className="grid grid-cols-2 gap-1.5">
                {SCOPES.map((option) => {
                  const active = scope === option.value;
                  const count = scopeCount(from, option.value);
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setScope(option.value)}
                      className={cn(
                        "rounded-lg border px-3 py-2 text-left transition-colors duration-fast ease-enter",
                        active ? "border-primary bg-primary/[0.06]" : "hover:bg-muted/60",
                      )}
                    >
                      <span className="flex items-center justify-between gap-2 text-sm font-medium">
                        {option.label}
                        {from ? (
                          <span className="text-xs text-muted-foreground tabular-nums">{count}</span>
                        ) : null}
                      </span>
                      <span className="block text-xs text-muted-foreground">{option.hint}</span>
                    </button>
                  );
                })}
              </div>
            </Step>
          </div>

          <div className="space-y-5">
            <Step number={3} title="Who takes them?">
              {workload.isLoading ? (
                <ListSkeleton />
              ) : (
                <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                  {team
                    .filter((user) => user.userId !== fromUserId)
                    .map((user) => {
                      const selected = toUserIds.includes(user.userId);
                      const allocation = allocationById.get(user.userId);
                      return (
                        <PersonRow
                          key={user.userId}
                          user={user}
                          multi
                          selected={selected}
                          onClick={() =>
                            setToUserIds((ids) =>
                              selected ? ids.filter((id) => id !== user.userId) : [...ids, user.userId],
                            )
                          }
                          detail={
                            <span className="text-xs text-muted-foreground tabular-nums">
                              {user.openLeads} open
                              {selected && allocation ? (
                                <>
                                  <IconArrowRight className="mx-1 inline size-3" />
                                  <span className="font-medium text-foreground">
                                    {user.openLeads + allocation.leadCount}
                                  </span>
                                  <span className="text-primary"> (+{allocation.leadCount})</span>
                                </>
                              ) : null}
                            </span>
                          }
                        />
                      );
                    })}
                </div>
              )}
              {toUserIds.length > 1 ? (
                <div className="mt-2 grid grid-cols-2 gap-1.5">
                  <DistributionOption
                    active={distribution === "EVEN"}
                    onClick={() => setDistribution("EVEN")}
                    icon={<IconUsers className="size-4" />}
                    title="Split evenly"
                    hint="Same number each; hot leads shared fairly"
                  />
                  <DistributionOption
                    active={distribution === "BALANCE"}
                    onClick={() => setDistribution("BALANCE")}
                    icon={<IconScale className="size-4" />}
                    title="Balance workload"
                    hint="Fill up whoever has the fewest leads"
                  />
                </div>
              ) : null}
            </Step>

            <TransferSummary
              hasSource={Boolean(from)}
              hasRecipients={toUserIds.length > 0}
              loading={preview.isFetching && !preview.data}
              preview={input ? preview.data : undefined}
              fromName={from?.name}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!input || !moving || transfer.isPending || preview.isFetching}
          >
            {transfer.isPending
              ? "Transferring…"
              : moving
                ? `Transfer ${formatNumber(moving)} lead${moving === 1 ? "" : "s"}`
                : "Transfer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-medium">
        <span className="flex size-5 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
          {number}
        </span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function PersonRow({
  user,
  selected,
  multi = false,
  onClick,
  detail,
}: {
  user: UserWorkload;
  selected: boolean;
  multi?: boolean;
  onClick: () => void;
  detail: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role={multi ? "checkbox" : "radio"}
      aria-checked={selected}
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg border px-2.5 py-2 text-left transition-colors duration-fast ease-enter",
        selected ? "border-primary bg-primary/[0.06]" : "border-transparent hover:bg-muted/60",
      )}
    >
      <Avatar size="sm" className="size-7">
        <AvatarFallback className="text-[10px] font-medium">{getInitials(user.name)}</AvatarFallback>
      </Avatar>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-sm font-medium">{user.name}</span>
          {user.role ? <span className="text-[11px] text-muted-foreground">{user.role}</span> : null}
        </span>
        <span className="block">{detail}</span>
      </span>
      {selected ? <IconSquareRoundedCheckFilled className="size-4 shrink-0 text-primary" /> : null}
    </button>
  );
}

function WorkloadChips({ user }: { user: UserWorkload }) {
  return (
    <span className="flex flex-wrap items-center gap-x-2.5 text-xs text-muted-foreground tabular-nums">
      <span>{user.openLeads} open</span>
      {user.hotLeads > 0 ? (
        <span className="inline-flex items-center gap-0.5 text-rose-700 dark:text-rose-400">
          <IconFlame className="size-3" />
          {user.hotLeads}
        </span>
      ) : null}
      {user.overdue > 0 ? (
        <span className="inline-flex items-center gap-0.5 text-destructive">
          <IconAlertTriangle className="size-3" />
          {user.overdue} overdue
        </span>
      ) : null}
      {user.noNextStep > 0 ? (
        <span className="text-amber-700 dark:text-amber-400">{user.noNextStep} no next step</span>
      ) : null}
    </span>
  );
}

function DistributionOption({
  active,
  onClick,
  icon,
  title,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-lg border px-3 py-2 text-left transition-colors duration-fast ease-enter",
        active ? "border-primary bg-primary/[0.06]" : "hover:bg-muted/60",
      )}
    >
      <span className="flex items-center gap-1.5 text-sm font-medium">
        <span className={active ? "text-primary" : "text-muted-foreground"}>{icon}</span>
        {title}
      </span>
      <span className="block text-xs text-muted-foreground">{hint}</span>
    </button>
  );
}

function TransferSummary({
  hasSource,
  hasRecipients,
  loading,
  preview,
  fromName,
}: {
  hasSource: boolean;
  hasRecipients: boolean;
  loading: boolean;
  preview: TransferPreview | undefined;
  fromName?: string;
}) {
  if (!hasSource || !hasRecipients) {
    return (
      <div className="flex h-36 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
        {!hasSource ? "Pick whose leads to move" : "Pick who takes them"}
      </div>
    );
  }
  if (loading || !preview) {
    return <Skeleton className="h-36 w-full rounded-xl" />;
  }
  if (preview.leadCount === 0) {
    return (
      <div className="flex h-36 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
        {fromName} has no leads matching this.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
      <div className="flex items-baseline gap-2">
        <span className="text-3xl font-semibold tabular-nums">{formatNumber(preview.leadCount)}</span>
        <span className="text-sm text-muted-foreground">leads move from {fromName}</span>
      </div>
      <div className="flex flex-wrap gap-1.5 text-xs">
        <SummaryChip icon={<IconFlame className="size-3.5 text-rose-600" />} label={`${preview.hotLeads} hot`} />
        <SummaryChip
          icon={<IconAlertTriangle className="size-3.5 text-destructive" />}
          label={`${preview.overdueLeads} overdue`}
        />
        <SummaryChip
          icon={<IconChecklist className="size-3.5 text-muted-foreground" />}
          label={`${preview.openTasks} open tasks move too`}
        />
      </div>
      <div className="flex flex-wrap gap-1">
        {preview.byStage.map((stage) => (
          <span key={stage.stageId} className="inline-flex items-center gap-1">
            <StageBadge stage={stage} size="xs" />
            <span className="text-[11px] text-muted-foreground tabular-nums">{stage.count}</span>
          </span>
        ))}
      </div>
      <div className="space-y-1 border-t pt-3">
        {preview.allocations.map((allocation) => (
          <div key={allocation.userId} className="flex items-center justify-between text-sm">
            <span className="truncate">{allocation.name}</span>
            <span className="text-muted-foreground tabular-nums">
              +{allocation.leadCount}
              <span className="ml-2 text-xs">
                ({allocation.currentOpenLeads} → {allocation.currentOpenLeads + allocation.leadCount})
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SummaryChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 ring-1 ring-border">
      {icon}
      {label}
    </span>
  );
}

function ListSkeleton() {
  return (
    <div className="space-y-1.5">
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
    </div>
  );
}
