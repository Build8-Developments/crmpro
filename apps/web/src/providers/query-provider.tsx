"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

let queryClientSingleton: QueryClient | null = null;

export function getQueryClient(): QueryClient | null {
  return queryClientSingleton;
}

/**
 * Provides the TanStack Query client for all server-state.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => {
    const client = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000,
          retry: 1,
          refetchOnWindowFocus: false,
        },
      },
    });
    queryClientSingleton = client;
    return client;
  });

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
