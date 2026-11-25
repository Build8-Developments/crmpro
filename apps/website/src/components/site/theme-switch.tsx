"use client";

import { useEffect, useSyncExternalStore } from "react";
import { IconDeviceDesktop, IconMoon, IconSun } from "@tabler/icons-react";
import { THEME_MODES, applyThemeMode, readThemeMode, subscribeThemeMode } from "@/lib/theme";
import { cn } from "@/lib/utils";

const ICONS = { system: IconDeviceDesktop, light: IconSun, dark: IconMoon } as const;

/**
 * System / light / dark. The choice is saved; the init script in the layout
 * applies it before paint, so there is no flash on the next visit.
 */
export function ThemeSwitch({
  labels,
  className,
}: {
  labels: { group: string; system: string; light: string; dark: string };
  className?: string;
}) {
  // null on the server: no option shows as checked until the saved choice is known.
  const mode = useSyncExternalStore(subscribeThemeMode, readThemeMode, () => null);

  // While following the system, track it live.
  useEffect(() => {
    if (mode !== "system") return;
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyThemeMode("system");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [mode]);

  return (
    <div
      role="radiogroup"
      aria-label={labels.group}
      className={cn("inline-flex items-center rounded-lg border border-border p-0.5", className)}
    >
      {THEME_MODES.map((option) => {
        const Icon = ICONS[option];
        const checked = mode === option;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={labels[option]}
            title={labels[option]}
            onClick={() => applyThemeMode(option)}
            className={cn(
              "grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:text-foreground",
              checked && "bg-muted text-foreground",
            )}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </div>
  );
}
