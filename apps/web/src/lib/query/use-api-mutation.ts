"use client";

import {
  useMutation,
  useQueryClient,
  type UseMutationOptions,
  type UseMutationResult,
} from "@tanstack/react-query";
import { ApiError } from "@/lib/api/client";
import { toast } from "@/lib/toast";
import { invalidateFeatures } from "./invalidate";
import type { ApiMutationContext } from "./mutation-options";

export type UseApiMutationOptions<
  TData,
  TVariables,
  TContext = unknown,
> = Omit<
  UseMutationOptions<TData, Error, TVariables, TContext>,
  "onSuccess" | "onError"
> &
  ApiMutationContext & {
    onSuccess?: UseMutationOptions<
      TData,
      Error,
      TVariables,
      TContext
    >["onSuccess"];
    onError?: UseMutationOptions<
      TData,
      Error,
      TVariables,
      TContext
    >["onError"];
  };

export function useApiMutation<TData, TVariables, TContext = unknown>(
  options: UseApiMutationOptions<TData, TVariables, TContext>,
): UseMutationResult<TData, Error, TVariables, TContext> {
  const queryClient = useQueryClient();
  const {
    invalidateKeys,
    successMessage,
    errorMessage = "Something went wrong.",
    showErrorToast = true,
    onSuccess,
    onError,
    ...mutationOptions
  } = options;

  return useMutation<TData, Error, TVariables, TContext>({
    ...mutationOptions,
    onSuccess: (...args) => {
      if (invalidateKeys?.length) {
        void invalidateFeatures(queryClient, invalidateKeys);
      }

      if (successMessage) {
        toast.success(successMessage);
      }

      onSuccess?.(...args);
    },
    onError: (...args) => {
      const [error] = args;

      if (showErrorToast) {
        const message =
          error instanceof ApiError ? error.message : errorMessage;
        toast.error(message);
      }

      onError?.(...args);
    },
  });
}
