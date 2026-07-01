import type {
  QueryClient,
  QueryKey,
  UseMutationOptions,
} from "@tanstack/react-query";
import { ApiError } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import { invalidateFeatures } from "./invalidate";

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

export function createApiMutationHandlers<
  TData,
  TError extends Error = ApiError,
  TVariables = void,
  TContext = unknown,
>(
  queryClient: QueryClient,
  options: ApiMutationContext,
): Pick<
  UseMutationOptions<TData, TError, TVariables, TContext>,
  "onSuccess" | "onError"
> {
  const {
    invalidateKeys,
    successMessage,
    errorMessage = "Something went wrong.",
    showErrorToast = true,
  } = options;

  return {
    onSuccess: async () => {
      if (invalidateKeys?.length) {
        await invalidateFeatures(queryClient, invalidateKeys);
      }

      if (successMessage) {
        toast.success(successMessage);
      }
    },
    onError: (error) => {
      if (!showErrorToast) {
        return;
      }

      const message =
        error instanceof ApiError ? error.message : errorMessage;
      toast.error(message);
    },
  };
}
