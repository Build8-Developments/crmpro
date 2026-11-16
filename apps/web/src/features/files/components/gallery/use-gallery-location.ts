"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FileAssetCategory } from "@/features/files/types";

/** System views: files the app creates, grouped by category (read-only). */
export const SYSTEM_VIEWS = [
  { category: "LEAD_ATTACHMENT", label: "Lead attachments" },
  { category: "IMPORT_FILE", label: "Imports" },
  { category: "EXPORT_FILE", label: "Exports" },
] as const satisfies ReadonlyArray<{ category: FileAssetCategory; label: string }>;

export type GalleryView = "grid" | "list";

export type GalleryLocation =
  | { kind: "folder"; folderId: string | null } // null = Home (root)
  | { kind: "system"; category: FileAssetCategory };

/** Gallery location, search and view mode, kept in the URL so it deep-links. */
export function useGalleryLocation() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const location = useMemo<GalleryLocation>(() => {
    const system = searchParams.get("system");
    const match = SYSTEM_VIEWS.find((view) => view.category === system);
    if (match) return { kind: "system", category: match.category };
    return { kind: "folder", folderId: searchParams.get("folder") };
  }, [searchParams]);

  const search = searchParams.get("q") ?? "";
  const view: GalleryView = searchParams.get("view") === "list" ? "list" : "grid";

  const update = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (value === null || value === "") next.delete(key);
        else next.set(key, value);
      }
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  return {
    location,
    search,
    view,
    openFolder: (folderId: string | null) =>
      update({ folder: folderId, system: null, q: null }),
    openSystem: (category: FileAssetCategory) =>
      update({ system: category, folder: null, q: null }),
    setSearch: (value: string) => update({ q: value || null }),
    setView: (value: GalleryView) =>
      update({ view: value === "grid" ? null : value }),
  };
}
