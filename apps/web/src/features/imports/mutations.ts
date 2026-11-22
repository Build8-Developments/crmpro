"use client";

import {
  completeFileUpload,
  requestFileUpload,
} from "@/features/files/api";
import {
  createLeadImportJob,
  previewLeadImport,
} from "@/features/imports/api";
import type { CreateLeadImportJobInput } from "@/features/imports/types";
import { importFileContentType } from "@/features/imports/utils/import-formatters";
import { queryKeys } from "@/lib/query/query-keys";
import { useApiMutation } from "@/lib/query/use-api-mutation";

function putImportFile(
  uploadUrl: string,
  file: File,
  contentType: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", contentType);

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new Error("Failed to upload the file to storage"));
    };

    xhr.onerror = () =>
      reject(new Error("Failed to upload the file to storage"));
    xhr.send(file);
  });
}

/** Uploads a CSV/XLSX as an IMPORT_FILE asset. */
export async function uploadImportFile(file: File) {
  const contentType = importFileContentType(file);
  const intent = await requestFileUpload({
    fileName: file.name,
    contentType,
    sizeBytes: file.size,
  });

  await putImportFile(intent.uploadUrl, file, contentType);

  return completeFileUpload({
    objectKey: intent.objectKey,
    category: "IMPORT_FILE",
  });
}

/** Step 1 → 2: upload the file and read its headers and sample rows. */
export function usePreviewLeadImport() {
  return useApiMutation({
    mutationFn: async (file: File) => {
      const asset = await uploadImportFile(file);
      return previewLeadImport(asset.id);
    },
    showErrorToast: false,
    invalidateKeys: [queryKeys.files.all()],
  });
}

export function useCreateLeadImport() {
  return useApiMutation({
    mutationFn: (input: CreateLeadImportJobInput) =>
      createLeadImportJob(input),
    successMessage: "Import started",
    showErrorToast: false,
    invalidateKeys: [
      queryKeys.imports.all(),
      queryKeys.files.all(),
      queryKeys.leads.all(),
    ],
  });
}
