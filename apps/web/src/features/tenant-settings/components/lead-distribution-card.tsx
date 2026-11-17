"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { useTenantSettings } from "@/features/tenant-settings/hooks";
import { useUpdateTenantSettings } from "@/features/tenant-settings/mutations";
import type { SlaAction, TenantSettings } from "@/features/tenant-settings/types";
import { updateLeadRouting } from "@/features/users/api";
import { useUsers } from "@/features/users/hooks";
import { usePermissions } from "@/hooks/use-permissions";
import { queryKeys } from "@/lib/query/query-keys";
import { useApiMutation } from "@/lib/query/use-api-mutation";
import { cn } from "@/lib/utils";

const SLA_PRESETS = [5, 15, 30, 60] as const;

export function LeadDistributionCard() {
  const { data, isLoading } = useTenantSettings();

  if (isLoading || !data) {
    return <Skeleton className="h-64 w-full" />;
  }

  return <LeadDistributionForm key={data.updatedAt} settings={data} />;
}

function LeadDistributionForm({ settings }: { settings: TenantSettings }) {
  const t = useTranslations("distribution");
  const { can } = usePermissions();
  const canEdit = can("tenant.manage");
  const update = useUpdateTenantSettings();
  const [autoAssign, setAutoAssign] = useState(settings.autoAssignEnabled);
  const [slaMinutes, setSlaMinutes] = useState<number | null>(
    settings.slaFirstResponseMinutes,
  );
  const [slaAction, setSlaAction] = useState<SlaAction>(settings.slaAction);

  const dirty =
    autoAssign !== settings.autoAssignEnabled ||
    slaMinutes !== settings.slaFirstResponseMinutes ||
    slaAction !== settings.slaAction;

  const chip = (active: boolean) =>
    cn(
      "rounded-full border px-2.5 py-1 text-xs transition-colors",
      active
        ? "border-primary bg-primary/10 text-primary"
        : "border-border text-muted-foreground hover:bg-muted/60",
    );

  return (
    <SettingsSection
      title={t("title")}
      description={t("description")}
      action={
        canEdit ? (
          <Button
            size="sm"
            className="h-8"
            disabled={!dirty || update.isPending}
            onClick={() =>
              void update.mutateAsync({
                autoAssignEnabled: autoAssign,
                slaFirstResponseMinutes: slaMinutes,
                slaAction,
              })
            }
          >
            {update.isPending ? t("saving") : t("save")}
          </Button>
        ) : null
      }
    >
      <div className="space-y-5">
        <label className="flex items-start gap-3 rounded-lg border p-3">
          <Checkbox
            className="mt-0.5"
            checked={autoAssign}
            disabled={!canEdit}
            onCheckedChange={(value) => setAutoAssign(Boolean(value))}
          />
          <span>
            <span className="block text-sm font-medium">{t("autoAssign")}</span>
            <span className="block text-xs text-muted-foreground">{t("autoAssignHelp")}</span>
          </span>
        </label>

        {autoAssign ? <LeadReceiversList canEdit={canEdit} /> : null}

        <div className="space-y-2 rounded-lg border p-3">
          <p className="text-sm font-medium">{t("sla")}</p>
          <p className="text-xs text-muted-foreground">{t("slaHelp")}</p>
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <button
              type="button"
              disabled={!canEdit}
              className={chip(slaMinutes === null)}
              onClick={() => setSlaMinutes(null)}
            >
              {t("slaOff")}
            </button>
            {SLA_PRESETS.map((minutes) => (
              <button
                key={minutes}
                type="button"
                disabled={!canEdit}
                className={chip(slaMinutes === minutes)}
                onClick={() => setSlaMinutes(minutes)}
              >
                {t("slaMinutes", { count: minutes })}
              </button>
            ))}
            <Input
              type="number"
              min={1}
              max={10080}
              aria-label={t("slaCustom")}
              placeholder={t("slaCustom")}
              disabled={!canEdit}
              value={
                slaMinutes !== null && !SLA_PRESETS.includes(slaMinutes as 5)
                  ? slaMinutes
                  : ""
              }
              onChange={(event) => {
                const value = Number(event.target.value);
                setSlaMinutes(Number.isFinite(value) && value > 0 ? value : null);
              }}
              className="h-7 w-24 text-xs"
            />
          </div>
          {slaMinutes !== null ? (
            <div className="space-y-1.5 pt-2">
              <p className="text-xs font-medium">{t("slaAction")}</p>
              {(["NOTIFY", "REASSIGN"] as const).map((value) => (
                <label key={value} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="sla-action"
                    checked={slaAction === value}
                    disabled={!canEdit}
                    onChange={() => setSlaAction(value)}
                  />
                  {value === "NOTIFY" ? t("slaNotify") : t("slaReassign")}
                </label>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </SettingsSection>
  );
}

function LeadReceiversList({ canEdit }: { canEdit: boolean }) {
  const t = useTranslations("distribution");
  const { data, isLoading } = useUsers({ limit: 100, isActive: true, sortBy: "name", sortOrder: "asc" });
  const toggle = useApiMutation({
    mutationFn: ({ id, receivesLeads }: { id: string; receivesLeads: boolean }) =>
      updateLeadRouting(id, receivesLeads),
    successMessage: t("routingSaved"),
    invalidateKeys: [queryKeys.users.all()],
  });

  const users = data?.items ?? [];

  return (
    <div className="space-y-2">
      <div>
        <p className="text-sm font-medium">{t("receivers")}</p>
        <p className="text-xs text-muted-foreground">{t("receiversHelp")}</p>
      </div>
      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : users.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("noUsers")}</p>
      ) : (
        <ul className="divide-y rounded-lg border">
          {users.map((user) => (
            <li key={user.id}>
              <label className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="min-w-0">
                  <span className="block truncate text-sm">{user.fullName}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {user.role.name}
                    {user.team ? ` · ${user.team.name}` : ""}
                  </span>
                </span>
                <Checkbox
                  checked={user.receivesLeads}
                  disabled={!canEdit || toggle.isPending}
                  onCheckedChange={(value) =>
                    void toggle.mutateAsync({ id: user.id, receivesLeads: Boolean(value) })
                  }
                />
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
