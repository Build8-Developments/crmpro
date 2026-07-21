"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { AdminStatusFilter } from "@/features/admins/types";

interface UseAdminsUrlStateOptions {
  debouncedSearch: string;
  setSearch: (value: string) => void;
  roleId: string | null;
  setRoleId: (roleId: string | null) => void;
  statusFilter: AdminStatusFilter;
  setStatusFilter: (filter: AdminStatusFilter) => void;
  page: number;
  setPage: (page: number) => void;
}

function parseStatusFilter(value: string | null): AdminStatusFilter {
  if (value === "active" || value === "inactive") {
    return value;
  }
  return "all";
}

export function useAdminsUrlState({
  debouncedSearch,
  setSearch,
  roleId,
  setRoleId,
  statusFilter,
  setStatusFilter,
  page,
  setPage,
}: UseAdminsUrlStateOptions) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const appliedRef = useRef<string | null>(null);
  const hydratedRef = useRef(false);

  useEffect(() => {
    const signature = searchParams.toString();
    if (appliedRef.current === signature) {
      return;
    }

    const urlSearch = searchParams.get("search");
    if (urlSearch !== null) {
      setSearch(urlSearch);
    }

    const urlRoleId = searchParams.get("roleId");
    setRoleId(urlRoleId || null);

    const urlStatus = searchParams.get("status");
    if (urlStatus) {
      setStatusFilter(parseStatusFilter(urlStatus));
    }

    const urlPage = Number(searchParams.get("page") ?? "1");
    if (Number.isFinite(urlPage) && urlPage >= 1) {
      setPage(urlPage);
    }

    appliedRef.current = signature;
    hydratedRef.current = true;
  }, [searchParams, setPage, setRoleId, setSearch, setStatusFilter]);

  useEffect(() => {
    if (!hydratedRef.current && searchParams.toString()) {
      return;
    }

    const params = new URLSearchParams();
    const nextSearch = debouncedSearch.trim();

    if (nextSearch) {
      params.set("search", nextSearch);
    }

    if (roleId) {
      params.set("roleId", roleId);
    }

    if (statusFilter !== "all") {
      params.set("status", statusFilter);
    }

    if (page > 1) {
      params.set("page", String(page));
    }

    const next = params.toString();
    const current = searchParams.toString();

    if (next !== current) {
      appliedRef.current = next;
      router.replace(next ? `${pathname}?${next}` : pathname, {
        scroll: false,
      });
    }
  }, [
    debouncedSearch,
    page,
    pathname,
    roleId,
    router,
    searchParams,
    statusFilter,
  ]);
}
