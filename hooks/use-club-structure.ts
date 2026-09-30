import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useApi } from "@/lib/api/client";
import type { Api } from "@/lib/api/resources";
import { ApiRequestError } from "@/lib/api/errors";
import { useAccess } from "@/hooks/use-access";
import { eventKeys } from "@/hooks/use-event";
import { memberKeys } from "@/hooks/use-members";

export const clubStructureKeys = {
  all: ["club-structure"] as const,
  /** `semesterId` undefined = whichever semester is current. */
  overview: (semesterId?: string) => ["club-structure", "overview", semesterId ?? "current"] as const,
  department: (id: number) => ["club-structure", "department", id] as const,
  roster: (id: number, semesterId: string) => ["club-structure", "roster", id, semesterId] as const,
};

const clubQueryOptions = {
  staleTime: 30_000,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  retry: (failureCount: number, error: Error) => {
    if (error instanceof ApiRequestError && error.status >= 400 && error.status < 500) return false;
    return failureCount < 1;
  },
};

export function useRefreshClubStructure() {
  const queryClient = useQueryClient();
  return useCallback(async () => {
    // Cancel even an initial read: its pre-write snapshot must not win the refresh.
    await queryClient.cancelQueries({ queryKey: clubStructureKeys.all });
    await queryClient.invalidateQueries({ queryKey: clubStructureKeys.all });
  }, [queryClient]);
}

// Query option factory - the same definition prefetched server-side
// (`serverApi()`) and read client-side (`useApi()`). The route is gated to
// admin/admin_points/super_admin in middleware, so a server-side prefetch
// never needs the client-only `role !== "none"` check below.
//
// This module must not carry a "use client" directive: the server page
// imports this factory, and a client-module export reaches a server component
// as a client reference that throws when called ("Attempted to call
// clubOverviewQuery() from the server but clubOverviewQuery is on the client").
// Hooks are only ever called from client components anyway, exactly like
// `use-event.ts` and `use-members.ts`.
export const clubOverviewQuery = (api: Api, semesterId?: string) =>
  queryOptions({
    ...clubQueryOptions,
    queryKey: clubStructureKeys.overview(semesterId),
    queryFn: () => api.clubStructure.overview(semesterId),
  });

export function useClubOverview(semesterId?: string) {
  const api = useApi();
  const { can } = useAccess();
  return useQuery({
    ...clubOverviewQuery(api, semesterId),
    enabled: can("club_structure.view"),
  });
}

export function useClubDepartment(id: number) {
  const api = useApi();
  const { can } = useAccess();
  return useQuery({
    ...clubQueryOptions,
    queryKey: clubStructureKeys.department(id),
    queryFn: () => api.clubStructure.department(id),
    enabled: can("club_structure.view"),
  });
}

export function useClubRoster(id: number, semesterId: string) {
  const api = useApi();
  const { can } = useAccess();
  return useQuery({
    ...clubQueryOptions,
    queryKey: clubStructureKeys.roster(id, semesterId),
    queryFn: () => api.clubStructure.roster(id, semesterId),
    enabled: can("club_structure.view"),
  });
}

/** Keep writes and conflict recovery consistent across cards, dialogs and the drawer. */
export function useClubMutation<T, R>(mutation: (api: Api["clubStructure"], values: T) => Promise<R>) {
  const api = useApi();
  const queryClient = useQueryClient();
  const refresh = useRefreshClubStructure();
  return useMutation({
    mutationKey: clubStructureKeys.all,
    mutationFn: (values: T) => mutation(api.clubStructure, values),
    retry: false,
    onSettled: async (_data, error) => {
      // A lost response can follow a committed write. Refresh before another attempt,
      // including on 404/conflict/network errors, without retrying the mutation.
      await Promise.all([
        refresh(),
        queryClient
          .cancelQueries({ queryKey: eventKeys.departments() })
          .then(() => queryClient.invalidateQueries({ queryKey: eventKeys.departments() })),
        error instanceof ApiRequestError && (error.status === 404 || error.status === 409)
          ? queryClient.invalidateQueries({ queryKey: memberKeys.all })
          : Promise.resolve(),
      ]);
    },
  });
}
