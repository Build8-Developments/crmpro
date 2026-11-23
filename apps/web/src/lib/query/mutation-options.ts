import type { QueryKey, UseMutationOptions } from "@tanstack/react-query";
import type { ApiError } from "@/lib/api/client";

export interface ApiMutationContext {
  invalidateKeys?: QueryKey[];
  successMessage?: string;
  errorMessage?: string;
  showErrorToast?: boolean;
}

export type ApiMutationOptions<
  TData,
  TError = ApiError,
  TVariables = void,
  TContext = unknown,
> = UseMutationOptions<TData, TError, TVariables, TContext> &
  ApiMutationContext;
