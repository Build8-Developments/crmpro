"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { PlanStatusFilter } from "@/features/plans/types";

interface UsePlansUrlStateOptions {
  debouncedSearch: string;
  setSearch: (value: string) => void;
  statusFilter: PlanStatusFilter;
  setStatusFilter: (filter: PlanStatusFilter) => void;
  currency: string | null;
  setCurrency: (currency: string | null) => void;
  page: number;
  setPage: (page: number) => void;
}

function parseStatusFilter(value: string | null): PlanStatusFilter {
  if (value === "active" || value === "inactive") {
    return value;
  }
  return "all";
}

function parsePage(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

export function usePlansUrlState({
  debouncedSearch,
  setSearch,
  statusFilter,
  setStatusFilter,
  currency,
  setCurrency,
  page,
  setPage,
}: UsePlansUrlStateOptions) {
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

    const urlStatus = searchParams.get("status");
    if (urlStatus) {
      setStatusFilter(parseStatusFilter(urlStatus));
    }

    const urlCurrency = searchParams.get("currency");
    if (urlCurrency) {
      setCurrency(urlCurrency.toUpperCase());
    }

    const urlPage = searchParams.get("page");
    if (urlPage) {
      setPage(parsePage(urlPage));
    }

    appliedRef.current = signature;
  }, [searchParams, setCurrency, setPage, setSearch, setStatusFilter]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const nextSearch = debouncedSearch.trim();

    if (nextSearch) {
      params.set("search", nextSearch);
    } else {
      params.delete("search");
    }

    if (statusFilter === "all") {
      params.delete("status");
    } else {
      params.set("status", statusFilter);
    }

    if (currency) {
      params.set("currency", currency);
    } else {
      params.delete("currency");
    }

    if (page > 1) {
      params.set("page", String(page));
    } else {
      params.delete("page");
    }

    const next = params.toString();
    const current = searchParams.toString();

    if (next !== current) {
      router.replace(next ? `${pathname}?${next}` : pathname, {
        scroll: false,
      });
    }
  }, [
    currency,
    debouncedSearch,
    page,
    pathname,
    router,
    searchParams,
    statusFilter,
  ]);
}
