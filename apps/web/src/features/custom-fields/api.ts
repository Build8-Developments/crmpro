import { apiClient } from "@/lib/api/client";
import type {
  CreateCustomFieldInput,
  CustomFieldDefinition,
  UpdateCustomFieldInput,
} from "./types";

export function getCustomFields(includeArchived = false) {
  return apiClient.get<CustomFieldDefinition[]>("/custom-fields", {
    query: includeArchived ? { includeArchived: "true" } : {},
  });
}

export function createCustomField(input: CreateCustomFieldInput) {
  return apiClient.post<CustomFieldDefinition>("/custom-fields", input);
}

export function updateCustomField(id: string, input: UpdateCustomFieldInput) {
  return apiClient.patch<CustomFieldDefinition>(`/custom-fields/${id}`, input);
}

export function archiveCustomField(id: string) {
  return apiClient.post<CustomFieldDefinition>(`/custom-fields/${id}/archive`);
}

export function restoreCustomField(id: string) {
  return apiClient.post<CustomFieldDefinition>(`/custom-fields/${id}/restore`);
}

/** `ids` in their new order. */
export function reorderCustomFields(ids: string[]) {
  return apiClient.patch<CustomFieldDefinition[]>("/custom-fields/order", {
    ids,
  });
}
