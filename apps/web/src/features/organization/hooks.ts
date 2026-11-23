"use client";

import { useQuery } from "@tanstack/react-query";
import {
  completeLogoUpload,
  getOrganization,
  getOrganizationUsage,
  removeLogo,
  requestLogoUpload,
  updateOrganization,
  updateOrganizationSettings,
} from "@/features/organization/api";
import type { UpdateOrganizationSettingsInput } from "@/features/organization/types";
import { putFileWithProgress } from "@/features/files/mutations";
import { queryKeys } from "@/lib/query/query-keys";
import { useApiMutation } from "@/lib/query/use-api-mutation";
import { useAuthStore } from "@/stores/auth-store";

export const LOGO_MAX_BYTES = 2 * 1024 * 1024;
export const LOGO_CONTENT_TYPES = ["image/png", "image/jpeg", "image/webp"];

const organizationKeys = [queryKeys.organization.all(), queryKeys.auth.me()];

export function useOrganization() {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.organization.detail(),
    queryFn: getOrganization,
    enabled: status === "authenticated",
    // Logo URLs are signed for 6 hours; refresh well before that.
    staleTime: 30 * 60 * 1000,
  });
}

export function useOrganizationUsage(options?: { enabled?: boolean }) {
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: queryKeys.organization.usage(),
    queryFn: getOrganizationUsage,
    enabled: status === "authenticated" && (options?.enabled ?? true),
  });
}

export function useUpdateOrganizationName() {
  return useApiMutation({
    mutationFn: (name: string) => updateOrganization({ name }),
    successMessage: "Organization name saved",
    invalidateKeys: organizationKeys,
  });
}

export function useUpdateOrganizationSettings() {
  return useApiMutation({
    mutationFn: (input: UpdateOrganizationSettingsInput) =>
      updateOrganizationSettings(input),
    successMessage: "Settings saved",
    invalidateKeys: organizationKeys,
  });
}

export function useUploadLogo() {
  return useApiMutation({
    mutationFn: async (file: File) => {
      const intent = await requestLogoUpload({
        fileName: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      });
      await putFileWithProgress(intent.uploadUrl, file);
      return completeLogoUpload(intent.objectKey);
    },
    successMessage: "Logo updated",
    invalidateKeys: organizationKeys,
  });
}

export function useRemoveLogo() {
  return useApiMutation({
    mutationFn: () => removeLogo(),
    successMessage: "Logo removed",
    invalidateKeys: organizationKeys,
  });
}

/** The workspace currency (Settings → General), "EGP" while loading. */
export function useWorkspaceCurrency(): string {
  return useOrganization().data?.settings.currency ?? "EGP";
}
