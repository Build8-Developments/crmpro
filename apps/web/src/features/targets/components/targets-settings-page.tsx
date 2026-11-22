"use client";

import { useState } from "react";
import { IconBuilding, IconChevronLeft, IconChevronRight, IconCopy, IconSparkles } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TargetCell } from "@/features/targets/components/target-cell";
import {
  usePreviousTargets,
  useSaveTargets,
  useTargetSuggestions,
  useTargetsGrid,
} from "@/features/targets/hooks";
import {
  TARGET_METRICS,
  type MetricTargets,
  type MetricValues,
  type SaveTargetsInput,
  type TargetMetric,
  type TargetsGrid,
} from "@/features/targets/types";
import {
  formatPeriodLabel,
  formatPeriodShort,
  METRIC_LABELS,
  parseTargetInput,
  shiftPeriod,
} from "@/features/targets/utils/target-format";
import { getInitials } from "@/lib/format";
import { queryKeys } from "@/lib/query/query-keys";
import { toast } from "@/lib/toast";
import { cn } from "@/lib/utils";

const WORKSPACE = "workspace";

type Draft = Record<string, string>;

interface GridRow {
  /** null = the whole workspace. */
  userId: string | null;
  label: string;
  sublabel: string | null;
  targets: MetricTargets;
  actuals: MetricValues;
}

const cellKey = (userId: string | null, metric: TargetMetric) => `${userId ?? WORKSPACE}:${metric}`;

function rowsOf(grid: TargetsGrid): GridRow[] {
  const rows: GridRow[] = [];
  if (grid.workspace) {
    rows.push({
      userId: null,
      label: "Workspace",
      sublabel: "Everyone together",
      targets: grid.workspace.targets,
      actuals: grid.workspace.actuals,
    });
  }
  for (const row of grid.users) {
    rows.push({
      userId: row.user.id,
      label: row.user.name,
      sublabel: row.user.team?.name ?? row.user.roleName,
      targets: row.targets,
      actuals: row.actuals,
    });
  }
  return rows;
}

function draftOf(rows: GridRow[]): Draft {
  const draft: Draft = {};
  for (const row of rows) {
    for (const metric of TARGET_METRICS) {
      const value = row.targets[metric];
      draft[cellKey(row.userId, metric)] = value === null ? "" : String(value);
    }
  }
  return draft;
}

/** Changes the form keeps across refetches only while the saved targets are the same. */
function savedSignature(grid: TargetsGrid): string {
  return JSON.stringify([
    grid.period,
    grid.workspace?.targets ?? null,
    grid.users.map((row) => [row.user.id, row.targets]),
  ]);
}

/**
 * Settings → Leads & sales → Targets (workflow spec §2.6): monthly goals per
 * person and for the workspace, next to what was actually done that month.
 */
export function TargetsSettingsPage() {
  const [period, setPeriod] = useState<string | null>(null);
  const { data: grid, isLoading, isError, refetch, isFetching } = useTargetsGrid(period);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-5 md:px-8 md:py-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Targets</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Monthly goals for each person and the whole workspace. Deals count when reserved; revenue and
          commission when contracted. Agents see their own progress on Today.
        </p>
      </div>

      {isLoading && !grid ? (
        <div className="space-y-3">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-72 w-full" />
        </div>
      ) : isError || !grid ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-4 text-sm text-muted-foreground">
          Targets could not be loaded.
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <TargetsForm
          key={savedSignature(grid)}
          grid={grid}
          periodKey={period}
          loadingMonth={isFetching && period !== null && grid.period !== period}
          onPeriodChange={setPeriod}
        />
      )}
    </div>
  );
}

function TargetsForm({
  grid,
  periodKey,
  loadingMonth,
  onPeriodChange,
}: {
  grid: TargetsGrid;
  periodKey: string | null;
  loadingMonth: boolean;
  onPeriodChange: (period: string) => void;
}) {
  const rows = rowsOf(grid);
  const [draft, setDraft] = useState<Draft>(() => draftOf(rows));
  const queryClient = useQueryClient();
  const save = useSaveTargets();
  const suggestions = useTargetSuggestions();
  const previous = usePreviousTargets();

  const entries: SaveTargetsInput["entries"] = [];
  let invalidCount = 0;
  for (const row of rows) {
    for (const metric of TARGET_METRICS) {
      const parsed = parseTargetInput(metric, draft[cellKey(row.userId, metric)] ?? "");
      if (parsed === undefined) {
        invalidCount += 1;
        continue;
      }
      if (parsed !== row.targets[metric]) entries.push({ userId: row.userId, metric, value: parsed });
    }
  }
  const dirty = entries.length > 0 || invalidCount > 0;
  const changedKeys = new Set(entries.map((entry) => cellKey(entry.userId, entry.metric)));

  const setCell = (key: string, value: string) => setDraft((current) => ({ ...current, [key]: value }));

  const goTo = (period: string) => {
    if (dirty && !window.confirm("Discard your unsaved target changes?")) return;
    onPeriodChange(period);
  };

  const fillFromSuggestions = () =>
    suggestions.mutate(grid.period, {
      onSuccess: (result) => {
        let filled = 0;
        const next = { ...draft };
        const apply = (userId: string | null, values: Record<TargetMetric, number | null>) => {
          for (const metric of TARGET_METRICS) {
            const key = cellKey(userId, metric);
            const value = values[metric];
            if (value !== null && (next[key] ?? "") === "") {
              next[key] = String(value);
              filled += 1;
            }
          }
        };
        if (result.workspace && grid.workspace) apply(null, result.workspace);
        for (const row of result.users) apply(row.userId, row.values);
        setDraft(next);
        const months = `${formatPeriodShort(result.basedOn[0])}–${formatPeriodShort(result.basedOn[result.basedOn.length - 1], true)}`;
        if (filled === 0) toast.info("Nothing to suggest", `No empty cell has history in ${months}.`);
        else toast.success(`Filled ${filled} empty ${filled === 1 ? "cell" : "cells"}`, `Averages of ${months}. Review, then save.`);
      },
      onError: () => toast.error("Suggestions could not be loaded."),
    });

  const copyLastMonth = () =>
    previous.mutate(shiftPeriod(grid.period, -1), {
      onSuccess: (last) => {
        let copied = 0;
        const next = { ...draft };
        for (const row of rowsOf(last)) {
          for (const metric of TARGET_METRICS) {
            const key = cellKey(row.userId, metric);
            const value = row.targets[metric];
            if (value !== null && key in next) {
              next[key] = String(value);
              copied += 1;
            }
          }
        }
        setDraft(next);
        if (copied === 0) toast.info(`No targets were set for ${formatPeriodLabel(last.period)}.`);
        else toast.success(`Copied ${copied} ${copied === 1 ? "target" : "targets"} from ${formatPeriodLabel(last.period)}`, "Review, then save.");
      },
      onError: () => toast.error("Last month's targets could not be loaded."),
    });

  const submit = () => {
    if (entries.length === 0 || invalidCount > 0) return;
    save.mutate(
      { period: grid.period, entries },
      { onSuccess: (data) => queryClient.setQueryData(queryKeys.targets.grid(periodKey), data) },
    );
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Previous month"
            onClick={() => goTo(shiftPeriod(periodKey ?? grid.period, -1))}
          >
            <IconChevronLeft />
          </Button>
          <div className="min-w-36 px-2 text-center text-sm font-medium tabular-nums" aria-live="polite">
            {formatPeriodLabel(periodKey ?? grid.period)}
            {loadingMonth ? <span className="ml-1 text-muted-foreground">…</span> : null}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            aria-label="Next month"
            onClick={() => goTo(shiftPeriod(periodKey ?? grid.period, 1))}
          >
            <IconChevronRight />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={fillFromSuggestions} disabled={suggestions.isPending}>
            <IconSparkles />
            {suggestions.isPending ? "Suggesting..." : "Suggest from last 3 months"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={copyLastMonth} disabled={previous.isPending}>
            <IconCopy />
            {previous.isPending ? "Copying..." : "Copy last month"}
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
          Nobody you manage can hold leads yet.
        </p>
      ) : (
        <>
          {/* Desktop: one row per person, one column per metric. */}
          <div className="hidden overflow-x-auto rounded-xl border border-border/60 bg-card md:block">
            <table className="w-full min-w-[880px] text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                  <th className="sticky left-0 z-10 w-56 bg-card px-4 py-2.5 font-medium">Person</th>
                  {TARGET_METRICS.map((metric) => (
                    <th key={metric} className="px-3 py-2.5 text-right font-medium">
                      {METRIC_LABELS[metric]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={row.userId ?? WORKSPACE}
                    className={cn("border-b border-border/40 last:border-0", row.userId === null && "bg-muted/30")}
                  >
                    <td className={cn("sticky left-0 z-10 px-4 py-3 align-top", row.userId === null ? "bg-muted/30" : "bg-card")}>
                      <RowIdentity row={row} />
                    </td>
                    {TARGET_METRICS.map((metric) => {
                      const key = cellKey(row.userId, metric);
                      return (
                        <td key={metric} className="px-3 py-3 align-top">
                          <TargetCell
                            metric={metric}
                            value={draft[key] ?? ""}
                            actual={row.actuals[metric]}
                            currency={grid.currency}
                            changed={changedKeys.has(key)}
                            ownerLabel={row.label}
                            onChange={(value) => setCell(key, value)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Phones: one card per person. */}
          <div className="space-y-3 md:hidden">
            {rows.map((row) => (
              <section
                key={row.userId ?? WORKSPACE}
                className={cn("rounded-xl border border-border/60 p-3", row.userId === null ? "bg-muted/30" : "bg-card")}
              >
                <RowIdentity row={row} />
                <div className="mt-3 space-y-3">
                  {TARGET_METRICS.map((metric) => {
                    const key = cellKey(row.userId, metric);
                    return (
                      <div key={metric} className="grid grid-cols-[96px_minmax(0,1fr)] items-start gap-3">
                        <span className="pt-2 text-xs font-medium text-muted-foreground">{METRIC_LABELS[metric]}</span>
                        <TargetCell
                          metric={metric}
                          value={draft[key] ?? ""}
                          actual={row.actuals[metric]}
                          currency={grid.currency}
                          changed={changedKeys.has(key)}
                          ownerLabel={row.label}
                          onChange={(value) => setCell(key, value)}
                        />
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </>
      )}

      <p className="text-[11px] text-muted-foreground">
        Revenue and commission in {grid.currency}. Leave a cell empty for no target.
      </p>

      {dirty ? (
        <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-card/95 px-4 py-2.5 shadow-md backdrop-blur">
          <span className="text-xs text-muted-foreground">
            {invalidCount > 0
              ? `${invalidCount} ${invalidCount === 1 ? "value needs" : "values need"} fixing (whole numbers for counts, no negatives).`
              : `${entries.length} unsaved ${entries.length === 1 ? "change" : "changes"} for ${formatPeriodLabel(grid.period)}`}
          </span>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setDraft(draftOf(rows))}>
              Discard
            </Button>
            <Button type="submit" size="sm" disabled={invalidCount > 0 || entries.length === 0 || save.isPending}>
              {save.isPending ? "Saving..." : "Save targets"}
            </Button>
          </div>
        </div>
      ) : null}
    </form>
  );
}

function RowIdentity({ row }: { row: GridRow }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {row.userId === null ? (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <IconBuilding className="size-4" stroke={1.75} />
        </div>
      ) : (
        <Avatar>
          <AvatarFallback className="text-[11px] font-medium">{getInitials(row.label)}</AvatarFallback>
        </Avatar>
      )}
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{row.label}</div>
        {row.sublabel ? <div className="truncate text-xs text-muted-foreground">{row.sublabel}</div> : null}
      </div>
    </div>
  );
}
