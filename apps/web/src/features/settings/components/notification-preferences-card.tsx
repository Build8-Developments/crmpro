"use client";

import { useTranslations } from "next-intl";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SettingsSection } from "@/features/settings/components/settings-section";
import { useNotificationPreferences } from "@/features/settings/hooks";
import { useUpdateNotificationPreferences } from "@/features/settings/mutations";
import type { NotificationPreference } from "@/features/settings/types";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";

export function NotificationPreferencesCard() {
  const { can } = usePermissions();
  const canRead = can("notification.read");
  const canUpdate = can("notification.update");

  const { data, isLoading, isError, refetch, isFetching } =
    useNotificationPreferences({ enabled: canRead });

  if (!canRead) {
    return (
      <SettingsSection
        title="Notifications"
        description="Choose which alerts you receive"
      >
        <p className="text-sm text-muted-foreground">
          You don&apos;t have permission to view notification preferences.
        </p>
      </SettingsSection>
    );
  }

  if (isLoading) {
    return (
      <SettingsSection
        title="Notifications"
        description="Choose which alerts you receive"
      >
        <p className="text-sm text-muted-foreground">Loading preferences...</p>
      </SettingsSection>
    );
  }

  if (isError || !data) {
    return (
      <SettingsSection
        title="Notifications"
        description="Choose which alerts you receive"
      >
        <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 px-3 py-2.5">
          <p className="text-sm text-destructive">
            Failed to load notification preferences
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            Retry
          </Button>
        </div>
      </SettingsSection>
    );
  }

  return (
    <NotificationPreferencesEditor
      key={data
        .map((p) => `${p.category}:${p.enabled}:${p.emailEnabled}`)
        .join("|")}
      initialPrefs={data}
      canUpdate={canUpdate}
    />
  );
}

function NotificationPreferencesEditor({
  initialPrefs,
  canUpdate,
}: {
  initialPrefs: NotificationPreference[];
  canUpdate: boolean;
}) {
  const updatePreferences = useUpdateNotificationPreferences();
  const [localPrefs, setLocalPrefs] = useState(initialPrefs);
  const t = useTranslations("settings.notifications");

  const isDirty = useMemo(
    () =>
      localPrefs.some((pref) => {
        const original = initialPrefs.find(
          (item) => item.category === pref.category,
        );
        return original
          ? original.enabled !== pref.enabled ||
              original.emailEnabled !== pref.emailEnabled
          : false;
      }),
    [initialPrefs, localPrefs],
  );

  const toggle = (
    category: NotificationPreference["category"],
    field: "enabled" | "emailEnabled" = "enabled",
  ) => {
    if (!canUpdate) return;
    setLocalPrefs((current) =>
      current.map((pref) =>
        pref.category === category ? { ...pref, [field]: !pref[field] } : pref,
      ),
    );
  };

  const handleSave = async () => {
    if (!isDirty) return;
    await updatePreferences.mutateAsync({
      preferences: localPrefs.map((pref) => ({
        category: pref.category,
        enabled: pref.enabled,
        emailEnabled: pref.emailEnabled,
      })),
    });
  };

  return (
    <SettingsSection
      title="Notifications"
      description="Choose which alerts you receive"
      action={
        canUpdate ? (
          <Button
            type="button"
            size="sm"
            className="h-8"
            disabled={!isDirty || updatePreferences.isPending}
            onClick={() => void handleSave()}
          >
            {updatePreferences.isPending ? "Saving..." : "Save changes"}
          </Button>
        ) : null
      }
    >
      <div className="flex justify-end gap-6 px-3 text-[11px] font-medium text-muted-foreground">
        <span>{t("inApp")}</span>
        <span>{t("email")}</span>
      </div>
      <ul className="overflow-hidden rounded-lg border border-border/60">
        {localPrefs.map((pref, index) => (
          <li
            key={pref.category}
            className={cn(index > 0 && "border-t border-border/50")}
          >
            <div className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm text-foreground">{pref.label}</p>
                <p className="text-[11px] text-muted-foreground">
                  {pref.enabled ? "On" : "Off"}
                </p>
              </div>
              <div className="flex items-center gap-9 pe-2">
                <Checkbox
                  checked={pref.enabled}
                  disabled={!canUpdate}
                  onCheckedChange={() => toggle(pref.category)}
                  aria-label={`${pref.label} · ${t("inApp")}`}
                />
                {/* Email copies only make sense while the category is on. */}
                <Checkbox
                  checked={pref.enabled && pref.emailEnabled}
                  disabled={!canUpdate || !pref.enabled}
                  onCheckedChange={() => toggle(pref.category, "emailEnabled")}
                  aria-label={`${pref.label} · ${t("email")}`}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </SettingsSection>
  );
}
