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
      key={data.map((p) => `${p.category}:${p.enabled}`).join("|")}
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
        const original = initialPrefs.find(
          (item) => item.category === pref.category,
        );
        return original ? original.enabled !== pref.enabled : false;
      }),
    [initialPrefs, localPrefs],
  );

  const toggle = (category: NotificationPreference["category"]) => {
    if (!canUpdate) return;
    setLocalPrefs((current) =>
      current.map((pref) =>
        pref.category === category
          ? { ...pref, enabled: !pref.enabled }
          : pref,
      ),
    );
  };

  const handleSave = async () => {
    if (!isDirty) return;
    await updatePreferences.mutateAsync({
      preferences: localPrefs.map((pref) => ({
        category: pref.category,
        enabled: pref.enabled,
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
      <ul className="overflow-hidden rounded-lg border border-border/60">
        {localPrefs.map((pref, index) => (
          <li
            key={pref.category}
            className={cn(index > 0 && "border-t border-border/50")}
          >
            <label
              className={cn(
                "flex items-center justify-between gap-3 px-3 py-2.5",
                canUpdate && "cursor-pointer hover:bg-muted/25",
              )}
            >
              <div className="min-w-0">
                <p className="text-sm text-foreground">{pref.label}</p>
                <p className="text-[11px] text-muted-foreground">
                  {pref.enabled ? "On" : "Off"}
                </p>
              </div>
              <Checkbox
                checked={pref.enabled}
                disabled={!canUpdate}
                onCheckedChange={() => toggle(pref.category)}
                aria-label={pref.label}
              />
            </label>
          </li>
        ))}
      </ul>
    </SettingsSection>
  );
}
