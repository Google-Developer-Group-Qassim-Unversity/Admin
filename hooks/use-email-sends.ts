import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/client";
import type { BlastSendRequest, BlastTestRequest, DirectEmailRequest, Send, SendsFilters } from "@/lib/api-types";

/** How often the outbox re-reads while a send is still going out. */
const POLL_MS = 4000;

export const sendKeys = {
  all: ["email-sends"] as const,
  list: (filters: SendsFilters) => [...sendKeys.all, "list", filters] as const,
  detail: (id: number) => [...sendKeys.all, "detail", id] as const,
  eligible: () => [...sendKeys.all, "eligible-count"] as const,
};

export const isSending = (send: Pick<Send, "status">) => send.status === "queued" || send.status === "running";

/**
 * The first page polls every four seconds while any loaded send is active.
 * Older pages load on demand and never join that polling loop. A changed head
 * cursor resets older pages, keeping pagination aligned with newly queued mail.
 */
export function useSends(filters: SendsFilters) {
  const api = useApi();
  const queryClient = useQueryClient();
  const key = sendKeys.list(filters);
  const first = useQuery({
    queryKey: [...key, "head"],
    queryFn: () => api.emails.sends(filters),
    refetchInterval: (query) => {
      const older = queryClient.getQueryData<{ pages: { items: Send[] }[] }>([...key, "older", query.state.data?.next_before]);
      return query.state.data?.items.some(isSending) || older?.pages.some((p) => p.items.some(isSending))
        ? POLL_MS
        : false;
    },
  });
  const cursor = first.data?.next_before;
  const older = useInfiniteQuery({
    queryKey: [...key, "older", cursor],
    queryFn: ({ pageParam }) => api.emails.sends(filters, pageParam),
    initialPageParam: cursor ?? undefined,
    getNextPageParam: (last) => last.next_before ?? undefined,
    enabled: false,
  });
  return {
    ...first,
    data: first.data ? { pages: [first.data, ...(older.data?.pages ?? [])] } : undefined,
    hasNextPage: cursor != null && (older.data ? older.hasNextPage : true),
    fetchNextPage: older.fetchNextPage,
    isFetchingNextPage: older.isFetching,
    nextPageError: older.error,
  };
}

/** One send with its recipients, failures and content. Polls while it is still going out. */
export function useSend(id: number | null) {
  const api = useApi();
  return useQuery({
    queryKey: sendKeys.detail(id ?? -1),
    queryFn: () => api.emails.send(id as number),
    enabled: id != null,
    refetchInterval: (query) => (query.state.data && isSending(query.state.data) ? POLL_MS : false),
  });
}

/** Members the club can email, and today's remaining Gmail capacity across both addresses. */
export function useBlastEligibleCount(enabled: boolean) {
  const api = useApi();
  return useQuery({ queryKey: sendKeys.eligible(), queryFn: () => api.emails.blastEligibleCount(), enabled });
}

/** A new send lands at the top of the outbox: re-read it and today's capacity. */
function useInvalidateSends() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: sendKeys.all });
}

export function useSendBlast() {
  const api = useApi();
  const onSuccess = useInvalidateSends();
  return useMutation({ mutationFn: (body: BlastSendRequest) => api.emails.blast(body), onSuccess });
}

export function useSendBlastTest() {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: BlastTestRequest) => api.emails.blastTest(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: sendKeys.eligible() }),
  });
}

export function useSendDirect() {
  const api = useApi();
  const onSuccess = useInvalidateSends();
  return useMutation({ mutationFn: (body: DirectEmailRequest) => api.emails.direct(body), onSuccess });
}

/**
 * Sends an event's certificates again. The endpoint skips everyone who already
 * got theirs, so after a partial send it only goes to the ones that failed.
 */
export function useRetryCertificates() {
  const api = useApi();
  const onSuccess = useInvalidateSends();
  return useMutation({ mutationFn: (eventId: number) => api.certificates.sendForEvent(eventId), onSuccess });
}
