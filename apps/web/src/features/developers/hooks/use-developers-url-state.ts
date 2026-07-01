"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

interface UseDevelopersUrlStateOptions {
  debouncedSearch: string;
  setSearch: (value: string) => void;
  highlightedDeveloperId: string | null;
  setHighlightedDeveloperId: (developerId: string | null) => void;
}

export function useDevelopersUrlState({
  debouncedSearch,
  setSearch,
  highlightedDeveloperId,
  setHighlightedDeveloperId,
}: UseDevelopersUrlStateOptions) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const appliedRef = useRef<string | null>(null);

  useEffect(() => {
    const signature = searchParams.toString();
    if (!signature || appliedRef.current === signature) {
      return;
    }

    const urlSearch = searchParams.get("search");
    if (urlSearch !== null) {
      setSearch(urlSearch);
    }

    const developerId = searchParams.get("developerId");
    if (developerId) {
      setHighlightedDeveloperId(developerId);
    }

    appliedRef.current = signature;
  }, [searchParams, setHighlightedDeveloperId, setSearch]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const nextSearch = debouncedSearch.trim();

    if (nextSearch) {
      params.set("search", nextSearch);
    } else {
      params.delete("search");
    }

    if (highlightedDeveloperId) {
      params.set("developerId", highlightedDeveloperId);
    } else {
      params.delete("developerId");
    }

    const next = params.toString();
    const current = searchParams.toString();

    if (next !== current) {
      router.replace(next ? `${pathname}?${next}` : pathname, {
        scroll: false,
      });
    }
  }, [
    debouncedSearch,
    highlightedDeveloperId,
    pathname,
    router,
    searchParams,
  ]);
}
