import { apiClient } from "@/lib/api/client";
import { serializeQueryParams } from "@/lib/query/query-params";
import type {
  CreateLeadImportJobInput,
  ImportJob,
  ImportJobsListParams,
  ImportJobsListResponse,
  ImportPreview,
} from "./types";

export function getImportJobs(params?: ImportJobsListParams) {
  return apiClient.get<ImportJobsListResponse>("/import-jobs", {
    query: serializeQueryParams({
      page: 1,
      limit: 20,
      ...params,
    }),
  });
}

export function getImportJob(id: string) {
  return apiClient.get<ImportJob>(`/import-jobs/${id}`);
}

export function createLeadImportJob(input: CreateLeadImportJobInput) {
  return apiClient.post<ImportJob>("/import-jobs/leads", input);
}

export function previewLeadImport(fileAssetId: string) {
  return apiClient.post<ImportPreview>("/import-jobs/preview", { fileAssetId });
}
