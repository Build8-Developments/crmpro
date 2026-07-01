"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { FileCategoryFilter } from "@/features/files/types";

interface UseFilesUrlStateOptions {
  debouncedSearch: string;
  setSearch: (value: string) => void;
  categoryFilter: FileCategoryFilter;
  setCategoryFilter: (filter: FileCategoryFilter) => void;
  highlightedFileId: string | null;
  setHighlightedFileId: (fileId: string | null) => void;
}

function parseCategoryFilter(value: string | null): FileCategoryFilter {
  if (
    value === "AVATAR" ||
    value === "LEAD_ATTACHMENT" ||
    value === "PROJECT_BROCHURE" ||
    value === "IMPORT_FILE" ||
    value === "EXPORT_FILE" ||
    value === "OTHER"
  ) {
    return value;
  }
  return "all";
}

export function useFilesUrlState({
  debouncedSearch,
  setSearch,
  categoryFilter,
  setCategoryFilter,
  highlightedFileId,
  setHighlightedFileId,
}: UseFilesUrlStateOptions) {
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

    const urlCategory = searchParams.get("category");
    if (urlCategory) {
      setCategoryFilter(parseCategoryFilter(urlCategory));
    }

    const fileId = searchParams.get("fileId");
    if (fileId) {
      setHighlightedFileId(fileId);
    }

    appliedRef.current = signature;
  }, [
    searchParams,
    setCategoryFilter,
    setHighlightedFileId,
    setSearch,
  ]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const nextSearch = debouncedSearch.trim();

    if (nextSearch) {
      params.set("search", nextSearch);
    } else {
      params.delete("search");
    }

    if (categoryFilter === "all") {
      params.delete("category");
    } else {
      params.set("category", categoryFilter);
    }

    if (highlightedFileId) {
      params.set("fileId", highlightedFileId);
    } else {
      params.delete("fileId");
    }

    const next = params.toString();
    const current = searchParams.toString();

    if (next !== current) {
      router.replace(next ? `${pathname}?${next}` : pathname, {
        scroll: false,
      });
    }
  }, [
    categoryFilter,
    debouncedSearch,
    highlightedFileId,
    pathname,
    router,
    searchParams,
  ]);
}
