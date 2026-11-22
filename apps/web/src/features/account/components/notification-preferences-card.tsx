"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { SettingsSection } from "@/components/crm/settings-section";
import { useNotificationPreferences } from "@/features/account/hooks";
import { useUpdateNotificationPreferences } from "@/features/account/mutations";
import type { NotificationPreference } from "@/features/account/types";
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
      key={data.map((p) => `${p.category}:${p.enabled}:${p.emailEnabled}`).join("|")}
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

  const isDirty = useMemo(
    () =>
      localPrefs.some((pref) => {
        const original = initialPrefs.find((item) => item.category === pref.category);
        return original
          ? original.enabled !== pref.enabled || original.emailEnabled !== pref.emailEnabled
          : false;
      }),
    [initialPrefs, localPrefs],
  );

  const toggle = (category: NotificationPreference["category"], field: "enabled" | "emailEnabled") => {
    if (!canUpdate) return;
    setLocalPrefs((current) =>
      current.map((pref) => (pref.category === category ? { ...pref, [field]: !pref[field] } : pref)),
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
      description="Choose which alerts you receive in the app, and which also come by email"
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
      <div className="overflow-hidden rounded-lg border border-border/60">
        <div className="grid grid-cols-[1fr_4rem_4rem] items-center gap-2 border-b border-border/60 bg-muted/30 px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
          <span>Alert</span>
          <span className="text-center">In app</span>
          <span className="text-center">Email</span>
        </div>
        <ul>
          {localPrefs.map((pref, index) => (
            <li
              key={pref.category}
              className={cn(
                "grid grid-cols-[1fr_4rem_4rem] items-center gap-2 px-3 py-2.5",
                index > 0 && "border-t border-border/50",
              )}
            >
              <span className="min-w-0 text-sm text-foreground">{pref.label}</span>
              <span className="flex justify-center">
                <Checkbox
                  checked={pref.enabled}
                  disabled={!canUpdate}
                  onCheckedChange={() => toggle(pref.category, "enabled")}
                  aria-label={`${pref.label} in the app`}
                />
              </span>
              <span className="flex justify-center">
                <Checkbox
                  checked={pref.enabled && pref.emailEnabled}
                  disabled={!canUpdate || !pref.enabled}
                  onCheckedChange={() => toggle(pref.category, "emailEnabled")}
                  aria-label={`${pref.label} by email`}
                  title={pref.enabled ? undefined : "Turn it on in the app first"}
                />
              </span>
            </li>
          ))}
        </ul>
      </div>
    </SettingsSection>
  );
}
