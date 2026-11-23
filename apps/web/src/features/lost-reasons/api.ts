import { apiClient } from "@/lib/api/client";
import type { LostReason } from "@/features/leads/types";

export interface LostReasonInput {
  name?: string;
  recyclable?: boolean;
  recycleAfterDays?: number | null;
  isActive?: boolean;
}

export function createLostReason(input: LostReasonInput & { name: string }) {
  return apiClient.post<LostReason>("/lost-reasons", input);
}

export function updateLostReason(id: string, input: LostReasonInput) {
  return apiClient.patch<LostReason>(`/lost-reasons/${id}`, input);
}

export function deleteLostReason(id: string) {
  return apiClient.delete<{ archived: boolean }>(`/lost-reasons/${id}`);
}
