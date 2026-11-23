"use client";

import {
  activateContract,
  archiveContract,
  createContract,
  terminateContract,
  updateContract,
} from "@/features/contracts/api";
import type {
  CreateContractInput,
  TerminateContractInput,
  UpdateContractInput,
} from "@/features/contracts/types";
import { queryKeys } from "@/lib/query/query-keys";
import { useApiMutation } from "@/lib/query/use-api-mutation";

const contractInvalidateKeys = [
  queryKeys.contracts.all(),
  queryKeys.dashboard.all(),
  queryKeys.plans.all(),
  queryKeys.tenants.all(),
] as const;

export function useCreateContract() {
  return useApiMutation({
    mutationFn: (input: CreateContractInput) => createContract(input),
    successMessage: "Contract created",
    invalidateKeys: [...contractInvalidateKeys],
  });
}

export function useUpdateContract() {
  return useApiMutation({
    mutationFn: ({
      contractId,
      input,
    }: {
      contractId: string;
      input: UpdateContractInput;
    }) => updateContract(contractId, input),
    successMessage: "Contract updated",
    invalidateKeys: [...contractInvalidateKeys],
  });
}

export function useActivateContract() {
  return useApiMutation({
    mutationFn: (contractId: string) => activateContract(contractId),
    successMessage: "Contract activated",
    invalidateKeys: [...contractInvalidateKeys],
  });
}

export function useTerminateContract() {
  return useApiMutation({
    mutationFn: ({
      contractId,
      input,
    }: {
      contractId: string;
      input: TerminateContractInput;
    }) => terminateContract(contractId, input),
    successMessage: "Contract terminated",
    invalidateKeys: [...contractInvalidateKeys],
  });
}

export function useArchiveContract() {
  return useApiMutation({
    mutationFn: (contractId: string) => archiveContract(contractId),
    successMessage: "Contract archived",
    invalidateKeys: [...contractInvalidateKeys],
  });
}
