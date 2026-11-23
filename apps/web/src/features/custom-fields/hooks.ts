"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/stores/auth-store";
import { getCustomFields } from "./api";

/** Query key root: invalidate it after any definition change. */
export const CUSTOM_FIELDS_QUERY_KEY = ["custom-fields"] as const;

/**
 * The tenant's lead custom fields in display order. Active only by default;
 * `includeArchived` adds archived ones (after the active ones) for settings
 * and for showing values leads still have.
 */
export function useCustomFields(options?: { includeArchived?: boolean }) {
  const status = useAuthStore((state) => state.status);
  const includeArchived = options?.includeArchived ?? false;

  return useQuery({
    queryKey: [...CUSTOM_FIELDS_QUERY_KEY, { includeArchived }],
    queryFn: () => getCustomFields(includeArchived),
    enabled: status === "authenticated",
    staleTime: 5 * 60 * 1000,
  });
}
