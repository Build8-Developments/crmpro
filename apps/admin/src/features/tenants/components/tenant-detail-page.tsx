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
import { useAuditLogs } from "@/features/audit/hooks";
import { TenantActions } from "@/features/tenants/components/tenant-actions";
import { TenantNotesSection } from "@/features/tenants/components/tenant-notes-section";
import { useTenant, useTenantUsage, useTenantUsers } from "@/features/tenants/hooks";
import type {
  StorageUsageMetric,
  TenantUsage,
  UsageMetric,
} from "@/features/tenants/types";
import {
  formatBytes,
  tenantStatusBadgeClass,
  tenantStatusLabel,
  usagePercent,
} from "@/features/tenants/utils/format";
import {
  formatAuditAction,
  formatAuditEntityType,
} from "@/lib/audit-labels";
import { formatNumber, formatRelativeTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/hooks/use-permissions";
import { ADMIN_PERMISSIONS } from "@crmpro/shared";

interface TenantDetailPageProps {
  tenantId: string;
}

export function TenantDetailPage({ tenantId }: TenantDetailPageProps) {
  const { can } = usePermissions();
  const canReadAudit = can(ADMIN_PERMISSIONS.AUDIT_READ);

  const {
    data: tenant,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useTenant(tenantId);
  const { data: usage, isLoading: usageLoading } = useTenantUsage(tenantId);
  const { data: usersData, isLoading: usersLoading } = useTenantUsers(tenantId, {
    limit: 20,
  });
  const { data: auditData, isLoading: auditLoading } = useAuditLogs(
    { tenantId, limit: 8 },
    { enabled: canReadAudit },
  );

  if (isLoading && !tenant) {
    return <TenantDetailSkeleton />;
  }

  if (isError || !tenant) {
    return (
      <div className="space-y-4 px-6 py-5 md:px-8">
        <BackLink />
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AppIcons.alertCircle className="size-5" />
              Failed to load tenant
            </CardTitle>
            <CardDescription>
              We couldn&apos;t fetch this tenant. It may have been removed or
              you may not have access.
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

  const usageWarnings = usage ? getUsageWarnings(usage) : [];

  return (
    <div className="space-y-4 px-6 py-5 md:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <BackLink />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                {tenant.name}
              </h1>
              <Badge
                variant="outline"
                className={tenantStatusBadgeClass(tenant.status)}
              >
                {tenantStatusLabel(tenant.status)}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              <code className="rounded bg-muted/60 px-1.5 py-0.5 text-[11px]">
                {tenant.slug}
              </code>
              <span className="mx-1.5 text-border">·</span>
              Created {formatRelativeTime(tenant.createdAt)}
            </p>
          </div>
        </div>
        <TenantActions tenant={tenant} />
      </div>

      {usageWarnings.length > 0 ? (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] px-4 py-3">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
            Usage approaching limits
          </p>
          <ul className="mt-1 space-y-0.5 text-xs text-amber-800/80 dark:text-amber-300/80">
            {usageWarnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <MetaCard title="Plan" description="Subscription template for this agency">
          <dl className="space-y-3 text-sm">
            <MetaRow
              label="Name"
              value={
                <Link
                  href={`/plans/${tenant.subscriptionPlan.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  {tenant.subscriptionPlan.name}
                </Link>
              }
            />
          </dl>
        </MetaCard>

        <MetaCard
          title="Contract"
          description="Linked commercial agreement"
        >
          {tenant.contract ? (
            <dl className="space-y-3 text-sm">
              <MetaRow
                label="Name"
                value={
                  <Link
                    href={`/contracts/${tenant.contract.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {tenant.contract.contractName?.trim() || "View contract"}
                  </Link>
                }
              />
              <MetaRow
                label="Status"
                value={
                  <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                    {tenant.contract.status}
                  </Badge>
                }
              />
              <MetaRow
                label="Price"
                value={`${formatNumber(tenant.contract.agreedPrice)} ${tenant.contract.currency}`}
              />
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">No linked contract.</p>
          )}
        </MetaCard>

        <MetaCard title="Owner" description="Primary agency account">
          {tenant.ownerUser ? (
            <dl className="space-y-3 text-sm">
              <MetaRow label="Name" value={tenant.ownerUser.fullName} />
              <MetaRow label="Email" value={tenant.ownerUser.email} />
            </dl>
          ) : (
            <p className="text-sm text-muted-foreground">
              No owner user found.
            </p>
          )}
        </MetaCard>

        <MetaCard
          title="Usage"
          description="Current consumption against plan limits"
        >
          {usageLoading && !usage ? (
            <div className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : usage ? (
            <UsageBars usage={usage} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Usage data unavailable.
            </p>
          )}
        </MetaCard>
      </div>

      <MetaCard
        title="Users"
        description={
          usersData
            ? `${formatNumber(usersData.pagination.totalItems)} workspace users`
            : "Workspace users for this agency"
        }
      >
        {usersLoading && !usersData ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : (usersData?.items.length ?? 0) === 0 ? (
          <p className="text-sm text-muted-foreground">
            No users found for this tenant.
          </p>
        ) : (
          <ul className="divide-y divide-border/50">
            {usersData!.items.map((user) => (
              <li
                key={user.id}
                className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {user.name}
                    </p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "h-5 px-1.5 text-[10px]",
                        user.isActive
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                          : "text-muted-foreground",
                      )}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email}
                    <span className="mx-1">·</span>
                    {user.role.name}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {user.lastLoginAt
                    ? `Last login ${formatRelativeTime(user.lastLoginAt)}`
                    : "Never logged in"}
                </span>
              </li>
            ))}
          </ul>
        )}
        {usersData && usersData.pagination.totalItems > usersData.items.length ? (
          <p className="mt-3 text-[11px] text-muted-foreground">
            Showing {usersData.items.length} of{" "}
            {formatNumber(usersData.pagination.totalItems)} users
          </p>
        ) : null}
      </MetaCard>

      <div className="rounded-xl border border-border/60 bg-card p-4 shadow-sm">
        <TenantNotesSection tenantId={tenant.id} />
      </div>

      {canReadAudit ? (
        <MetaCard
          title="Recent activity"
          description="Operator actions on this tenant"
        >
          {auditLoading && !auditData ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : (auditData?.items.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              No audit events for this tenant yet.
            </p>
          ) : (
            <ul className="divide-y divide-border/50">
              {auditData!.items.map((log) => (
                <li
                  key={log.id}
                  className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {formatAuditAction(log.action)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {log.actor?.fullName ?? "System"}
                      <span className="mx-1">·</span>
                      {formatAuditEntityType(log.entityType)}
                    </p>
                  </div>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {formatRelativeTime(log.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/audit-logs?tenantId=${tenant.id}`}>
                Open full audit trail
              </Link>
            </Button>
          </div>
        </MetaCard>
      ) : null}
    </div>
  );
}

function getUsageWarnings(usage: TenantUsage): string[] {
  const warnings: string[] = [];
  const checks: Array<{ label: string; used: number; limit: number | null }> = [
    { label: "Users", used: usage.users.used, limit: usage.users.limit },
    { label: "Leads", used: usage.leads.used, limit: usage.leads.limit },
    {
      label: "Projects",
      used: usage.projects.used,
      limit: usage.projects.limit,
    },
  ];

  for (const check of checks) {
    if (check.limit === null || check.limit <= 0) continue;
    const percent = (check.used / check.limit) * 100;
    if (percent >= 90) {
      warnings.push(
        `${check.label} at ${Math.round(percent)}% of plan limit (${formatNumber(check.used)} / ${formatNumber(check.limit)}).`,
      );
    }
  }

  if (
    usage.storage.limitBytes !== null &&
    usage.storage.limitBytes > 0 &&
    (usage.storage.usedBytes / usage.storage.limitBytes) * 100 >= 90
  ) {
    warnings.push("Storage is near the plan limit.");
  }

  return warnings;
}

function BackLink() {
  return (
    <Button variant="ghost" size="icon-sm" className="mt-0.5 shrink-0" asChild>
      <Link href="/tenants" aria-label="Back to tenants">
        <AppIcons.arrowLeft className="size-4" />
      </Link>
    </Button>
  );
}

function MetaCard({
  title,
  description,
  children,
}: {
  title: string;
  description: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="border-b border-border/50 pb-3">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="pt-4">{children}</CardContent>
    </Card>
  );
}

function MetaRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium text-foreground">{value}</dd>
    </div>
  );
}

function UsageBars({ usage }: { usage: TenantUsage }) {
  return (
    <div className="space-y-4">
      <UsageBar
        label="Users"
        usedLabel={formatNumber(usage.users.used)}
        limitLabel={limitLabel(usage.users)}
        percent={usagePercent(usage.users.used, usage.users.limit)}
        unlimited={usage.users.limit === null}
      />
      <UsageBar
        label="Leads"
        usedLabel={formatNumber(usage.leads.used)}
        limitLabel={limitLabel(usage.leads)}
        percent={usagePercent(usage.leads.used, usage.leads.limit)}
        unlimited={usage.leads.limit === null}
      />
      <UsageBar
        label="Projects"
        usedLabel={formatNumber(usage.projects.used)}
        limitLabel={limitLabel(usage.projects)}
        percent={usagePercent(usage.projects.used, usage.projects.limit)}
        unlimited={usage.projects.limit === null}
      />
      <UsageBar
        label="Storage"
        usedLabel={formatBytes(usage.storage.usedBytes)}
        limitLabel={storageLimitLabel(usage.storage)}
        percent={usagePercent(
          usage.storage.usedBytes,
          usage.storage.limitBytes,
        )}
        unlimited={usage.storage.limitBytes === null}
      />
    </div>
  );
}

function limitLabel(metric: UsageMetric): string {
  return metric.limit === null ? "Unlimited" : formatNumber(metric.limit);
}

function storageLimitLabel(metric: StorageUsageMetric): string {
  return metric.limitBytes === null
    ? "Unlimited"
    : formatBytes(metric.limitBytes);
}

function UsageBar({
  label,
  usedLabel,
  limitLabel,
  percent,
  unlimited,
}: {
  label: string;
  usedLabel: string;
  limitLabel: string;
  percent: number;
  unlimited: boolean;
}) {
  const tone =
    !unlimited && percent >= 90
      ? "bg-destructive"
      : !unlimited && percent >= 70
        ? "bg-amber-500"
        : "bg-primary";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="font-medium text-foreground">{label}</span>
        <span className="tabular-nums text-muted-foreground">
          {usedLabel} / {limitLabel}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-[width]",
            unlimited ? "bg-muted-foreground/30" : tone,
          )}
          style={{ width: unlimited ? "8%" : `${Math.max(percent, 2)}%` }}
        />
      </div>
    </div>
  );
}

function TenantDetailSkeleton() {
  return (
    <div className="space-y-4 px-6 py-5 md:px-8">
      <div className="flex items-start gap-3">
        <Skeleton className="size-8 rounded-md" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3.5 w-40" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="border-border/60 shadow-sm">
            <CardHeader className="border-b border-border/50 pb-3">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-40" />
            </CardHeader>
            <CardContent className="space-y-3 pt-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
