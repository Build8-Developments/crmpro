"use client";

import { useState } from "react";
import { NotificationPreferencesCard } from "@/features/settings/components/notification-preferences-card";
import { ProfileSettingsCard } from "@/features/settings/components/profile-settings-card";
import { SessionsSettingsCard } from "@/features/settings/components/sessions-settings-card";
import {
  SettingsNav,
  type SettingsSectionId,
} from "@/features/settings/components/settings-nav";
import { WorkspaceSettingsCard } from "@/features/settings/components/workspace-settings-card";

export function SettingsPage() {
  const [activeSection, setActiveSection] =
    useState<SettingsSectionId>("profile");

  return (
    <div className="space-y-4 px-6 py-5 md:px-8">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Account, workspace, and preferences
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
        <div className="grid min-h-[28rem] lg:grid-cols-[14rem_1fr]">
          <aside className="bg-muted/20 lg:border-r lg:border-border/50">
            <SettingsNav
              activeSection={activeSection}
              onSelect={setActiveSection}
            />
          </aside>

          <div className="px-5 py-5 md:px-6">
            {activeSection === "profile" ? <ProfileSettingsCard /> : null}
            {activeSection === "workspace" ? <WorkspaceSettingsCard /> : null}
            {activeSection === "sessions" ? <SessionsSettingsCard /> : null}
            {activeSection === "notifications" ? (
              <NotificationPreferencesCard />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
