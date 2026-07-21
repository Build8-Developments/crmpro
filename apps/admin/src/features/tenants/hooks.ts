"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  getActiveContracts,
  getTenantById,
  getTenantNotes,
  getTenants,
  getTenantUsage,
  getTenantUsers,
} from "@/features/tenants/api";
import type {
  TenantStatus,
  TenantStatusFilter,
  TenantsListParams,
  TenantUsersListParams,
} from "@/features/tenants/types";
import { queryKeys } from "@/lib/query/query-keys";
import { useAuthStore } from "@/stores/auth-store";

const TENANT_STATUSES: TenantStatus[] = [
  "TRIAL",
  "ACTIVE",
  "SUSPENDED",
  "CANCELLED",
];

export function useTenants(
  params?: TenantsListParams,
  options?: { enabled?: boolean },
) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.tenants.list(
      params as TenantsListParams & Record<string, unknown>,
    ),
    queryFn: () => getTenants(params),
    enabled: status === "authenticated" && (options?.enabled ?? true),
    placeholderData: (previous) => previous,
  });
}

export function useTenant(id: string | undefined) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.tenants.detail(id ?? ""),
    queryFn: () => getTenantById(id!),
    enabled: status === "authenticated" && Boolean(id),
  });
}

export function useTenantUsage(id: string | undefined) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.tenants.usage(id ?? ""),
    queryFn: () => getTenantUsage(id!),
    enabled: status === "authenticated" && Boolean(id),
  });
}

export function useTenantUsers(
  id: string | undefined,
  params?: TenantUsersListParams,
  options?: { enabled?: boolean },
) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.tenants.users(
      id ?? "",
      params as TenantUsersListParams & Record<string, unknown>,
    ),
    queryFn: () => getTenantUsers(id!, params),
    enabled: status === "authenticated" && Boolean(id) && (options?.enabled ?? true),
    placeholderData: (previous) => previous,
  });
}

export function useTenantNotes(id: string | undefined) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.tenants.notes(id ?? ""),
    queryFn: () => getTenantNotes(id!),
    enabled: status === "authenticated" && Boolean(id),
  });
}

export function useActiveContracts(options?: { enabled?: boolean }) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.contracts.list({ status: "ACTIVE", limit: 100 }),
    queryFn: () => getActiveContracts({ limit: 100 }),
    enabled: status === "authenticated" && (options?.enabled ?? true),
    staleTime: 30_000,
  });
}

function parseStatusFilter(value: string | null): TenantStatusFilter {
  if (value && TENANT_STATUSES.includes(value as TenantStatus)) {
    return value as TenantStatus;
  }
  return "all";
}

function parsePage(value: string | null): number {
  const page = Number(value);
  return Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1;
}

interface UseTenantsUrlStateOptions {
  debouncedSearch: string;
  setSearch: (value: string) => void;
  statusFilter: TenantStatusFilter;
  setStatusFilter: (filter: TenantStatusFilter) => void;
  page: number;
  setPage: (page: number) => void;
}

export function useTenantsUrlState({
  debouncedSearch,
  setSearch,
  statusFilter,
  setStatusFilter,
  page,
  setPage,
}: UseTenantsUrlStateOptions) {
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

    const urlPage = searchParams.get("page");
    if (urlPage) {
      setPage(parsePage(urlPage));
    }

    appliedRef.current = signature;
  }, [searchParams, setPage, setSearch, setStatusFilter]);

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
    debouncedSearch,
    page,
    pathname,
    router,
    searchParams,
    statusFilter,
  ]);
}
