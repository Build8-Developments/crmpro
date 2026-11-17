"use client";

import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { AppIcons } from "@/components/icons/app-icons";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { apiClient } from "@/lib/api/client";
import { cn } from "@/lib/utils";

interface Usage {
  used: number;
  limit: number | null;
}

interface BillingOverview {
  workspace: { name: string; status: string };
  plan: {
    name: string;
    price: number | null;
    currency: string | null;
    features: Record<string, boolean>;
  };
  contract: {
    name: string | null;
    status: string;
    agreedPrice: number;
    currency: string;
    paymentMethod: string;
    paymentFrequency: string;
    startsAt: string;
    endsAt: string | null;
    gracePeriodDays: number | null;
    autoRenew: boolean;
  } | null;
  usage: {
    users: Usage;
    leads: Usage;
    projects: Usage;
    storageBytes: { used: string; limit: string | null };
  };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

export function BillingCard() {
  const t = useTranslations("billing");
  const { data, isLoading } = useQuery({
    queryKey: ["billing", "overview"],
    queryFn: () => apiClient.get<BillingOverview>("/billing/overview"),
  });

  if (isLoading || !data) {
    return <Skeleton className="h-72 w-full" />;
  }

  const money = (amount: number, currency: string | null) =>
    new Intl.NumberFormat(undefined, {
      style: currency ? "currency" : "decimal",
      currency: currency ?? undefined,
      maximumFractionDigits: 0,
    }).format(amount);
  const date = (iso: string) =>
    new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(iso));

  const usageRows: Array<[string, number, number | null, string?]> = [
    [t("users"), data.usage.users.used, data.usage.users.limit],
    [t("leads"), data.usage.leads.used, data.usage.leads.limit],
    [t("projects"), data.usage.projects.used, data.usage.projects.limit],
    [
      t("storage"),
      Number(data.usage.storageBytes.used),
      data.usage.storageBytes.limit === null ? null : Number(data.usage.storageBytes.limit),
      "bytes",
    ],
  ];

  return (
    <SettingsSection title={t("title")} description={t("description")}>
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{t("plan")}</p>
            <p className="mt-1 text-lg font-semibold">{data.plan.name}</p>
            {data.plan.price !== null ? (
              <p className="text-xs text-muted-foreground">{money(data.plan.price, data.plan.currency)}</p>
            ) : null}
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">{t("contract")}</p>
            {data.contract ? (
              <div className="mt-1 space-y-0.5 text-sm">
                <p className="flex items-center gap-2 font-medium">
                  {money(data.contract.agreedPrice, data.contract.currency)}
                  <Badge variant="outline" className="h-5 px-1.5 text-[10px] capitalize">
                    {data.contract.status.toLowerCase()}
                  </Badge>
                </p>
                <p className="text-xs text-muted-foreground">
                  {t(`paymentMethods.${data.contract.paymentMethod}` as "paymentMethods.CASH")} ·{" "}
                  {data.contract.paymentFrequency.toLowerCase()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {date(data.contract.startsAt)} ·{" "}
                  {data.contract.endsAt
                    ? t("until", { date: date(data.contract.endsAt) })
                    : t("openEnded")}
                  {data.contract.autoRenew ? ` · ${t("renews")}` : ""}
                </p>
              </div>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">{t("noContract")}</p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">{t("usage")}</p>
          <div className="space-y-3 rounded-lg border p-3">
            {usageRows.map(([label, used, limit, unit]) => {
              const percent = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
              const format = (value: number) =>
                unit === "bytes" ? formatBytes(value) : value.toLocaleString();
              return (
                <div key={label} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span>{label}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {format(used)} / {limit === null ? t("unlimited") : format(limit)}
                    </span>
                  </div>
                  {limit !== null ? (
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          percent >= 90 ? "bg-destructive" : percent >= 75 ? "bg-amber-500" : "bg-primary",
                        )}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">{t("features")}</p>
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {Object.entries(data.plan.features).map(([feature, enabled]) => (
              <li key={feature} className="flex items-center gap-2 text-sm">
                {enabled ? (
                  <AppIcons.check className="size-4 text-primary" />
                ) : (
                  <AppIcons.close className="size-4 text-muted-foreground" />
                )}
                <span className={cn(!enabled && "text-muted-foreground")}>
                  {t.has(`featureNames.${feature}`)
                    ? t(`featureNames.${feature}` as "featureNames.analytics")
                    : feature}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">{t("contactSupport")}</p>
        </div>
      </div>
    </SettingsSection>
  );
}
