"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useApi } from "@/lib/api/client";
import type { Api } from "@/lib/api/resources";
import { ApiRequestError } from "@/lib/api/errors";
import { useUserRole } from "@/hooks/use-rbac";
import { eventKeys } from "@/hooks/use-event";
import { memberKeys } from "@/hooks/use-members";

export const clubStructureKeys = {
  all: ["club-structure"] as const,
  overview: (includeArchived: boolean) => ["club-structure", "overview", includeArchived] as const,
  department: (id: number) => ["club-structure", "department", id] as const,
  roster: (id: number) => ["club-structure", "roster", id] as const,
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

export function useClubOverview(includeArchived = false) {
  const api = useApi();
  const role = useUserRole();
  return useQuery({
    ...clubQueryOptions,
    queryKey: clubStructureKeys.overview(includeArchived),
    queryFn: () => api.clubStructure.overview(includeArchived),
    enabled: role !== "none",
  });
}

export function useClubDepartment(id: number) {
  const api = useApi();
  const role = useUserRole();
  return useQuery({
    ...clubQueryOptions,
    queryKey: clubStructureKeys.department(id),
    queryFn: () => api.clubStructure.department(id),
    enabled: role !== "none",
  });
}

export function useClubRoster(id: number) {
  const api = useApi();
  const role = useUserRole();
  return useQuery({
    ...clubQueryOptions,
    queryKey: clubStructureKeys.roster(id),
    queryFn: () => api.clubStructure.roster(id),
    enabled: role !== "none",
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
