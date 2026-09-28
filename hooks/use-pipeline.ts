import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/client";
import type { PipelineTeamsInput } from "@/lib/pipeline-types";

export const pipelineKeys = {
  all: ["pipeline"] as const,
  me: () => [...pipelineKeys.all, "me"] as const,
  permissions: (departmentId: number) => [...pipelineKeys.all, "permissions", departmentId] as const,
};

/** Which departments the signed-in person acts for, and which department is which team. */
export function usePipelineMe() {
  const api = useApi();
  return useQuery({ queryKey: pipelineKeys.me(), queryFn: () => api.pipeline.me(), staleTime: 30_000 });
}

export function useSetPipelineTeams() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: PipelineTeamsInput) => api.pipeline.setTeams(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pipelineKeys.all }),
  });
}

export function useDepartmentPermissions(departmentId: number | null) {
  const api = useApi();
  return useQuery({
    queryKey: pipelineKeys.permissions(departmentId ?? 0),
    queryFn: () => api.pipeline.permissions(departmentId as number),
    enabled: departmentId !== null,
  });
}

export function useGrantPermission(departmentId: number) {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (memberId: number) => api.pipeline.grant(departmentId, memberId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pipelineKeys.permissions(departmentId) }),
  });
}

export function useRevokePermission(departmentId: number) {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (grantId: number) => api.pipeline.revoke(departmentId, grantId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pipelineKeys.permissions(departmentId) }),
  });
}
