"use client";

import { useTranslations } from "next-intl";
import { queryKeys } from "@/lib/query/query-keys";
import { useApiMutation } from "@/lib/query/use-api-mutation";
import { updateTenantSettings } from "./api";
import type { UpdateTenantSettingsInput } from "./types";

export function useUpdateTenantSettings() {
  const t = useTranslations("settings");

  return useApiMutation({
    mutationFn: (input: UpdateTenantSettingsInput) => updateTenantSettings(input),
    successMessage: t("saved"),
    invalidateKeys: [queryKeys.tenantSettings.all()],
  });
}
