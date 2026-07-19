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

export function useBulkDeleteFiles() {
  return useApiMutation({
    mutationFn: async (fileIds: string[]) => {
      const results = await Promise.allSettled(
        fileIds.map((fileId) => deleteFile(fileId)),
      );
      const failed = results.filter((result) => result.status === "rejected");
      if (failed.length === fileIds.length) {
        throw new Error("Failed to delete selected files");
      }
      return {
        successCount: fileIds.length - failed.length,
        failureCount: failed.length,
      };
    },
    successMessage: "Selected files deleted",
    invalidateKeys: [...filesInvalidateKeys],
  });
}

function putFileWithProgress(
  uploadUrl: string,
  file: File,
  onProgress?: (progress: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader(
      "Content-Type",
      file.type || "application/octet-stream",
    );

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }
      reject(new Error("Failed to upload file to storage"));
    };

    xhr.onerror = () => reject(new Error("Failed to upload file to storage"));
    xhr.send(file);
  });
}

export async function uploadFileWithProgress(
  file: File,
  onProgress?: (progress: number) => void,
) {
  onProgress?.(0);

  const intent = await requestFileUpload({
    fileName: file.name,
    contentType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  });

  await putFileWithProgress(intent.uploadUrl, file, (progress) => {
    // Reserve the last 5% for complete-upload.
    onProgress?.(Math.min(progress, 95));
  });

  const input: CompleteUploadInput = {
    objectKey: intent.objectKey,
    category: "OTHER",
  };

  const result = await completeFileUpload(input);
  onProgress?.(100);
  return result;
}

export function useUploadFile() {
  return useApiMutation({
    mutationFn: (file: File) => uploadFileWithProgress(file),
    successMessage: "File uploaded",
    invalidateKeys: [...filesInvalidateKeys],
  });
}

export function useUploadFiles() {
  return useApiMutation({
    mutationFn: async ({
      files,
      onFileProgress,
    }: {
      files: File[];
      onFileProgress?: (index: number, progress: number) => void;
    }) => {
      const uploaded = [];

      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]!;
        const result = await uploadFileWithProgress(file, (progress) => {
          onFileProgress?.(index, progress);
        });
        uploaded.push(result);
      }

      return uploaded;
    },
    successMessage: "Files uploaded",
    invalidateKeys: [...filesInvalidateKeys],
  });
}
