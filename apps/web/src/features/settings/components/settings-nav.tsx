"use client";

import { AppIcons } from "@/components/icons/app-icons";
import { cn } from "@/lib/utils";

export type SettingsSectionId =
  | "profile"
  | "workspace"
  | "sessions"
  | "notifications";

const SECTIONS: Array<{
  id: SettingsSectionId;
  label: string;
  description: string;
  icon: typeof AppIcons.user;
}> = [
  {
    id: "profile",
    label: "Profile",
    description: "Name and account",
    icon: AppIcons.user,
  },
  {
    id: "workspace",
    label: "Workspace",
    description: "Agency details",
    icon: AppIcons.building,
  },
  {
    id: "sessions",
    label: "Security",
    description: "Active devices",
    icon: AppIcons.lock,
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Alert preferences",
    icon: AppIcons.notifications,
  },
];

interface SettingsNavProps {
  activeSection: SettingsSectionId;
  onSelect: (section: SettingsSectionId) => void;
}

export function SettingsNav({ activeSection, onSelect }: SettingsNavProps) {
  return (
    <nav className="flex gap-1 overflow-x-auto p-2 lg:flex-col lg:overflow-visible">
      {SECTIONS.map((section) => {
        const Icon = section.icon;
        const active = section.id === activeSection;
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onSelect(section.id)}
            className={cn(
              "flex min-w-[9.5rem] items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors lg:min-w-0 lg:w-full",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-md",
                active
                  ? "bg-primary/10 text-primary"
                  : "bg-muted/70 text-muted-foreground",
              )}
            >
              <Icon className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-medium">{section.label}</span>
              <span className="hidden text-[11px] text-muted-foreground lg:block">
                {section.description}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
