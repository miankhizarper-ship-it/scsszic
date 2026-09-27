import { QueryClient } from "@tanstack/react-query";

/**
 * TanStack Query client — server-state foundation.
 *
 * No server data is consumed in Phase 1, but the provider is wired from day
 * one so Phase 2 hooks (useEvents, usePosts, …) drop straight in.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
