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
import { TeamsSettingsCard } from "@/features/teams/components/teams-settings-card";
import { LeadDistributionCard } from "@/features/tenant-settings/components/lead-distribution-card";
import { IntegrationsCard } from "@/features/api-keys/components/integrations-card";

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
        {/* grid-cols-1 = minmax(0,1fr): keeps the horizontally scrolling nav
            from widening the card on narrow screens. */}
        <div className="grid min-h-[28rem] grid-cols-1 lg:grid-cols-[14rem_minmax(0,1fr)]">
          <aside className="min-w-0 bg-muted/20 lg:border-r lg:border-border/50">
            <SettingsNav
              activeSection={activeSection}
              onSelect={setActiveSection}
            />
          </aside>

          <div className="min-w-0 px-5 py-5 md:px-6">
            {activeSection === "profile" ? <ProfileSettingsCard /> : null}
            {activeSection === "workspace" ? <WorkspaceSettingsCard /> : null}
            {activeSection === "teams" ? <TeamsSettingsCard /> : null}
            {activeSection === "distribution" ? <LeadDistributionCard /> : null}
            {activeSection === "integrations" ? <IntegrationsCard /> : null}
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
