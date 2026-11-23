"use client";

import { useEffect } from "react";
import { useBreadcrumbStore, type Crumb } from "@/stores/breadcrumb-store";

/**
 * Lets a page add crumbs below its route in the topbar, e.g.
 * Files › Brochures › Palm Hills. Cleared when the page unmounts.
 */
export function usePageBreadcrumbs(trail: Crumb[]) {
  const setTrail = useBreadcrumbStore((state) => state.setTrail);
  const key = JSON.stringify(trail);

  useEffect(() => {
    setTrail(JSON.parse(key) as Crumb[]);
    return () => setTrail([]);
  }, [key, setTrail]);
}
