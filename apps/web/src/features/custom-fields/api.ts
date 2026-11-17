import { apiClient } from "@/lib/api/client";
import type { CustomFieldDefinition, CustomFieldType } from "./types";

export function getCustomFields(includeArchived = false) {
  return apiClient.get<{ items: CustomFieldDefinition[] }>("/custom-fields", {
    query: includeArchived ? { includeArchived: "true" } : undefined,
  });
}

export function createCustomField(input: {
  label: string;
  type: CustomFieldType;
  options?: string[];
  isRequired?: boolean;
}) {
  return apiClient.post<CustomFieldDefinition>("/custom-fields", input);
}

export function updateCustomField(
  id: string,
  input: { label?: string; options?: string[]; isRequired?: boolean },
) {
  return apiClient.patch<CustomFieldDefinition>(`/custom-fields/${id}`, input);
}

export function setCustomFieldArchived(id: string, archived: boolean) {
  return apiClient.post<CustomFieldDefinition>(
    `/custom-fields/${id}/${archived ? "archive" : "restore"}`,
  );
}
