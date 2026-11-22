"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DASHBOARD_PERIOD_DEFAULT,
  DASHBOARD_PERIODS,
  type DashboardPeriod,
} from "@/features/dashboard/v2/period";
import { NeedsAttentionSection } from "@/features/dashboard/v2/sections/attention/attention-section";
import { LossesSection } from "@/features/dashboard/v2/sections/losses/losses-section";
import { MoneySection } from "@/features/dashboard/v2/sections/money/money-section";
import { SourcesSection } from "@/features/dashboard/v2/sections/sources/sources-section";
import { TeamSection } from "@/features/dashboard/v2/sections/team/team-section";

/**
 * Owner / manager dashboard (spec §5), organised by the five questions an
 * owner asks. Each section loads on its own; managers see their scope.
 */
export function DashboardV2Page() {
  const [period, setPeriod] = useState<DashboardPeriod>(DASHBOARD_PERIOD_DEFAULT);

  return (
    <div className="space-y-6 px-4 py-5 md:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            What needs you now, money, the team, sources and losses
          </p>
        </div>
        <div
          className="inline-flex flex-wrap items-center rounded-lg border bg-muted/40 p-1"
          role="group"
          aria-label="Period"
        >
          {DASHBOARD_PERIODS.map((item) => (
            <Button
              key={item.value}
              type="button"
              size="sm"
              variant={period === item.value ? "default" : "ghost"}
              className={cn(
                "rounded-md px-3",
                period !== item.value && "text-muted-foreground hover:text-foreground",
              )}
              aria-pressed={period === item.value}
              onClick={() => setPeriod(item.value)}
            >
              {item.label}
            </Button>
          ))}
        </div>
      </div>

      <NeedsAttentionSection period={period} />
      <MoneySection period={period} />
      <TeamSection period={period} />
      <SourcesSection period={period} />
      <LossesSection period={period} />
    </div>
  );
}
