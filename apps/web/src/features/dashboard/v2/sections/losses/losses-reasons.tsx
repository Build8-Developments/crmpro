"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  formatShare,
  reasonColor,
  type DashboardLosses,
  type LostBreakdownRow,
} from "./losses-types";

type Split = "source" | "agent";

const reasonKey = (reasonId: string | null) => reasonId ?? "none";

/** Lost reasons overall, then split by source or by owner as stacked bars. */
export function LossesReasons({ lost }: { lost: DashboardLosses["lost"] }) {
  const [split, setSplit] = useState<Split>("source");

  if (lost.total === 0) {
    return <p className="py-6 text-center text-xs text-muted-foreground">No leads were lost in this period.</p>;
  }

  const colorBy = new Map(lost.reasons.map((reason, index) => [reasonKey(reason.reasonId), reasonColor(index)]));
  const nameBy = new Map(lost.reasons.map((reason) => [reasonKey(reason.reasonId), reason.name]));
  const rows = split === "source" ? lost.bySource : lost.byAgent;

  return (
    <div className="space-y-4">
      <ul className="space-y-1.5">
        {lost.reasons.map((reason) => (
          <li key={reasonKey(reason.reasonId)} className="flex items-center gap-2 text-xs">
            <span
              className="size-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: colorBy.get(reasonKey(reason.reasonId)) }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate">
              {reason.name}
              {reason.recyclable ? (
                <span className="ml-1 text-[10px] text-muted-foreground" title="Comes back as a re-engage task">
                  · recyclable
                </span>
              ) : null}
            </span>
            <span className="w-24 shrink-0">
              <span className="block h-1.5 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${reason.percent ?? 0}%`,
                    backgroundColor: colorBy.get(reasonKey(reason.reasonId)),
                  }}
                />
              </span>
            </span>
            <span className="w-14 shrink-0 text-right tabular-nums">
              {formatNumber(reason.count)}{" "}
              <span className="text-muted-foreground">{formatShare(reason.percent)}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-xs font-medium">Who and where</h4>
          <div className="inline-flex rounded-md border bg-muted/40 p-0.5" role="group" aria-label="Split lost leads by">
            {(["source", "agent"] as const).map((value) => (
              <Button
                key={value}
                type="button"
                size="xs"
                variant={split === value ? "default" : "ghost"}
                aria-pressed={split === value}
                className={cn("h-6 px-2", split !== value && "text-muted-foreground")}
                onClick={() => setSplit(value)}
              >
                {value === "source" ? "By source" : "By owner"}
              </Button>
            ))}
          </div>
        </div>
        <ul className="space-y-2">
          {rows.map((row) => (
            <BreakdownBar key={row.id ?? "none"} row={row} colorBy={colorBy} nameBy={nameBy} />
          ))}
        </ul>
      </div>
    </div>
  );
}

function BreakdownBar({
  row,
  colorBy,
  nameBy,
}: {
  row: LostBreakdownRow;
  colorBy: Map<string, string>;
  nameBy: Map<string, string>;
}) {
  const top = row.reasons[0];
  return (
    <li className="space-y-1">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="min-w-0 truncate">{row.name}</span>
        <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
          {formatNumber(row.total)} lost
          {top ? ` · mostly ${nameBy.get(reasonKey(top.reasonId)) ?? "—"}` : ""}
        </span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-muted">
        {row.reasons.map((reason) => (
          <span
            key={reasonKey(reason.reasonId)}
            className="h-full"
            title={`${nameBy.get(reasonKey(reason.reasonId)) ?? "—"}: ${formatNumber(reason.count)}`}
            style={{
              width: `${(reason.count / row.total) * 100}%`,
              backgroundColor: colorBy.get(reasonKey(reason.reasonId)),
            }}
          />
        ))}
      </div>
    </li>
  );
}
