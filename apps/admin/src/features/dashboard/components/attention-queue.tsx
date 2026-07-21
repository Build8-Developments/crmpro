"use client";

import Link from "next/link";
import { AppIcons } from "@/components/icons/app-icons";
import { Badge } from "@/components/ui/badge";
import type {
  PlatformAttentionItem,
  PlatformAttentionQueue,
  PlatformAttentionSeverity,
} from "@/features/dashboard/types";
import { formatNumber, formatRelativeTime, formatStorageBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import { DashboardSectionCard } from "./dashboard-section-card";
import { DASHBOARD_ENTER_CLASS, dashboardEnterStyle } from "../utils";

interface AttentionQueueProps {
  attention: PlatformAttentionQueue;
}

export function AttentionQueue({ attention }: AttentionQueueProps) {
  const {
    items,
    suspendedTenants,
    trialTenants,
    draftContracts,
    usageAtRiskTenants,
    failedImports,
  } = attention;

  const hasWork =
    items.length > 0 ||
    suspendedTenants.length > 0 ||
    trialTenants.length > 0 ||
    draftContracts.length > 0 ||
    usageAtRiskTenants.length > 0 ||
    failedImports.length > 0;

  if (!hasWork) {
    return (
      <DashboardSectionCard
        className={DASHBOARD_ENTER_CLASS}
        style={dashboardEnterStyle(1)}
        icon={AppIcons.check}
        title="Needs attention"
        subtitle="Nothing urgent right now"
      >
        <p className="px-1 py-6 text-center text-sm text-muted-foreground">
          All clear — no suspended tenants, usage risks, draft contracts, or
          failed imports waiting on you.
        </p>
      </DashboardSectionCard>
    );
  }

  return (
    <div
      className={cn(DASHBOARD_ENTER_CLASS, "grid gap-3 xl:grid-cols-5")}
      style={dashboardEnterStyle(1)}
    >
      <DashboardSectionCard
        className="xl:col-span-2"
        icon={AppIcons.alertTriangle}
        title="Needs attention"
        subtitle="Queues that need an operator"
        badges={
          items.length > 0 ? (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
              {formatNumber(items.length)} open
            </Badge>
          ) : null
        }
      >
        <ul className="divide-y divide-border/50">
          {items.map((item) => (
            <AttentionRow key={item.id} item={item} />
          ))}
        </ul>
      </DashboardSectionCard>

      <DashboardSectionCard
        className="xl:col-span-3"
        icon={AppIcons.activity}
        title="Work queue"
        subtitle="Jump straight into the cases"
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <QueueColumn
            title="Suspended"
            empty="No suspended tenants"
            href="/tenants?status=SUSPENDED"
            items={suspendedTenants.map((tenant) => ({
              id: tenant.id,
              href: `/tenants/${tenant.id}`,
              primary: tenant.name,
              secondary: tenant.slug,
              meta: formatRelativeTime(tenant.createdAt),
            }))}
          />
          <QueueColumn
            title="Near limits"
            empty="No usage risks"
            href="/dashboard"
            items={usageAtRiskTenants.map((tenant) => ({
              id: `${tenant.id}-${tenant.metric}`,
              href: `/tenants/${tenant.id}`,
              primary: tenant.name,
              secondary: `${tenant.metric} · ${tenant.percent}%`,
              meta:
                tenant.metric === "storage"
                  ? `${formatStorageBytes(tenant.used)} / ${formatStorageBytes(tenant.limit)}`
                  : `${formatNumber(tenant.used)} / ${formatNumber(tenant.limit)}`,
            }))}
          />
          <QueueColumn
            title="Failed imports"
            empty="No failed imports"
            href="/imports"
            items={failedImports.slice(0, 5).map((job) => ({
              id: job.id,
              href: `/tenants/${job.tenant.id}`,
              primary: job.tenant.name,
              secondary: job.status.replaceAll("_", " "),
              meta: `${formatNumber(job.failedRows)} failed · ${formatRelativeTime(job.createdAt)}`,
            }))}
          />
          <QueueColumn
            title="On trial"
            empty="No trial tenants"
            href="/tenants?status=TRIAL"
            items={trialTenants.map((tenant) => ({
              id: tenant.id,
              href: `/tenants/${tenant.id}`,
              primary: tenant.name,
              secondary: tenant.slug,
              meta: formatRelativeTime(tenant.createdAt),
            }))}
          />
          <QueueColumn
            title="Draft contracts"
            empty="No draft contracts"
            href="/contracts?status=DRAFT"
            items={draftContracts.map((contract) => ({
              id: contract.id,
              href: `/contracts/${contract.id}`,
              primary: contract.contractName?.trim() || "Untitled contract",
              secondary: contract.planName,
              meta: `${formatNumber(contract.agreedPrice)} ${contract.currency}`,
            }))}
          />
        </div>
      </DashboardSectionCard>
    </div>
  );
}

function AttentionRow({ item }: { item: PlatformAttentionItem }) {
  return (
    <li>
      <Link
        href={item.href}
        className="flex items-start gap-3 px-1 py-3 transition-colors hover:bg-muted/30"
      >
        <span
          className={cn(
            "mt-1 size-2 shrink-0 rounded-full",
            severityDot(item.severity),
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-medium text-foreground">
              {item.title}
            </p>
            <Badge
              variant="outline"
              className={cn(
                "h-5 shrink-0 px-1.5 text-[10px]",
                severityBadge(item.severity),
              )}
            >
              {formatNumber(item.count)}
            </Badge>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {item.description}
          </p>
        </div>
        <AppIcons.chevronRight className="mt-1 size-4 shrink-0 text-muted-foreground/50" />
      </Link>
    </li>
  );
}

function QueueColumn({
  title,
  empty,
  href,
  items,
}: {
  title: string;
  empty: string;
  href: string;
  items: Array<{
    id: string;
    href: string;
    primary: string;
    secondary: string;
    meta: string;
  }>;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        <Link
          href={href}
          className="text-[11px] font-medium text-primary hover:underline"
        >
          View all
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-border/60 px-2.5 py-4 text-center text-xs text-muted-foreground">
          {empty}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={item.href}
                className="block rounded-md border border-border/50 bg-muted/20 px-2.5 py-2 transition-colors hover:bg-muted/40"
              >
                <p className="truncate text-xs font-medium text-foreground">
                  {item.primary}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {item.secondary}
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground/80">
                  {item.meta}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function severityDot(severity: PlatformAttentionSeverity): string {
  switch (severity) {
    case "critical":
      return "bg-destructive";
    case "warning":
      return "bg-amber-500";
    default:
      return "bg-sky-500";
  }
}

function severityBadge(severity: PlatformAttentionSeverity): string {
  switch (severity) {
    case "critical":
      return "border-destructive/30 text-destructive";
    case "warning":
      return "border-amber-500/30 text-amber-700 dark:text-amber-400";
    default:
      return "border-sky-500/30 text-sky-700 dark:text-sky-400";
  }
}
