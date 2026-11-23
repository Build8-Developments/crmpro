import { apiClient } from "@/lib/api/client";
import { serializeQueryParams } from "@/lib/query/query-params";
import type {
  CompleteUploadInput,
  CreateFolderInput,
  DownloadUrlResponse,
  FileFolder,
  FilePreview,
  FilesStats,
  FilesStatsParams,
  SetFolderPasswordInput,
  UpdateFolderInput,
  FileAsset,
  FilesListParams,
  FilesListResponse,
  RequestUploadInput,
  RequestUploadResponse,
} from "./types";

export function getFiles(params?: FilesListParams) {
  return apiClient.get<FilesListResponse>("/files", {
    query: serializeQueryParams({
      sortBy: "createdAt",
      sortOrder: "desc",
      limit: 50,
      ...params,
    }),
  });
}

export function requestFileUpload(input: RequestUploadInput) {
  return apiClient.post<RequestUploadResponse>("/files/request-upload", input);
}

export function completeFileUpload(input: CompleteUploadInput) {
  return apiClient.post<FileAsset>("/files/complete-upload", input);
}

export function getFileDownloadUrl(fileId: string) {
  return apiClient.get<DownloadUrlResponse>(`/files/${fileId}/download-url`);
}

export function deleteFile(fileId: string) {
  return apiClient.delete<{ id: string }>(`/files/${fileId}`);
}

export function getFolders() {
  return apiClient.get<FileFolder[]>("/files/folders");
}

export function createFolder(input: CreateFolderInput) {
  return apiClient.post<FileFolder>("/files/folders", input);
}

export function updateFolder(folderId: string, input: UpdateFolderInput) {
  return apiClient.patch<{ id: string }>(`/files/folders/${folderId}`, input);
}

export function deleteFolder(folderId: string) {
  return apiClient.delete<{ id: string }>(`/files/folders/${folderId}`);
}

export function setFolderPassword(
  folderId: string,
  input: SetFolderPasswordInput,
) {
  return apiClient.put<{ id: string; isPrivate: boolean }>(
    `/files/folders/${folderId}/password`,
    input,
  );
}

export function unlockFolder(folderId: string, password: string) {
  return apiClient.post<{ unlockedForSeconds: number }>(
    `/files/folders/${folderId}/unlock`,
    { password },
  );
}

export function lockFolder(folderId: string) {
  return apiClient.post<{ id: string }>(`/files/folders/${folderId}/lock`);
}

export function moveFiles(fileIds: string[], folderId: string | null) {
  return apiClient.post<{ moved: number }>("/files/move", {
    fileIds,
    folderId,
  });
}

export function getFilesStats(params: FilesStatsParams) {
  return apiClient.get<FilesStats>("/files/stats", {
    query: serializeQueryParams({ ...params }),
  });
}

export function getFilePreviewUrl(fileId: string) {
  return apiClient.get<FilePreview>(`/files/${fileId}/preview-url`);
}
