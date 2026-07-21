"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Opens a create dialog when the URL contains `?create=1`, then strips the param.
 */
export function useOpenCreateFromQuery(onOpen: () => void) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (searchParams.get("create") !== "1") {
      return;
    }

    onOpen();

    const next = new URLSearchParams(searchParams.toString());
    next.delete("create");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [onOpen, pathname, router, searchParams]);
}
