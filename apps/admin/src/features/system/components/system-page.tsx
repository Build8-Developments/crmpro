"use client";

import Link from "next/link";
import { AppIcons } from "@/components/icons/app-icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useSystemHealth } from "@/features/system/hooks";
import type {
  HealthStatus,
  JobStatusCounts,
  QueueHealthStatus,
  QueueMetricsSnapshot,
  SystemHealth,
  WorkerStatus,
} from "@/features/system/types";
import { usePermissions } from "@/hooks/use-permissions";
import { formatNumber, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ADMIN_PERMISSIONS } from "@crmpro/shared";

const shortcuts = [
  {
    title: "Find a tenant",
    description: "Search agencies by name or slug",
    href: "/tenants",
    icon: AppIcons.building,
    permission: ADMIN_PERMISSIONS.TENANT_READ,
  },
  {
    title: "Failed imports",
    description: "Drill into jobs that failed this week",
    href: "/imports",
    icon: AppIcons.imports,
    permission: ADMIN_PERMISSIONS.PLATFORM_ANALYTICS_READ,
  },
  {
    title: "Audit trail",
    description: "Review operator actions and security events",
    href: "/audit-logs",
    icon: AppIcons.audit,
    permission: ADMIN_PERMISSIONS.AUDIT_READ,
  },
  {
    title: "Support inbox",
    description: "Reply to user conversations across tenants",
    href: "/support",
    icon: AppIcons.lifeBuoy,
    permission: ADMIN_PERMISSIONS.SUPPORT_ACCESS,
  },
  {
    title: "Attention queue",
    description: "Suspended tenants, drafts, and failed imports",
    href: "/dashboard",
    icon: AppIcons.alertTriangle,
    permission: null,
  },
] as const;

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function statusTone(status: string) {
  if (
    status === "up" ||
    status === "ok" ||
    status === "healthy" ||
    status === "running"
  ) {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400";
  }
  if (
    status === "not_configured" ||
    status === "unknown" ||
    status === "—"
  ) {
    return "border-border bg-muted/40 text-muted-foreground";
  }
  return "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300";
}

function statusDot(status: string) {
  if (
    status === "up" ||
    status === "ok" ||
    status === "healthy" ||
    status === "running"
  ) {
    return "bg-emerald-500";
  }
  if (
    status === "not_configured" ||
    status === "unknown" ||
    status === "—"
  ) {
    return "bg-muted-foreground/40";
  }
  return "bg-amber-500";
}

function statusLabel(status: string) {
  return status.replaceAll("_", " ");
}

export function SystemPage() {
  const { can } = usePermissions();
  const { data, isLoading, isError, isFetching, refetch } = useSystemHealth();

  const visibleShortcuts = shortcuts.filter(
    (item) => item.permission === null || can(item.permission),
  );

  return (
    <div className="space-y-5 px-6 py-5 md:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            System
          </h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Platform health, workers, queues, jobs, and latency
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <AppIcons.activity className="size-3.5" stroke={1.75} />
          {isFetching ? "Refreshing…" : "Refresh"}
        </Button>
      </div>

      {isLoading && !data ? <SystemSkeleton /> : null}

      {isError && !data ? (
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AppIcons.alertCircle className="size-5" />
              Failed to load system health
            </CardTitle>
            <CardDescription>
              Could not reach the health endpoint. Check admin-api and try again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetch()} disabled={isFetching}>
              {isFetching ? "Retrying…" : "Retry"}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {data ? <SystemContent data={data} /> : null}

      {visibleShortcuts.length > 0 ? (
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Operator tools
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Shortcuts for investigation and triage
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {visibleShortcuts.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href + item.title}
                  href={item.href}
                  className="group rounded-xl border border-border/60 bg-card p-4 shadow-sm transition-colors hover:border-primary/30 hover:bg-muted/30"
                >
                  <div className="flex items-start gap-3">
                    <div className="rounded-lg border bg-muted/40 p-2 text-muted-foreground transition-colors group-hover:text-foreground">
                      <Icon className="size-4" stroke={1.75} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                    <AppIcons.chevronRight className="ml-auto size-4 shrink-0 text-muted-foreground/60" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">Tips</CardTitle>
          <CardDescription className="text-xs">
            Use ⌘K / Ctrl+K to search tenants, plans, contracts, and admins
          </CardDescription>
        </CardHeader>
        <CardContent className="text-xs leading-relaxed text-muted-foreground">
          Start with degraded signals above, then open Failed imports or the
          attention queue. Set{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
            INTERNAL_MONITORING_KEY
          </code>{" "}
          on both APIs to unlock queue counts, workers, and HTTP metrics.
        </CardContent>
      </Card>
    </div>
  );
}

function SystemContent({ data }: { data: SystemHealth }) {
  const http = data.metrics.http;
  const notifications = data.metrics.notifications;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant="outline"
          className={cn("h-6 px-2 text-[11px]", statusTone(data.status))}
        >
          <span
            className={cn("mr-1.5 size-1.5 rounded-full", statusDot(data.status))}
          />
          Platform {statusLabel(data.status)}
        </Badge>
        <span className="text-[11px] text-muted-foreground">
          Checked {formatRelativeTime(data.checkedAt)}
        </span>
        {!data.metrics.available ? (
          <Badge variant="outline" className="h-6 px-2 text-[11px]">
            Metrics limited — set monitoring key
          </Badge>
        ) : null}
      </div>

      <section className="space-y-3">
        <SectionTitle
          title="Admin API"
          subtitle="Control-plane process serving this dashboard"
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <HealthCard
            icon={AppIcons.server}
            label="Admin API"
            value={statusLabel(data.adminApi.status)}
            tone={data.adminApi.status}
          />
          <HealthCard
            icon={AppIcons.database}
            label="Database"
            value={statusLabel(data.adminApi.database)}
            tone={data.adminApi.database}
          />
          <HealthCard
            icon={AppIcons.activity}
            label="Redis"
            value={statusLabel(data.adminApi.redis)}
            tone={data.adminApi.redis}
          />
          <HealthCard
            icon={AppIcons.clock}
            label="Uptime"
            value={formatUptime(data.adminApi.uptimeSeconds)}
            tone="ok"
          />
        </div>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="grid gap-3 pt-4 sm:grid-cols-2">
            <MetaRow label="Version" value={data.adminApi.version} />
            <MetaRow label="Environment" value={data.adminApi.environment} />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <SectionTitle
          title="Tenant API"
          subtitle="Customer-facing CRM API and dependencies"
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <HealthCard
            icon={AppIcons.server}
            label="Tenant API"
            value={statusLabel(data.tenantApi.status)}
            tone={data.tenantApi.status}
          />
          <HealthCard
            icon={AppIcons.clock}
            label="Probe latency"
            value={
              data.tenantApi.probeLatencyMs != null
                ? `${formatNumber(data.tenantApi.probeLatencyMs)} ms`
                : "—"
            }
            tone={
              data.tenantApi.probeLatencyMs == null
                ? "not_configured"
                : data.tenantApi.probeLatencyMs > 1000
                  ? "down"
                  : "ok"
            }
          />
          <HealthCard
            icon={AppIcons.database}
            label="Tenant DB"
            value={statusLabel(data.tenantApi.database ?? "—")}
            tone={data.tenantApi.database ?? "not_configured"}
          />
          <HealthCard
            icon={AppIcons.files}
            label="Storage"
            value={statusLabel(data.tenantApi.storage ?? "—")}
            tone={data.tenantApi.storage ?? "not_configured"}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <HealthCard
            icon={AppIcons.activity}
            label="Tenant Redis"
            value={statusLabel(data.tenantApi.redis ?? "—")}
            tone={data.tenantApi.redis ?? "not_configured"}
          />
          <HealthCard
            icon={AppIcons.imports}
            label="Queues registered"
            value={statusLabel(data.tenantApi.queues ?? "—")}
            tone={data.tenantApi.queues ?? "not_configured"}
          />
          <HealthCard
            icon={AppIcons.clock}
            label="Cleanup scheduler"
            value={statusLabel(data.tenantApi.cleanupScheduler ?? "—")}
            tone={data.tenantApi.cleanupScheduler ?? "not_configured"}
          />
          <HealthCard
            icon={AppIcons.activity}
            label="Tenant uptime"
            value={
              data.tenantApi.uptimeSeconds != null
                ? formatUptime(data.tenantApi.uptimeSeconds)
                : "—"
            }
            tone={data.tenantApi.uptimeSeconds != null ? "ok" : "not_configured"}
          />
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle
          title="Workers"
          subtitle="Background processors connected to BullMQ"
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {(
            [
              ["import", data.workers.import],
              ["export", data.workers.export],
              ["cleanup", data.workers.cleanup],
              ["notification", data.workers.notification],
            ] as const
          ).map(([name, status]) => (
            <HealthCard
              key={name}
              icon={AppIcons.activity}
              label={`${name} worker`}
              value={statusLabel(status)}
              tone={status}
            />
          ))}
        </div>
        <Card className="border-border/60 shadow-sm">
          <CardContent className="grid gap-3 pt-4 sm:grid-cols-2">
            <MetaRow
              label="Cleanup last run"
              value={
                data.cleanup.lastRun
                  ? formatRelativeTime(data.cleanup.lastRun)
                  : "—"
              }
            />
            <MetaRow
              label="Cleanup status"
              value={statusLabel(data.cleanup.status)}
            />
          </CardContent>
        </Card>
      </section>

      <section className="space-y-3">
        <SectionTitle
          title="Queues"
          subtitle="BullMQ waiting / active / completed / failed"
        />
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn("h-6 px-2 text-[11px]", statusTone(data.queues.status))}
          >
            <span
              className={cn(
                "mr-1.5 size-1.5 rounded-full",
                statusDot(data.queues.status),
              )}
            />
            Queues {statusLabel(data.queues.status)}
          </Badge>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <QueueCard name="Import" counts={data.queues.import} />
          <QueueCard name="Export" counts={data.queues.export} />
          <QueueCard name="Cleanup" counts={data.queues.cleanup} />
          <QueueCard name="Notification" counts={data.queues.notification} />
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle
          title="Background jobs"
          subtitle="Platform-wide Prisma job table counts"
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <HealthCard
            icon={AppIcons.alertTriangle}
            label="Stuck imports"
            value={formatNumber(data.jobs.stuckImports)}
            tone={data.jobs.stuckImports > 0 ? "down" : "ok"}
          />
          <HealthCard
            icon={AppIcons.alertTriangle}
            label="Stuck exports"
            value={formatNumber(data.jobs.stuckExports)}
            tone={data.jobs.stuckExports > 0 ? "down" : "ok"}
          />
          <HealthCard
            icon={AppIcons.imports}
            label="Import failed"
            value={formatNumber(data.jobs.imports.FAILED)}
            tone={data.jobs.imports.FAILED > 0 ? "down" : "ok"}
          />
          <HealthCard
            icon={AppIcons.exports}
            label="Export failed"
            value={formatNumber(data.jobs.exports.FAILED)}
            tone={data.jobs.exports.FAILED > 0 ? "down" : "ok"}
          />
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          <JobStatusCard title="Import jobs" counts={data.jobs.imports} />
          <JobStatusCard title="Export jobs" counts={data.jobs.exports} />
        </div>
        <p className="text-[11px] text-muted-foreground">
          Stuck = PROCESSING longer than {data.jobs.stuckTimeoutMinutes} minutes
        </p>
      </section>

      <section className="space-y-3">
        <SectionTitle
          title="Latency & errors"
          subtitle="In-process HTTP and notification metrics from tenant API"
        />
        {http ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <HealthCard
              icon={AppIcons.activity}
              label="HTTP requests"
              value={formatNumber(http.totalRequests)}
              tone="ok"
            />
            <HealthCard
              icon={AppIcons.clock}
              label="Avg response"
              value={`${formatNumber(Math.round(http.averageResponseTimeMs))} ms`}
              tone={http.averageResponseTimeMs > 500 ? "down" : "ok"}
            />
            <HealthCard
              icon={AppIcons.clock}
              label="p95 response"
              value={`${formatNumber(Math.round(http.p95ResponseTimeMs))} ms`}
              tone={http.p95ResponseTimeMs > 1000 ? "down" : "ok"}
            />
            <HealthCard
              icon={AppIcons.alertCircle}
              label="Error rate"
              value={`${(http.errorRate * 100).toFixed(2)}%`}
              tone={http.errorRate >= 0.05 ? "down" : "ok"}
            />
          </div>
        ) : (
          <Card className="border-border/60 shadow-sm">
            <CardContent className="py-4 text-xs text-muted-foreground">
              HTTP metrics unavailable until{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-[10px]">
                INTERNAL_MONITORING_KEY
              </code>{" "}
              matches on both APIs.
            </CardContent>
          </Card>
        )}
        {notifications ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <HealthCard
              icon={AppIcons.notifications}
              label="Notifications created"
              value={formatNumber(notifications.created)}
              tone="ok"
            />
            <HealthCard
              icon={AppIcons.alertCircle}
              label="Delivery failures"
              value={formatNumber(notifications.deliveryFailures)}
              tone={notifications.deliveryFailures > 0 ? "down" : "ok"}
            />
            <HealthCard
              icon={AppIcons.clock}
              label="Avg delivery"
              value={`${formatNumber(Math.round(notifications.averageDeliveryTimeMs))} ms`}
              tone="ok"
            />
            <HealthCard
              icon={AppIcons.notifications}
              label="Unread (cached)"
              value={
                notifications.unreadCount != null
                  ? formatNumber(notifications.unreadCount)
                  : "—"
              }
              tone="ok"
            />
          </div>
        ) : null}
      </section>
    </>
  );
}

function SystemSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <Card key={index} className="border-border/60 shadow-sm">
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-20" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SectionTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function HealthCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof AppIcons.server;
  label: string;
  value: string;
  tone: HealthStatus | QueueHealthStatus | WorkerStatus | "ok" | "degraded" | string;
}) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardDescription className="text-xs">{label}</CardDescription>
        <Icon className="size-4 text-muted-foreground" stroke={1.75} />
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <span className={cn("size-2 rounded-full", statusDot(tone))} />
          <p className="text-lg font-semibold capitalize tracking-tight">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function QueueCard({
  name,
  counts,
}: {
  name: string;
  counts: QueueMetricsSnapshot;
}) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="border-b border-border/50 pb-3">
        <CardTitle className="text-sm font-semibold">{name} queue</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 pt-4 sm:grid-cols-4">
        <StatChip label="Waiting" value={counts.waiting} />
        <StatChip label="Active" value={counts.active} />
        <StatChip label="Done" value={counts.completed} />
        <StatChip
          label="Failed"
          value={counts.failed}
          warn={counts.failed > 0}
        />
      </CardContent>
    </Card>
  );
}

function JobStatusCard({
  title,
  counts,
}: {
  title: string;
  counts: JobStatusCounts;
}) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="border-b border-border/50 pb-3">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 pt-4 sm:grid-cols-3">
        <StatChip label="Pending" value={counts.PENDING} />
        <StatChip label="Processing" value={counts.PROCESSING} />
        <StatChip label="Completed" value={counts.COMPLETED} />
        <StatChip label="Failed" value={counts.FAILED} warn={counts.FAILED > 0} />
        <StatChip
          label="Partial"
          value={counts.PARTIAL_SUCCESS}
          warn={counts.PARTIAL_SUCCESS > 0}
        />
      </CardContent>
    </Card>
  );
}

function StatChip({
  label,
  value,
  warn,
}: {
  label: string;
  value: number;
  warn?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-muted/20 px-2.5 py-2",
        warn && "border-amber-500/30 bg-amber-500/5",
      )}
    >
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums">
        {formatNumber(value)}
      </p>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 rounded-lg border bg-muted/20 px-3 py-2.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}
