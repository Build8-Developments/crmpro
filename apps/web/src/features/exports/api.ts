import { apiClient } from "@/lib/api/client";
import { serializeQueryParams } from "@/lib/query/query-params";
import type {
  CreateExportJobResponse,
  CreateLeadExportInput,
  ExportJob,
  ExportJobsListParams,
  ExportJobsListResponse,
} from "./types";

export function getExportJobs(params?: ExportJobsListParams) {
  return apiClient.get<ExportJobsListResponse>("/export-jobs", {
    query: serializeQueryParams({
      page: 1,
      limit: 20,
      ...params,
    }),
  });
}

export function getExportJob(id: string) {
  return apiClient.get<ExportJob>(`/export-jobs/${id}`);
}

export function createLeadExportJob(input: CreateLeadExportInput) {
  return apiClient.post<CreateExportJobResponse>("/export-jobs/leads", {
    format: "CSV",
    ...input,
  });
}
