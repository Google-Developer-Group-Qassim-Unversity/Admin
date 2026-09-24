import { QueryClient, isServer } from '@tanstack/react-query';
import { ApiRequestError } from '@/lib/api/errors';

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (error instanceof ApiRequestError && error.isNotFound) {
            return false;
          }
          return failureCount < 3;
        },
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

/**
 * Server: a fresh client per request, so one request's prefetched data never
 * leaks into another's. Browser: one shared client for the life of the tab -
 * that shared cache is what lets a hydrated page skip a refetch on revisit.
 */
export function getQueryClient() {
  if (isServer) {
    return makeQueryClient();
  }

  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
