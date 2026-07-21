"use client";

import { useQuery } from "@tanstack/react-query";
import { getContractById, getContracts } from "@/features/contracts/api";
import type { ContractsListParams } from "@/features/contracts/types";
import { queryKeys } from "@/lib/query/query-keys";
import { useAuthStore } from "@/stores/auth-store";

export function useContracts(
  params?: ContractsListParams,
  options?: { enabled?: boolean },
) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.contracts.list(params ? { ...params } : undefined),
    queryFn: () => getContracts(params),
    enabled: status === "authenticated" && (options?.enabled ?? true),
    placeholderData: (previous) => previous,
  });
}

export function useContract(id: string | undefined) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.contracts.detail(id ?? ""),
    queryFn: () => getContractById(id!),
    enabled: status === "authenticated" && Boolean(id),
  });
}
