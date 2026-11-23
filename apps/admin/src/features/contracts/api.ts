import { apiClient } from "@/lib/api/client";
import { serializeQueryParams } from "@/lib/query/query-params";
import type {
  ContractDetail,
  ContractsListParams,
  ContractsListResponse,
  CreateContractInput,
  TerminateContractInput,
  UpdateContractInput,
} from "./types";

export function getContracts(params?: ContractsListParams) {
  return apiClient.get<ContractsListResponse>("/contracts", {
    query: serializeQueryParams({
      limit: 50,
      ...params,
    }),
  });
}

export function getContractById(id: string) {
  return apiClient.get<ContractDetail>(`/contracts/${id}`);
}

export function createContract(input: CreateContractInput) {
  return apiClient.post<ContractDetail>("/contracts", input);
}

export function updateContract(id: string, input: UpdateContractInput) {
  return apiClient.patch<ContractDetail>(`/contracts/${id}`, input);
}

export function activateContract(id: string) {
  return apiClient.post<ContractDetail>(`/contracts/${id}/activate`);
}

export function terminateContract(id: string, input: TerminateContractInput) {
  return apiClient.post<ContractDetail>(`/contracts/${id}/terminate`, input);
}

export function archiveContract(id: string) {
  return apiClient.post<{ success: true }>(`/contracts/${id}/archive`);
}
