import { QueryClient } from "@tanstack/react-query";

let queryClientSingleton: QueryClient | null = null;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

export function getQueryClient(): QueryClient | null {
  return queryClientSingleton;
}

export function setQueryClient(client: QueryClient): void {
  queryClientSingleton = client;
}
