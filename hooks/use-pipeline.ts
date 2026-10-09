import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/client";
import type { EventRequestDetail, PipelineTeam, UpdateDetailsInput } from "@/lib/pipeline-types";

export const pipelineKeys = {
  all: ["pipeline"] as const,
  me: () => [...pipelineKeys.all, "me"] as const,
  calendar: (from: string, to: string) => [...pipelineKeys.all, "calendar", from, to] as const,
  requests: () => [...pipelineKeys.all, "requests"] as const,
  request: (id: string) => [...pipelineKeys.all, "requests", id] as const,
};

/** Which departments the signed-in person acts for, and which department is which team. */
export function usePipelineMe({ enabled = true }: { enabled?: boolean } = {}) {
  const api = useApi();
  return useQuery({ queryKey: pipelineKeys.me(), queryFn: () => api.pipeline.me(), staleTime: 30_000, enabled });
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

export function usePipelineRequest(id: string, { enabled = true }: { enabled?: boolean } = {}) {
  const api = useApi();
  return useQuery({ queryKey: pipelineKeys.request(id), queryFn: () => api.pipelineRequests.get(id), enabled: enabled && !!id });
}

/**
 * Every request the caller can see, up to 100, for the dashboard's overview:
 * whose turn it is, the stage board. A super admin sees every department; the
 * backend's page size caps it at 100.
 */
export function usePipelineOverview(enabled = true) {
  const api = useApi();
  return useQuery({
    queryKey: [...pipelineKeys.requests(), "list", "overview"],
    queryFn: () => api.pipelineRequests.list({ page: 1, pageSize: 100 }),
    enabled,
  });
}

/**
 * Every write on a request returns the fresh request; it replaces the cached
 * one, and the calendar and lists refetch because days may have changed hands.
 */
export function useRequestMutation<V>(id: string, fn: (vars: V) => Promise<EventRequestDetail>) {
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

export function useUpdateDetails(id: string) {
  const api = useApi();
  return useRequestMutation(id, (body: UpdateDetailsInput) => api.pipelineRequests.updateDetails(id, body));
}

export function useRedate(id: string) {
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
    mutationFn: (id: string) => api.pipelineRequests.cancel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: pipelineKeys.all }),
  });
}

export function useSaveBrief(id: string, team: PipelineTeam) {
  const api = useApi();
  return useRequestMutation(id, (brief: Record<string, unknown>) => api.pipelineRequests.saveBrief(id, team, brief));
}

export function useSaveDeliverable(id: string, team: PipelineTeam) {
  const api = useApi();
  return useRequestMutation(id, (deliverable: Record<string, unknown>) =>
    api.pipelineRequests.saveDeliverable(id, team, deliverable),
  );
}

export function useUploadPoster(id: string) {
  const api = useApi();
  return useRequestMutation(id, (file: File) => api.pipelineRequests.uploadPoster(id, file));
}

export function useSubmitRequest(id: string) {
  const api = useApi();
  return useRequestMutation<void>(id, () => api.pipelineRequests.submit(id));
}

/** `enabled` lets the top bar's bell skip the call for someone without pipeline access. */
export function usePipelineNotifications({ enabled = true }: { enabled?: boolean } = {}) {
  const api = useApi();
  return useQuery({
    queryKey: [...pipelineKeys.all, "notifications"],
    queryFn: () => api.pipeline.notifications(),
    refetchInterval: 60_000,
    enabled,
  });
}

export function useReadNotifications() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string | "all") => (id === "all" ? api.pipeline.readAllNotifications() : api.pipeline.readNotification(id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...pipelineKeys.all, "notifications"] }),
  });
}

export function useInbox(enabled = true) {
  const api = useApi();
  return useQuery({
    queryKey: [...pipelineKeys.requests(), "list", "inbox"],
    queryFn: () => api.pipelineRequests.inbox(),
    enabled,
  });
}

export function useReturnRequest(id: string) {
  const api = useApi();
  return useRequestMutation(id, (notes: string) => api.pipelineRequests.returnToTeam(id, notes));
}

export function useResubmit(id: string) {
  const api = useApi();
  return useRequestMutation<void>(id, () => api.pipelineRequests.resubmit(id));
}

export function useCompleteTask(id: string) {
  const api = useApi();
  return useRequestMutation(id, (team: PipelineTeam) => api.pipelineRequests.complete(id, team));
}

export function usePublishRequest(id: string) {
  const api = useApi();
  return useRequestMutation<void>(id, () => api.pipelineRequests.publish(id));
}
