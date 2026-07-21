"use client";

import Link from "next/link";
import { useState } from "react";
import { ADMIN_PERMISSIONS } from "@crmpro/shared";
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
import { PlanArchiveDialog } from "@/features/plans/components/plan-archive-dialog";
import { PlanFormDialog } from "@/features/plans/components/plan-form-dialog";
import { usePlan } from "@/features/plans/hooks";
import { useUnarchivePlan } from "@/features/plans/mutations";
import {
  PLAN_FEATURE_FLAG_OPTIONS,
  type PlanListItem,
} from "@/features/plans/types";
import { usePermissions } from "@/hooks/use-permissions";
import {
  formatDate,
  formatMoney,
  formatNumber,
  formatStorageBytes,
} from "@/lib/format";
import { cn } from "@/lib/utils";

interface PlanDetailPageProps {
  planId: string;
}

export function PlanDetailPage({ planId }: PlanDetailPageProps) {
  const { data: plan, isLoading, isError, refetch, isFetching } =
    usePlan(planId);
  const { can } = usePermissions();
  const unarchivePlan = useUnarchivePlan();
  const [formOpen, setFormOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);

  if (isLoading && !plan) {
    return (
      <div className="space-y-4 px-6 py-5 md:px-8">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !plan) {
    return (
      <div className="space-y-4 px-6 py-5 md:px-8">
        <Button variant="ghost" size="sm" asChild className="h-8 px-2">
          <Link href="/plans">
            <AppIcons.arrowLeft className="size-3.5" />
            Plans
          </Link>
        </Button>
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AppIcons.alertCircle className="size-5" />
              Failed to load plan
            </CardTitle>
            <CardDescription>
              This plan may have been removed or you don&apos;t have access.
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

  const planForDialog: PlanListItem = plan;
  const enabledFlags = PLAN_FEATURE_FLAG_OPTIONS.filter(
    (option) => plan.featureFlags?.[option.key],
  );

  return (
    <div className="space-y-4 px-6 py-5 md:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-2">
          <Button variant="ghost" size="sm" asChild className="h-8 px-2">
            <Link href="/plans">
              <AppIcons.arrowLeft className="size-3.5" />
              Plans
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              {plan.name}
            </h1>
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
          </div>
          {plan.description ? (
            <p className="max-w-2xl text-sm text-muted-foreground">
              {plan.description}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          {can(ADMIN_PERMISSIONS.PLAN_UPDATE) ? (
            <Button size="sm" variant="outline" onClick={() => setFormOpen(true)}>
              <AppIcons.edit className="size-3.5" />
              Edit
            </Button>
          ) : null}
          {can(ADMIN_PERMISSIONS.PLAN_UPDATE) ? (
            plan.isActive ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setArchiveOpen(true)}
              >
                Archive
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                disabled={unarchivePlan.isPending}
                onClick={() => void unarchivePlan.mutateAsync(plan.id)}
              >
                {unarchivePlan.isPending ? "Restoring..." : "Restore"}
              </Button>
            )
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <DetailCard title="Pricing">
          <DetailRow
            label="Default price"
            value={formatMoney(plan.defaultPrice, plan.currency)}
          />
          <DetailRow label="Currency" value={plan.currency ?? "—"} />
        </DetailCard>

        <DetailCard title="Limits">
          <DetailRow
            label="Users"
            value={plan.maxUsers != null ? formatNumber(plan.maxUsers) : "Unlimited"}
          />
          <DetailRow
            label="Leads"
            value={plan.maxLeads != null ? formatNumber(plan.maxLeads) : "Unlimited"}
          />
          <DetailRow
            label="Projects"
            value={
              plan.maxProjects != null
                ? formatNumber(plan.maxProjects)
                : "Unlimited"
            }
          />
          <DetailRow
            label="Storage"
            value={formatStorageBytes(plan.maxStorageBytes)}
          />
        </DetailCard>

        <DetailCard title="Usage">
          <DetailRow
            label="Tenants on plan"
            value={formatNumber(plan.tenantCount)}
          />
          <DetailRow label="Created" value={formatDate(plan.createdAt)} />
          <DetailRow label="Updated" value={formatDate(plan.updatedAt)} />
        </DetailCard>
      </div>

      <Card className="gap-4 py-4 shadow-sm">
        <CardHeader className="px-5 pb-0">
          <CardTitle className="text-sm">Feature flags</CardTitle>
        </CardHeader>
        <CardContent className="px-5">
          {enabledFlags.length === 0 ? (
            <p className="text-sm text-muted-foreground">No features enabled.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {enabledFlags.map((option) => (
                <Badge
                  key={option.key}
                  variant="secondary"
                  className="h-6 px-2 text-[11px]"
                >
                  {option.label}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <PlanFormDialog
        open={formOpen}
        plan={planForDialog}
        onClose={() => setFormOpen(false)}
      />
      <PlanArchiveDialog
        plan={planForDialog}
        open={archiveOpen}
        onClose={() => setArchiveOpen(false)}
      />
    </div>
  );
}

function DetailCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-3 py-4 shadow-sm">
      <CardHeader className="px-5 pb-0">
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 px-5">{children}</CardContent>
    </Card>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums text-foreground">{value}</span>
    </div>
  );
}
