"use client";

import { useState } from "react";
import Link from "next/link";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useSaveSourceSpend, useSourceSpend } from "@/features/source-spend/hooks";
import type { SaveSourceSpendInput, SourceSpendGrid, SpendCell } from "@/features/source-spend/types";
import {
  formatCompactMoney,
  formatMoney,
  formatPeriodLabel,
  formatPeriodShort,
  shiftPeriod,
} from "@/features/targets/utils/target-format";
import { usePermissions } from "@/hooks/use-permissions";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

type Draft = Record<string, string>;

const cellKey = (sourceId: string, period: string) => `${sourceId}:${period}`;

/** "" → null, invalid → undefined. */
function parseAmount(raw: string): number | null | undefined {
  const cleaned = raw.replace(/[,\s]/g, "");
  if (cleaned === "") return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value < 0 || Math.round(value * 100) !== value * 100) return undefined;
  return value;
}

function draftOf(grid: SourceSpendGrid): Draft {
  const draft: Draft = {};
  for (const row of grid.sources) {
    for (const cell of row.months) {
      draft[cellKey(row.source.id, cell.period)] = cell.amount === null ? "" : String(cell.amount);
    }
  }
  return draft;
}

function savedSignature(grid: SourceSpendGrid): string {
  return JSON.stringify([
    grid.periods,
    grid.sources.map((row) => [row.source.id, row.months.map((cell) => cell.amount)]),
  ]);
}

/**
 * Settings → Leads & sales → Marketing spend (workflow spec §2.7): what each
 * lead source cost per month, and what it produced for that money.
 */
export function SpendSettingsPage() {
  const [to, setTo] = useState<string | null>(null);
  const { data: grid, isLoading, isError, refetch } = useSourceSpend(to);

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-5 md:px-8 md:py-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Marketing spend</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Enter what you spent on each lead source per month to see cost per lead, per site visit and per deal.
          Sources are managed in{" "}
          <Link href="/settings/lead-sources" className="underline underline-offset-2 hover:text-foreground">
            Lead sources
          </Link>
          .
        </p>
      </div>

      {isLoading && !grid ? (
        <div className="space-y-3">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : isError || !grid ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-4 text-sm text-muted-foreground">
          Marketing spend could not be loaded.
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <SpendForm key={savedSignature(grid)} grid={grid} windowEnd={to ?? grid.to} onWindowChange={setTo} />
      )}
    </div>
  );
}

function SpendForm({
  grid,
  windowEnd,
  onWindowChange,
}: {
  grid: SourceSpendGrid;
  windowEnd: string;
  onWindowChange: (to: string) => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => draftOf(grid));
  const [selected, setSelected] = useState(grid.periods[grid.periods.length - 1]);
  const { can } = usePermissions();
  const canEdit = can("spend.manage");
  const save = useSaveSourceSpend();

  const entries: SaveSourceSpendInput["entries"] = [];
  let invalidCount = 0;
  for (const row of grid.sources) {
    for (const cell of row.months) {
      const parsed = parseAmount(draft[cellKey(row.source.id, cell.period)] ?? "");
      if (parsed === undefined) invalidCount += 1;
      else if (parsed !== cell.amount) entries.push({ sourceId: row.source.id, period: cell.period, amount: parsed });
    }
  }
  const dirty = entries.length > 0 || invalidCount > 0;
  const selectedPeriod = grid.periods.includes(selected) ? selected : grid.periods[grid.periods.length - 1];
  const selectedIndex = grid.periods.indexOf(selectedPeriod);

  const moveWindow = (delta: number) => {
    if (dirty && !window.confirm("Discard your unsaved spend changes?")) return;
    onWindowChange(shiftPeriod(windowEnd, delta));
  };

  return (
    <form
      className="space-y-8"
      onSubmit={(event) => {
        event.preventDefault();
        if (entries.length > 0 && invalidCount === 0) save.mutate({ entries });
      }}
    >
      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            <Button type="button" variant="outline" size="icon-sm" aria-label="Earlier months" onClick={() => moveWindow(-1)}>
              <IconChevronLeft />
            </Button>
            <div className="min-w-40 px-2 text-center text-sm font-medium">
              {formatPeriodShort(grid.from, true)} – {formatPeriodShort(grid.to, true)}
            </div>
            <Button type="button" variant="outline" size="icon-sm" aria-label="Later months" onClick={() => moveWindow(1)}>
              <IconChevronRight />
            </Button>
          </div>
          <span className="text-xs text-muted-foreground">Amounts in {grid.currency}</span>
        </div>

        {grid.sources.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
            Add lead sources first, then enter what each one costs.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/60 bg-card">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                  <th className="sticky left-0 z-10 w-44 bg-card px-4 py-2.5 font-medium">Source</th>
                  {grid.periods.map((period) => (
                    <th key={period} className="px-2 py-2.5 text-right font-medium">
                      {formatPeriodShort(period, true)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grid.sources.map((row) => (
                  <tr key={row.source.id} className="border-b border-border/40">
                    <td className="sticky left-0 z-10 truncate bg-card px-4 py-2.5 font-medium">{row.source.name}</td>
                    {row.months.map((cell) => {
                      const key = cellKey(row.source.id, cell.period);
                      const value = draft[key] ?? "";
                      const parsed = parseAmount(value);
                      return (
                        <td key={cell.period} className="px-2 py-2.5 align-top">
                          <Input
                            inputMode="decimal"
                            value={value}
                            placeholder="—"
                            disabled={!canEdit}
                            aria-label={`${row.source.name} spend in ${formatPeriodLabel(cell.period)}`}
                            aria-invalid={parsed === undefined || undefined}
                            onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value }))}
                            className={cn(
                              "h-8 text-right tabular-nums placeholder:text-muted-foreground/60",
                              parsed !== undefined && parsed !== cell.amount && "border-primary/60 bg-primary/5",
                            )}
                          />
                          <div className="mt-1 text-right text-[11px] text-muted-foreground tabular-nums">
                            {formatNumber(cell.leads)} {cell.leads === 1 ? "lead" : "leads"}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="bg-muted/30 text-xs">
                  <td className="sticky left-0 z-10 bg-muted/30 px-4 py-2.5 font-medium">Total</td>
                  {grid.totals.map((cell) => (
                    <td key={cell.period} className="px-2 py-2.5 text-right tabular-nums">
                      <div className="font-medium">
                        {cell.amount === null ? "—" : formatCompactMoney(cell.amount, grid.currency)}
                      </div>
                      <div className="text-muted-foreground">{formatNumber(cell.leads)} leads</div>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {canEdit && dirty ? (
          <div className="sticky bottom-3 z-20 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 bg-card/95 px-4 py-2.5 shadow-md backdrop-blur">
            <span className="text-xs text-muted-foreground">
              {invalidCount > 0
                ? `${invalidCount} ${invalidCount === 1 ? "amount needs" : "amounts need"} fixing (numbers only, no negatives).`
                : `${entries.length} unsaved ${entries.length === 1 ? "change" : "changes"}. Costs below update after saving.`}
            </span>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setDraft(draftOf(grid))}>
                Discard
              </Button>
              <Button type="submit" size="sm" disabled={invalidCount > 0 || entries.length === 0 || save.isPending}>
                {save.isPending ? "Saving..." : "Save spend"}
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      {grid.sources.length > 0 ? (
        <section className="space-y-3">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold tracking-tight">Cost per result</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Leads created that month, leads with a site visit that month, and deals reserved that month.
              </p>
            </div>
            <Select value={selectedPeriod} onValueChange={setSelected}>
              <SelectTrigger className="w-44" aria-label="Month">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {grid.periods.map((period) => (
                  <SelectItem key={period} value={period}>
                    {formatPeriodLabel(period)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="overflow-x-auto rounded-xl border border-border/60 bg-card">
            <table className="w-full min-w-[640px] text-sm tabular-nums">
              <thead>
                <tr className="border-b border-border/60 text-xs text-muted-foreground">
                  <th className="px-4 py-2.5 text-left font-medium">Source</th>
                  <th className="px-3 py-2.5 text-right font-medium">Spend</th>
                  <th className="px-3 py-2.5 text-right font-medium">Leads</th>
                  <th className="px-3 py-2.5 text-right font-medium">Per lead</th>
                  <th className="px-3 py-2.5 text-right font-medium">Visits</th>
                  <th className="px-3 py-2.5 text-right font-medium">Per visit</th>
                  <th className="px-3 py-2.5 text-right font-medium">Deals</th>
                  <th className="px-3 py-2.5 text-right font-medium">Per deal</th>
                </tr>
              </thead>
              <tbody>
                {grid.sources.map((row) => (
                  <CostRow key={row.source.id} label={row.source.name} cell={row.months[selectedIndex]} currency={grid.currency} />
                ))}
                <CostRow label="All sources" cell={grid.totals[selectedIndex]} currency={grid.currency} total />
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </form>
  );
}

function CostRow({
  label,
  cell,
  currency,
  total = false,
}: {
  label: string;
  cell: SpendCell;
  currency: string;
  total?: boolean;
}) {
  const money = (value: number | null) => (value === null ? "—" : formatMoney(Math.round(value), currency));
  return (
    <tr className={cn("border-b border-border/40 last:border-0", total && "bg-muted/30 font-medium")}>
      <td className="px-4 py-2.5 text-left">{label}</td>
      <td className="px-3 py-2.5 text-right">{money(cell.amount)}</td>
      <td className="px-3 py-2.5 text-right">{formatNumber(cell.leads)}</td>
      <td className="px-3 py-2.5 text-right">{money(cell.costPerLead)}</td>
      <td className="px-3 py-2.5 text-right">{formatNumber(cell.visits)}</td>
      <td className="px-3 py-2.5 text-right">{money(cell.costPerVisit)}</td>
      <td className="px-3 py-2.5 text-right">{formatNumber(cell.deals)}</td>
      <td className="px-3 py-2.5 text-right">{money(cell.costPerDeal)}</td>
    </tr>
  );
}
