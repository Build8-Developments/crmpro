"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { UserStatusFilter } from "@/features/users/types";

interface UseUsersUrlStateOptions {
  debouncedSearch: string;
  setSearch: (value: string) => void;
  roleId: string | null;
  setRoleId: (roleId: string | null) => void;
  statusFilter: UserStatusFilter;
  setStatusFilter: (filter: UserStatusFilter) => void;
  highlightedUserId: string | null;
  setHighlightedUserId: (userId: string | null) => void;
  openDrawer: (userId: string) => void;
}

function parseStatusFilter(value: string | null): UserStatusFilter {
  if (value === "active" || value === "inactive") {
    return value;
  }
  return "all";
}

export function useUsersUrlState({
  debouncedSearch,
  setSearch,
  roleId,
  setRoleId,
  statusFilter,
  setStatusFilter,
  highlightedUserId,
  setHighlightedUserId,
  openDrawer,
}: UseUsersUrlStateOptions) {
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

    const urlRoleId = searchParams.get("roleId");
    if (urlRoleId) {
      setRoleId(urlRoleId);
    }

    const urlStatus = searchParams.get("status");
    if (urlStatus) {
      setStatusFilter(parseStatusFilter(urlStatus));
    }

    const userId = searchParams.get("userId");
    if (userId) {
      setHighlightedUserId(userId);
      openDrawer(userId);
    }

    appliedRef.current = signature;
  }, [
    openDrawer,
    searchParams,
    setHighlightedUserId,
    setRoleId,
    setSearch,
    setStatusFilter,
  ]);

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const nextSearch = debouncedSearch.trim();

    if (nextSearch) {
      params.set("search", nextSearch);
    } else {
      params.delete("search");
    }

    if (roleId) {
      params.set("roleId", roleId);
    } else {
      params.delete("roleId");
    }

    if (statusFilter === "all") {
      params.delete("status");
    } else {
      params.set("status", statusFilter);
    }

    if (highlightedUserId) {
      params.set("userId", highlightedUserId);
    } else {
      params.delete("userId");
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
    highlightedUserId,
    pathname,
    roleId,
    router,
    searchParams,
    statusFilter,
  ]);
}
