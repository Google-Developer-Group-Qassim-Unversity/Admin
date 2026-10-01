import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/client";
import type { EventRequestDetail, PipelineTeam, UpdateDetailsInput } from "@/lib/pipeline-types";

export const pipelineKeys = {
  all: ["pipeline"] as const,
  me: () => [...pipelineKeys.all, "me"] as const,
  calendar: (from: string, to: string) => [...pipelineKeys.all, "calendar", from, to] as const,
  requests: () => [...pipelineKeys.all, "requests"] as const,
  request: (id: number) => [...pipelineKeys.all, "requests", id] as const,
};

/** Which departments the signed-in person acts for, and which department is which team. */
export function usePipelineMe() {
  const api = useApi();
  return useQuery({ queryKey: pipelineKeys.me(), queryFn: () => api.pipeline.me(), staleTime: 30_000 });
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
  return useRequestMutation<void>(id, () => api.pipelineRequests.submit(id));
}

export function usePipelineNotifications() {
  const api = useApi();
  return useQuery({
    queryKey: [...pipelineKeys.all, "notifications"],
    queryFn: () => api.pipeline.notifications(),
    refetchInterval: 60_000,
  });
}

export function useReadNotifications() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | "all") => (id === "all" ? api.pipeline.readAllNotifications() : api.pipeline.readNotification(id)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [...pipelineKeys.all, "notifications"] }),
  });
}

export function useInbox() {
  const api = useApi();
  return useQuery({ queryKey: [...pipelineKeys.requests(), "list", "inbox"], queryFn: () => api.pipelineRequests.inbox() });
}

export function useReturnRequest(id: number) {
  const api = useApi();
  return useRequestMutation(id, (notes: string) => api.pipelineRequests.returnToTeam(id, notes));
}

export function useResubmit(id: number) {
  const api = useApi();
  return useRequestMutation<void>(id, () => api.pipelineRequests.resubmit(id));
}

export function useCompleteTask(id: number) {
  const api = useApi();
  return useRequestMutation(id, (team: PipelineTeam) => api.pipelineRequests.complete(id, team));
}

export function usePublishRequest(id: number) {
  const api = useApi();
  return useRequestMutation(
    id,
    (body: { department_action_id: number; member_action_id: number; image_url: string | null }) =>
      api.pipelineRequests.publish(id, body),
  );
}
