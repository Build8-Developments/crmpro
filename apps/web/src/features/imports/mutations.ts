"use client";

import {
  completeFileUpload,
  requestFileUpload,
} from "@/features/files/api";
import { createLeadImportJob } from "@/features/imports/api";
import { queryKeys } from "@/lib/query/query-keys";
import { useApiMutation } from "@/lib/query/use-api-mutation";

function putCsvFile(uploadUrl: string, file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader(
      "Content-Type",
      file.type || "text/csv",
    );

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
        return;
      }
      reject(new Error("Failed to upload CSV to storage"));
    };

    xhr.onerror = () => reject(new Error("Failed to upload CSV to storage"));
    xhr.send(file);
  });
}

export async function uploadImportCsv(file: File) {
  const intent = await requestFileUpload({
    fileName: file.name,
    contentType: file.type || "text/csv",
    sizeBytes: file.size,
  });

  await putCsvFile(intent.uploadUrl, file);

  return completeFileUpload({
    objectKey: intent.objectKey,
    category: "IMPORT_FILE",
  });
}

export function useCreateLeadImport() {
  return useApiMutation({
    mutationFn: async (file: File) => {
      const asset = await uploadImportCsv(file);
      return createLeadImportJob({ fileAssetId: asset.id });
    },
    successMessage: "Import started",
    invalidateKeys: [
      queryKeys.imports.all(),
      queryKeys.files.all(),
      queryKeys.leads.all(),
    ],
  });
}
