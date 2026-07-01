import type { QueryClient, QueryKey } from "@tanstack/react-query";

export function invalidateFeature(
  queryClient: QueryClient,
  queryKey: QueryKey,
): Promise<void> {
  return queryClient.invalidateQueries({ queryKey });
}

export function invalidateFeatures(
  queryClient: QueryClient,
  queryKeys: QueryKey[],
): Promise<void[]> {
  return Promise.all(
    queryKeys.map((queryKey) => invalidateFeature(queryClient, queryKey)),
  );
}
