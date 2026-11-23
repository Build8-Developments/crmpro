"use client";

import Link from "next/link";
import { SettingsSection } from "@/components/crm/settings-section";
import { SettingsPageBody } from "@/components/crm/settings-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatFileSize } from "@/features/files/utils/file-formatters";
import { ContractTermsSection } from "@/features/organization/components/contract-terms-section";
import { useOrganizationUsage } from "@/features/organization/hooks";
import type { UsageMetric } from "@/features/organization/types";
import { usePermissions } from "@/hooks/use-permissions";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function PlanUsagePage() {
  const { data, isLoading, isError, refetch } = useOrganizationUsage();
  const { can } = usePermissions();

  return (
    <SettingsPageBody>
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : isError || !data ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-4 text-sm text-muted-foreground">
          Plan details could not be loaded.
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      ) : (
        <>
          <SettingsSection
            title="Plan"
            description="Set by CRMPro under your contract"
            action={
              can("support.create") ? (
                <Button asChild variant="outline" size="sm">
                  <Link href="/support">Change plan</Link>
                </Button>
              ) : null
            }
          >
            <div className="rounded-lg border border-border/60 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-lg font-semibold text-foreground">
                  {data.plan.name}
                </p>
                <Badge variant="outline" className="capitalize">
                  {data.status.toLowerCase()}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {data.limits.source === "snapshot" && data.limits.capturedAt
                  ? `Features and limits as signed on ${dateFormatter.format(new Date(data.limits.capturedAt))}`
                  : "Features and limits of the current plan"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <FeatureChip enabled={data.plan.features.analytics}>
                  Dashboard analytics
                </FeatureChip>
                <FeatureChip enabled={data.plan.features.importExport}>
                  CSV import & export
                </FeatureChip>
              </div>
            </div>
          </SettingsSection>

          <ContractTermsSection contract={data.contract} />

          <SettingsSection
            title="Usage"
            description={
              data.limits.source === "snapshot" && data.limits.capturedAt
                ? `How much of your limits you are using · limits as signed on ${dateFormatter.format(new Date(data.limits.capturedAt))}`
                : "How much of your plan's limits you are using"
            }
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <UsageCard label="Active users" metric={data.usage.users} />
              <UsageCard label="Leads" metric={data.usage.leads} />
              <UsageCard label="Projects" metric={data.usage.projects} />
              <UsageCard
                label="File storage"
                metric={data.usage.storageBytes}
                format={formatFileSize}
              />
            </div>
          </SettingsSection>
        </>
      )}
    </SettingsPageBody>
  );
}

function FeatureChip({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "rounded-full border px-2.5 py-1 text-xs",
        enabled
          ? "border-primary/30 bg-primary/10 text-foreground"
          : "border-border/60 text-muted-foreground line-through",
      )}
    >
      {children}
      <span className="sr-only">{enabled ? " (included)" : " (not included)"}</span>
    </span>
  );
}

function UsageCard({
  label,
  metric,
  format = formatNumber,
}: {
  label: string;
  metric: UsageMetric;
  format?: (value: number) => string;
}) {
  const ratio =
    metric.limit && metric.limit > 0
      ? Math.min(metric.used / metric.limit, 1)
      : 0;
  const tone =
    ratio >= 1 ? "bg-destructive" : ratio >= 0.8 ? "bg-amber-500" : "bg-primary";

  return (
    <div className="rounded-lg border border-border/60 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">
          {format(metric.used)}
          <span className="text-muted-foreground">
            {" "}
            / {metric.limit === null ? "Unlimited" : format(metric.limit)}
          </span>
        </p>
      </div>
      {metric.limit !== null ? (
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label={`${label} usage`}
          aria-valuemin={0}
          aria-valuemax={metric.limit}
          aria-valuenow={metric.used}
        >
          <div
            className={cn("h-full rounded-full", tone)}
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
