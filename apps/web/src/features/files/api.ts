import { apiClient } from "@/lib/api/client";
import { serializeQueryParams } from "@/lib/query/query-params";
import type {
  CompleteUploadInput,
  DownloadUrlResponse,
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
