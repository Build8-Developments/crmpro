import { apiClient } from "@/lib/api/client";
import type { TenantSettings, UpdateTenantSettingsInput } from "./types";

export function getTenantSettings() {
  return apiClient.get<TenantSettings>("/tenant-settings");
}

export function updateTenantSettings(input: UpdateTenantSettingsInput) {
  return apiClient.patch<TenantSettings>("/tenant-settings", input);
}
