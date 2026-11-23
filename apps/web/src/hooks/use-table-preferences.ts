"use client";

import { useCallback, useEffect, useState } from "react";
import type { VisibilityState } from "@tanstack/react-table";
import { useAuthStore } from "@/stores/auth-store";

export type TableDensity = "comfortable" | "compact";

export interface TablePreferences {
  columnVisibility: VisibilityState;
  density: TableDensity;
}

const VERSION = 1;

function storageKey(userId: string | undefined, tableId: string) {
  return `crmpro:table:${userId ?? "anon"}:${tableId}:v${VERSION}`;
}

function read(key: string): Partial<TablePreferences> | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as Partial<TablePreferences>) : null;
  } catch {
    return null;
  }
}

function load(key: string, defaults: TablePreferences): TablePreferences {
  const stored = typeof window === "undefined" ? null : read(key);
  return {
    columnVisibility: { ...defaults.columnVisibility, ...(stored?.columnVisibility ?? {}) },
    density: stored?.density ?? defaults.density,
  };
}

/**
 * Per-user, per-table view settings (which columns show, row density),
 * remembered in this browser. Falls back to the defaults when storage is
 * unavailable.
 */
export function useTablePreferences(tableId: string, defaults: TablePreferences) {
  const userId = useAuthStore((state) => state.user?.id);
  const key = storageKey(userId, tableId);
  const [state, setState] = useState(() => ({ key, prefs: load(key, defaults) }));

  // A different user/table: reload during render (no effect round-trip).
  let prefs = state.prefs;
  if (state.key !== key) {
    prefs = load(key, defaults);
    setState({ key, prefs });
  }

  useEffect(() => {
    try {
      window.localStorage.setItem(state.key, JSON.stringify(state.prefs));
    } catch {
      // Private mode / blocked storage: preferences just don't persist.
    }
  }, [state]);

  const update = useCallback(
    (change: (current: TablePreferences) => TablePreferences) =>
      setState((current) => ({ ...current, prefs: change(current.prefs) })),
    [],
  );
  const setColumnVisibility = useCallback(
    (updater: VisibilityState | ((old: VisibilityState) => VisibilityState)) =>
      update((current) => ({
        ...current,
        columnVisibility:
          typeof updater === "function" ? updater(current.columnVisibility) : updater,
      })),
    [update],
  );
  const setDensity = useCallback(
    (density: TableDensity) => update((current) => ({ ...current, density })),
    [update],
  );
  const reset = useCallback(() => update(() => defaults), [update, defaults]);
  /** Apply part of a saved view (columns on top of the defaults, density). */
  const apply = useCallback(
    (next: Partial<TablePreferences>) =>
      update((current) => ({
        columnVisibility: next.columnVisibility
          ? { ...defaults.columnVisibility, ...next.columnVisibility }
          : current.columnVisibility,
        density: next.density ?? current.density,
      })),
    [update, defaults],
  );

  return { ...prefs, setColumnVisibility, setDensity, reset, apply };
}
