"use client";

import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/query-keys";
import { useAuthStore } from "@/stores/auth-store";
import { getTenantSettings } from "./api";

/** Workspace preferences (timezone, currency, country, routing). */
export function useTenantSettings() {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.tenantSettings.detail(),
    queryFn: getTenantSettings,
    enabled: status === "authenticated",
    staleTime: 5 * 60 * 1000,
  });
}

const DIAL_CODES: Record<string, string> = {
  EG: "20",
  SA: "966",
  AE: "971",
  KW: "965",
  QA: "974",
  BH: "973",
  OM: "968",
  JO: "962",
  LB: "961",
  IQ: "964",
  MA: "212",
  TN: "216",
  DZ: "213",
  LY: "218",
  SD: "249",
  US: "1",
  GB: "44",
};

/** International dial code for the workspace country (used for wa.me links). */
export function useDefaultDialCode(): string {
  const { data } = useTenantSettings();
  return DIAL_CODES[data?.defaultCountryCode ?? "EG"] ?? "20";
}
