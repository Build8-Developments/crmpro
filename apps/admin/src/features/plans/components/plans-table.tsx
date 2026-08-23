"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PlanRowActions, PlanRowContextMenu } from "@/features/plans/components/plan-row-actions";
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu";
import type { PlanListItem } from "@/features/plans/types";
import { formatMoney, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";

interface PlansTableProps {
  plans: PlanListItem[];
  onEdit: (plan: PlanListItem) => void;
  onArchive: (plan: PlanListItem) => void;
}

export function PlansTable({ plans, onEdit, onArchive }: PlansTableProps) {
  return (
    <div className="overflow-x-auto bg-background">
      <table className="w-full min-w-[880px] border-collapse text-sm">
        <thead className="border-b border-border/50 bg-muted/25">
          <tr className="text-left">
            <th className="h-8 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
              Plan
            </th>
            <th className="h-8 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
              Price
            </th>
            <th className="hidden h-8 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase md:table-cell">
              Limits
            </th>
            <th className="h-8 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase">
              Status
            </th>
            <th className="hidden h-8 px-3 font-medium text-[11px] tracking-wide text-muted-foreground uppercase lg:table-cell">
              Created
            </th>
            <th className="h-8 w-10 px-2" aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {plans.map((plan) => (
            <ContextMenu key={plan.id}>
              <ContextMenuTrigger asChild>
                <tr
                  className={cn(
                    "border-b border-border/40 transition-colors last:border-0 hover:bg-muted/20",
                    !plan.isActive && "opacity-70",
                  )}
                >
                  <td className="px-3 py-2">
                    <Link
                      href={`/plans/${plan.id}`}
                      className="block min-w-0 text-left"
                    >
                      <span className="truncate text-sm font-medium text-foreground">
                        {plan.name}
                      </span>
                      {plan.description ? (
                        <span className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                          {plan.description}
                        </span>
                      ) : null}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-xs tabular-nums text-muted-foreground">
                    {formatMoney(plan.defaultPrice, plan.currency)}
                  </td>
                  <td className="hidden px-3 py-2 text-xs text-muted-foreground md:table-cell">
                    {[
                      plan.maxUsers != null ? `${plan.maxUsers} users` : null,
                      plan.maxLeads != null ? `${plan.maxLeads} leads` : null,
                      plan.maxProjects != null
                        ? `${plan.maxProjects} projects`
                        : null,
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Unlimited"}
                  </td>
                  <td className="px-3 py-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-5 px-1.5 text-[10px] font-medium",
                        plan.isActive
                          ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                          : "border-border bg-muted/50 text-muted-foreground",
                      )}
                    >
                      {plan.isActive ? "Active" : "Archived"}
                    </Badge>
                  </td>
                  <td className="hidden px-3 py-2 text-xs text-muted-foreground lg:table-cell">
                    {formatRelativeTime(plan.createdAt)}
                  </td>
                  <td className="px-2 py-2 text-right">
                    <PlanRowActions
                      plan={plan}
                      onEdit={onEdit}
                      onArchive={onArchive}
                    />
                  </td>
                </tr>
              </ContextMenuTrigger>
              <PlanRowContextMenu
                plan={plan}
                onEdit={onEdit}
                onArchive={onArchive}
              />
            </ContextMenu>
          ))}
        </tbody>
      </table>
    </div>
  );
}
