"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * The project drawer is open while the URL has `?id=<projectId>` — the link
 * notifications and the Today card use. The URL is the only state, so a
 * shared link, a notification click and a row click all behave the same.
 */
export function useProjectDetailUrl() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const projectId = searchParams.get("id");

  const setProjectId = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (id) {
        params.set("id", id);
      } else {
        params.delete("id");
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const openProject = useCallback((id: string) => setProjectId(id), [setProjectId]);
  const closeProject = useCallback(() => setProjectId(null), [setProjectId]);

  return { projectId, openProject, closeProject };
}
