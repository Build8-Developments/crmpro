import { apiClient } from "@/lib/api/client";
import type {
  Organization,
  OrganizationSettings,
  OrganizationUsage,
  UpdateOrganizationSettingsInput,
} from "./types";

export function getOrganization() {
  return apiClient.get<Organization>("/organization");
}

export function updateOrganization(input: { name: string }) {
  return apiClient.patch<Organization>("/organization", input);
}

export function updateOrganizationSettings(
  input: UpdateOrganizationSettingsInput,
) {
  return apiClient.patch<OrganizationSettings>("/organization/settings", input);
}

export function requestLogoUpload(input: {
  fileName: string;
  contentType: string;
  sizeBytes: number;
}) {
  return apiClient.post<{ uploadUrl: string; objectKey: string }>(
    "/organization/logo/request-upload",
    input,
  );
}

export function completeLogoUpload(objectKey: string) {
  return apiClient.post<Organization>("/organization/logo/complete-upload", {
    objectKey,
  });
}

export function removeLogo() {
  return apiClient.delete<Organization>("/organization/logo");
}

export function getOrganizationUsage() {
  return apiClient.get<OrganizationUsage>("/organization/usage");
}
