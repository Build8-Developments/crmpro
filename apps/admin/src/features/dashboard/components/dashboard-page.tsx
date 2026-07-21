"use client";

import { AppIcons } from "@/components/icons/app-icons";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useDashboardSummary } from "@/features/dashboard/hooks";
import { isDashboardEffectivelyEmpty } from "@/features/dashboard/utils";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";
import { ADMIN_PERMISSIONS } from "@crmpro/shared";
import { AttentionQueue } from "./attention-queue";
import { DashboardHeader } from "./dashboard-header";
import { DashboardSkeleton } from "./dashboard-skeleton";
import { EmptyDashboard } from "./empty-dashboard";
import { ImportActivityPanel } from "./import-activity-panel";
import { KpiGrid } from "./kpi-grid";
import { QuickActions } from "./quick-actions";
import { RecentAuditFeed } from "./recent-audit-feed";
import { TenantStatusChart } from "./tenant-status-chart";

export function DashboardPage() {
  const { can } = usePermissions();
  const canReadAnalytics = can(ADMIN_PERMISSIONS.PLATFORM_ANALYTICS_READ);

  const { data, isLoading, isError, refetch, isFetching } = useDashboardSummary({
    enabled: canReadAnalytics,
  });

  if (!canReadAnalytics) {
    return (
      <div className="space-y-4 px-6 py-5 md:px-8">
        <DashboardHeader />
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AppIcons.lock className="size-5 text-muted-foreground" />
              Dashboard locked
            </CardTitle>
            <CardDescription>
              Your role can&apos;t view platform analytics. Ask a super admin to
              grant access if you need the ops console.
            </CardDescription>
          </CardHeader>
        </Card>
        <QuickActions />
      </div>
    );
  }

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className="space-y-4 px-6 py-5 md:px-8">
        <DashboardHeader isRefreshing={false} />
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AppIcons.alertCircle className="size-5" />
              Failed to load dashboard
            </CardTitle>
            <CardDescription>
              We couldn&apos;t fetch platform analytics. Check your connection
              and try again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? "Retrying..." : "Retry"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isDashboardEffectivelyEmpty(data)) {
    return (
      <div className="space-y-4 px-6 py-5 md:px-8">
        <DashboardHeader
          systemHealth={data.systemHealth}
          isRefreshing={isFetching}
        />
        <EmptyDashboard />
        <QuickActions />
      </div>
    );
  }

  const isRefreshing = isFetching && !isLoading;

  return (
    <div className="space-y-4 px-6 py-5 md:px-8">
      <DashboardHeader
        systemHealth={data.systemHealth}
        attentionCount={data.attention.items.length}
        isRefreshing={isRefreshing}
      />

      <div
        className={cn(
          "space-y-4 transition-opacity duration-200",
          isRefreshing && "pointer-events-none opacity-60",
        )}
      >
        <AttentionQueue attention={data.attention} />
        <KpiGrid data={data} />

        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          <TenantStatusChart tenants={data.tenants} />
          <ImportActivityPanel
            importActivity={data.importActivity}
            failedImports={data.attention.failedImports}
          />
        </div>

        <RecentAuditFeed items={data.recentAudit} />
        <QuickActions />
      </div>
    </div>
  );
}
