"use client";

import Link from "next/link";
import { AppIcons } from "@/components/icons/app-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PlatformSystemHealth } from "@/features/dashboard/types";
import { formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DashboardSectionCard } from "./dashboard-section-card";
import { dashboardEnterStyle } from "../utils";

interface SystemHealthCardProps {
  systemHealth: PlatformSystemHealth;
}

export function SystemHealthCard({ systemHealth }: SystemHealthCardProps) {
  const isOk = systemHealth.status === "ok";
  const dbUp = systemHealth.database === "up";

  return (
    <DashboardSectionCard
      icon={AppIcons.activity}
      title="System Health"
      subtitle="Infrastructure status snapshot"
      badges={
        <Badge
          variant={isOk ? "outline" : "warning"}
          className={cn(
            "h-5 px-1.5 text-[10px]",
            isOk &&
              "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
          )}
        >
          {isOk ? "Healthy" : "Degraded"}
        </Badge>
      }
      style={dashboardEnterStyle(6)}
      className="h-full"
      contentClassName="space-y-3"
    >
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="rounded-lg border bg-muted/20 px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground">Overall</p>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={cn(
                "size-2 rounded-full",
                isOk ? "bg-emerald-500" : "bg-amber-500",
              )}
            />
            <p className="text-sm font-semibold capitalize text-foreground">
              {systemHealth.status}
            </p>
          </div>
        </div>

        <div className="rounded-lg border bg-muted/20 px-3 py-2.5">
          <p className="text-[11px] text-muted-foreground">Database</p>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={cn(
                "size-2 rounded-full",
                dbUp ? "bg-emerald-500" : "bg-destructive",
              )}
            />
            <p
              className={cn(
                "text-sm font-semibold capitalize",
                dbUp
                  ? "text-foreground"
                  : "text-destructive",
              )}
            >
              {systemHealth.database}
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2.5 text-[11px] text-muted-foreground">
        <AppIcons.clock className="size-3.5 shrink-0" stroke={1.75} />
        <span>
          Checked {formatRelativeTime(systemHealth.checkedAt)}
        </span>
      </div>

      {!isOk || !dbUp ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] px-3 py-2.5">
          <AppIcons.alertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
            {!dbUp
              ? "Database connectivity is down. Platform writes may fail until connectivity is restored."
              : "One or more platform checks reported degraded status. Investigate services and recent deployments."}
          </p>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] px-3 py-2.5">
          <AppIcons.check className="mt-0.5 size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            All monitored services are responding normally.
          </p>
        </div>
      )}

      <Button variant="outline" size="sm" className="w-full" asChild>
        <Link href="/system">Open full system status</Link>
      </Button>
    </DashboardSectionCard>
  );
}
