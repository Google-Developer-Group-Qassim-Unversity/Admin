import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/client";
import type { EventRequestDetail, PipelineTeam, PipelineTeamsInput, UpdateDetailsInput } from "@/lib/pipeline-types";

export const pipelineKeys = {
  all: ["pipeline"] as const,
  me: () => [...pipelineKeys.all, "me"] as const,
  permissions: (departmentId: number) => [...pipelineKeys.all, "permissions", departmentId] as const,
  calendar: (from: string, to: string) => [...pipelineKeys.all, "calendar", from, to] as const,
  requests: () => [...pipelineKeys.all, "requests"] as const,
  request: (id: number) => [...pipelineKeys.all, "requests", id] as const,
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

export function usePipelineCalendar(from: string, to: string) {
  const api = useApi();
  return useQuery({ queryKey: pipelineKeys.calendar(from, to), queryFn: () => api.pipeline.calendar(from, to) });
}

export function useBanDays() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ dates, reason, unban }: { dates: string[]; reason?: string | null; unban?: boolean }) =>
      unban ? api.pipeline.unban(dates) : api.pipeline.ban(dates, reason ?? null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pipelineKeys.all }),
  });
}

export function usePipelineRequests(page = 1) {
  const api = useApi();
  return useQuery({
    queryKey: [...pipelineKeys.requests(), "list", page],
    queryFn: () => api.pipelineRequests.list({ page, pageSize: 20 }),
  });
}

export function usePipelineRequest(id: number) {
  const api = useApi();
  return useQuery({ queryKey: pipelineKeys.request(id), queryFn: () => api.pipelineRequests.get(id) });
}

/**
 * Every write on a request returns the fresh request; it replaces the cached
 * one, and the calendar and lists refetch because days may have changed hands.
 */
export function useRequestMutation<V>(id: number, fn: (vars: V) => Promise<EventRequestDetail>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (data) => {
      queryClient.setQueryData(pipelineKeys.request(id), data);
      queryClient.invalidateQueries({ queryKey: [...pipelineKeys.all, "calendar"] });
      queryClient.invalidateQueries({ queryKey: [...pipelineKeys.requests(), "list"] });
    },
  });
}

export function useUpdateDetails(id: number) {
  const api = useApi();
  return useRequestMutation(id, (body: UpdateDetailsInput) => api.pipelineRequests.updateDetails(id, body));
}

export function useRedate(id: number) {
  const api = useApi();
  return useRequestMutation(id, ({ start, end }: { start: string; end: string }) =>
    api.pipelineRequests.redate(id, start, end),
  );
}

export function useBookRequest() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ departmentId, start, end }: { departmentId: number; start: string; end: string }) =>
      api.pipelineRequests.book(departmentId, start, end),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pipelineKeys.all }),
  });
}

export function useCancelRequest() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.pipelineRequests.cancel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pipelineKeys.all }),
  });
}

export function useSaveBrief(id: number, team: PipelineTeam) {
  const api = useApi();
  return useRequestMutation(id, (brief: Record<string, unknown>) => api.pipelineRequests.saveBrief(id, team, brief));
}

export function useSubmitRequest(id: number) {
  const api = useApi();
  return useRequestMutation(id, (_: void) => api.pipelineRequests.submit(id));
}
