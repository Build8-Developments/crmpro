import { apiClient } from "@/lib/api/client";
import { serializeQueryParams } from "@/lib/query/query-params";
import type {
  CreatePlanInput,
  PlanDetail,
  PlanListItem,
  PlansListParams,
  PlansListResponse,
  UpdatePlanInput,
} from "./types";

export function getPlans(params?: PlansListParams) {
  return apiClient.get<PlansListResponse>("/plans", {
    query: serializeQueryParams({
      limit: 50,
      ...params,
    }),
  });
}

export function getPlanById(id: string) {
  return apiClient.get<PlanDetail>(`/plans/${id}`);
}

export function createPlan(input: CreatePlanInput) {
  return apiClient.post<PlanDetail>("/plans", input);
}

export function updatePlan(id: string, input: UpdatePlanInput) {
  return apiClient.patch<PlanDetail>(`/plans/${id}`, input);
}

export function archivePlan(id: string) {
  return apiClient.post<PlanListItem>(`/plans/${id}/archive`);
}

export function unarchivePlan(id: string) {
  return apiClient.post<PlanListItem>(`/plans/${id}/unarchive`);
}
