"use client";

import {
  completeFileUpload,
  deleteFile,
  requestFileUpload,
} from "@/features/files/api";
import type { CompleteUploadInput } from "@/features/files/types";
import { queryKeys } from "@/lib/query/query-keys";
import { useApiMutation } from "@/lib/query/use-api-mutation";

const filesInvalidateKeys = [queryKeys.files.all()] as const;

export function useDeleteFile() {
  return useApiMutation({
    mutationFn: (fileId: string) => deleteFile(fileId),
    successMessage: "File deleted",
    invalidateKeys: [...filesInvalidateKeys],
  });
}

export function useUploadFile() {
  return useApiMutation({
    mutationFn: async (file: File) => {
      const intent = await requestFileUpload({
        fileName: file.name,
        contentType: file.type || "application/octet-stream",
        sizeBytes: file.size,
      });

      const uploadResponse = await fetch(intent.uploadUrl, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to storage");
      }

      const input: CompleteUploadInput = {
        objectKey: intent.objectKey,
        category: "OTHER",
      };

      return completeFileUpload(input);
    },
    successMessage: "File uploaded",
    invalidateKeys: [...filesInvalidateKeys],
  });
}
