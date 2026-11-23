"use client";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  ContractDetail,
  PlanQuotas,
} from "@/features/contracts/types";
import { formatDate, formatMoney, formatNumber, formatStorageBytes } from "@/lib/format";
import { cn } from "@/lib/utils";

const QUOTA_ROWS: Array<{
  key: keyof PlanQuotas;
  label: string;
  format: (value: string | number) => string;
}> = [
  { key: "maxUsers", label: "Users", format: (v) => formatNumber(Number(v)) },
  { key: "maxLeads", label: "Leads", format: (v) => formatNumber(Number(v)) },
  {
    key: "maxProjects",
    label: "Projects",
    format: (v) => formatNumber(Number(v)),
  },
  {
    key: "maxStorageBytes",
    label: "Storage",
    format: (v) => formatStorageBytes(Number(v)),
  },
];

function quotaLabel(
  value: string | number | null,
  format: (value: string | number) => string,
): string {
  return value === null ? "Unlimited" : format(value);
}

function flagLabel(value: boolean | undefined): string {
  if (value === undefined) return "—";
  return value ? "On" : "Off";
}

/**
 * The plan as signed (frozen snapshot) next to the plan as it is today.
 * Tenants are enforced against the signed quotas and flags; flags the
 * snapshot doesn't have come from the live plan.
 */
export function ContractPlanTermsCard({
  contract,
}: {
  contract: ContractDetail;
}) {
  const snapshot = contract.planSnapshot;
  const live = contract.livePlan;
  const isDraft = contract.status === "DRAFT";

  const flagKeys = Array.from(
    new Set([
      ...Object.keys(snapshot?.featureFlags ?? {}),
      ...Object.keys(live.featureFlags),
    ]),
  ).sort();

  const differenceCount = snapshot
    ? QUOTA_ROWS.filter(
        (row) => snapshot.quotas[row.key] !== live.quotas[row.key],
      ).length +
      flagKeys.filter(
        (key) =>
          key in snapshot.featureFlags &&
          snapshot.featureFlags[key] !== live.featureFlags[key],
      ).length
    : 0;

  return (
    <Card className="gap-3 py-4 shadow-sm">
      <CardHeader className="px-5 pb-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-sm">Plan terms</CardTitle>
          {snapshot && differenceCount > 0 ? (
            <Badge
              variant="outline"
              className="border-amber-500/40 text-amber-700 dark:text-amber-400"
            >
              {differenceCount} difference{differenceCount === 1 ? "" : "s"}{" "}
              from the live plan
            </Badge>
          ) : null}
        </div>
        <CardDescription>
          {snapshot
            ? isDraft
              ? "Preview of what will be frozen when the contract is activated."
              : `As signed${snapshot.capturedAt ? ` on ${formatDate(snapshot.capturedAt)}` : ""}. Later plan edits don't change these; new features added to the plan do reach the tenant.`
            : "No snapshot: signed before snapshots existed, the live plan applies."}
        </CardDescription>
      </CardHeader>
      <CardContent className="px-5">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th className="py-1.5 pr-3 font-medium" />
                <th className="py-1.5 pr-3 font-medium">
                  {isDraft ? "Preview" : "As signed"}
                  {snapshot ? (
                    <span className="block font-normal">{snapshot.name}</span>
                  ) : null}
                </th>
                <th className="py-1.5 font-medium">
                  Live plan
                  <span className="block font-normal">
                    {live.name}
                    {live.isActive ? "" : " (archived)"}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {snapshot ? (
                <TermRow
                  label="Price"
                  signed={formatMoney(snapshot.price, snapshot.currency)}
                  live="—"
                  differs={false}
                />
              ) : null}
              {QUOTA_ROWS.map((row) => {
                const signedValue = snapshot?.quotas[row.key];
                const liveValue = live.quotas[row.key];
                return (
                  <TermRow
                    key={row.key}
                    label={row.label}
                    signed={
                      snapshot
                        ? quotaLabel(signedValue ?? null, row.format)
                        : "—"
                    }
                    live={quotaLabel(liveValue, row.format)}
                    differs={snapshot ? signedValue !== liveValue : false}
                  />
                );
              })}
              {flagKeys.map((key) => {
                const frozen = snapshot ? key in snapshot.featureFlags : false;
                return (
                  <TermRow
                    key={key}
                    label={key}
                    signed={
                      snapshot
                        ? frozen
                          ? flagLabel(snapshot.featureFlags[key])
                          : "From live plan"
                        : "—"
                    }
                    live={flagLabel(live.featureFlags[key])}
                    differs={
                      frozen &&
                      snapshot?.featureFlags[key] !== live.featureFlags[key]
                    }
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function TermRow({
  label,
  signed,
  live,
  differs,
}: {
  label: string;
  signed: string;
  live: string;
  differs: boolean;
}) {
  return (
    <tr className={cn(differs && "bg-amber-500/10")}>
      <td className="py-1.5 pr-3 text-muted-foreground">{label}</td>
      <td
        className={cn(
          "py-1.5 pr-3 tabular-nums text-foreground",
          differs && "font-medium",
        )}
      >
        {signed}
      </td>
      <td
        className={cn(
          "py-1.5 tabular-nums",
          differs
            ? "font-medium text-amber-700 dark:text-amber-400"
            : "text-muted-foreground",
        )}
      >
        {live}
      </td>
    </tr>
  );
}
