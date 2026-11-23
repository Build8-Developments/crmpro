"use client";

import {
  completeFileUpload,
  createFolder,
  deleteFile,
  deleteFolder,
  lockFolder,
  moveFiles,
  requestFileUpload,
  setFolderPassword,
  unlockFolder,
  updateFolder,
} from "@/features/files/api";
import type {
  CompleteUploadInput,
  CreateFolderInput,
  SetFolderPasswordInput,
  UpdateFolderInput,
} from "@/features/files/types";
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

export function putFileWithProgress(
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

/**
 * Upload the bytes to storage only (no file record yet). The caller hands
 * the returned objectKey to an endpoint that registers it — e.g. logging an
 * interaction with evidence — so a cancelled form leaves nothing attached.
 */
export async function stageFileUpload(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<{ objectKey: string }> {
  onProgress?.(0);
  const intent = await requestFileUpload({
    fileName: file.name,
    contentType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  });
  await putFileWithProgress(intent.uploadUrl, file, (progress) => onProgress?.(progress));
  onProgress?.(100);
  return { objectKey: intent.objectKey };
}

export async function uploadFileWithProgress(
  file: File,
  onProgress?: (progress: number) => void,
  folderId?: string,
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
    ...(folderId ? { folderId } : {}),
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

/* ─── Gallery folders ─────────────────────────────────────────────────────── */

export function useCreateFolder() {
  return useApiMutation({
    mutationFn: (input: CreateFolderInput) => createFolder(input),
    successMessage: "Folder created",
    invalidateKeys: [...filesInvalidateKeys],
  });
}

export function useUpdateFolder() {
  return useApiMutation({
    mutationFn: ({
      folderId,
      input,
    }: {
      folderId: string;
      input: UpdateFolderInput;
    }) => updateFolder(folderId, input),
    successMessage: "Folder updated",
    invalidateKeys: [...filesInvalidateKeys],
  });
}

export function useDeleteFolder() {
  return useApiMutation({
    mutationFn: (folderId: string) => deleteFolder(folderId),
    successMessage: "Folder deleted",
    invalidateKeys: [...filesInvalidateKeys],
  });
}

export function useSetFolderPassword() {
  return useApiMutation({
    mutationFn: ({
      folderId,
      input,
    }: {
      folderId: string;
      input: SetFolderPasswordInput;
    }) => setFolderPassword(folderId, input),
    successMessage: "Folder privacy updated",
    invalidateKeys: [...filesInvalidateKeys],
  });
}

export function useUnlockFolder() {
  return useApiMutation({
    mutationFn: ({ folderId, password }: { folderId: string; password: string }) =>
      unlockFolder(folderId, password),
    successMessage: "Folder unlocked for 30 minutes",
    invalidateKeys: [...filesInvalidateKeys],
  });
}

export function useLockFolder() {
  return useApiMutation({
    mutationFn: (folderId: string) => lockFolder(folderId),
    successMessage: "Folder locked",
    invalidateKeys: [...filesInvalidateKeys],
  });
}

export function useMoveFiles() {
  return useApiMutation({
    mutationFn: ({
      fileIds,
      folderId,
    }: {
      fileIds: string[];
      folderId: string | null;
    }) => moveFiles(fileIds, folderId),
    successMessage: "Files moved",
    invalidateKeys: [...filesInvalidateKeys],
  });
}

export function useUploadToFolder() {
  return useApiMutation({
    mutationFn: async ({
      files,
      folderId,
    }: {
      files: File[];
      folderId?: string;
    }) => {
      for (const file of files) {
        await uploadFileWithProgress(file, undefined, folderId);
      }
      return { count: files.length };
    },
    successMessage: "Upload complete",
    invalidateKeys: [...filesInvalidateKeys],
  });
}
