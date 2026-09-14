"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApi } from "@/lib/api/client";
import type { Api } from "@/lib/api/resources";
import { ApiRequestError } from "@/lib/api/errors";
import { useUserRole } from "@/hooks/use-rbac";
import { eventKeys } from "@/hooks/use-event";

export const clubStructureKeys = {
  all: ["club-structure"] as const,
  overview: (includeArchived: boolean) => ["club-structure", "overview", includeArchived] as const,
  department: (id: number) => ["club-structure", "department", id] as const,
  roster: (id: number) => ["club-structure", "roster", id] as const,
};

export function useClubOverview(includeArchived = false) {
  const api = useApi();
  const role = useUserRole();
  return useQuery({
    queryKey: clubStructureKeys.overview(includeArchived),
    queryFn: () => api.clubStructure.overview(includeArchived),
    enabled: role !== "none",
  });
}

export function useClubDepartment(id: number) {
  const api = useApi();
  const role = useUserRole();
  return useQuery({
    queryKey: clubStructureKeys.department(id),
    queryFn: () => api.clubStructure.department(id),
    enabled: role !== "none",
  });
}

export function useClubRoster(id: number) {
  const api = useApi();
  const role = useUserRole();
  return useQuery({
    queryKey: clubStructureKeys.roster(id),
    queryFn: () => api.clubStructure.roster(id),
    enabled: role !== "none",
  });
}

/** Keep writes and conflict recovery consistent across cards, dialogs and the drawer. */
export function useClubMutation<T, R>(mutation: (api: Api["clubStructure"], values: T) => Promise<R>) {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (values: T) => mutation(api.clubStructure, values),
    retry: false,
    onSettled: async (_data, error) => {
      // Never automatically retry a stale replacement with the newer tenure ID.
      if (!error || (error instanceof ApiRequestError && error.status === 409)) {
        await queryClient.invalidateQueries({ queryKey: clubStructureKeys.all });
      }
      if (!error) {
        await queryClient.invalidateQueries({ queryKey: eventKeys.departments() });
      }
    },
  });
}
