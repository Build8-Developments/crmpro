"use client";

import { uploadFile } from "@/features/files/upload";
import { createLeadImportJob, previewLeadImport } from "@/features/imports/api";
import type { CreateLeadImportJobInput } from "@/features/imports/types";
import { queryKeys } from "@/lib/query/query-keys";
import { useApiMutation } from "@/lib/query/use-api-mutation";

/** Uploads the spreadsheet and reads its columns for the mapping step. */
export function usePreviewLeadImport() {
  return useApiMutation({
    mutationFn: async (file: File) => {
      const asset = await uploadFile(file, "IMPORT_FILE");
      return previewLeadImport(asset.id);
    },
    showErrorToast: false,
  });
}

export function useCreateLeadImport() {
  return useApiMutation({
    mutationFn: (input: CreateLeadImportJobInput) => createLeadImportJob(input),
    successMessage: "Import started",
    showErrorToast: false,
    invalidateKeys: [
      queryKeys.imports.all(),
      queryKeys.files.all(),
      queryKeys.leads.all(),
    ],
  });
}
