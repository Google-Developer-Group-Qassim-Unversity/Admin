import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useApi } from "@/lib/api/client";
import type { BlastSendRequest, BlastTestRequest, DirectEmailRequest, Send, SendsFilters, SendsPage } from "@/lib/api-types";

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
 * Poll the head while a loaded send is active. Keep rows displaced from the
 * head by new sends, with a stable history cursor, so loaded history stays put.
 */
export function useSends(filters: SendsFilters) {
  const api = useApi();
  const queryClient = useQueryClient();
  const key = sendKeys.list(filters);
  const headKey = [...key, "head"];
  const olderKey = [...key, "older"];
  const first = useQuery({
    queryKey: headKey,
    queryFn: async () => {
      const head = await api.emails.sends(filters);
      const previous = queryClient.getQueryData<SendsPage>(headKey);
      const history = queryClient.getQueryData<{ pages: SendsPage[] }>(olderKey);
      const incoming = [...head.items];
      // Returning to the tab can reveal more than one page of new sends.
      // Fill that gap before joining the previously loaded history.
      const knownIds = new Set(previous?.items.map((s) => s.id));
      let before = head.next_before;
      while (previous && before != null && !incoming.some((s) => knownIds.has(s.id))) {
        const page = await api.emails.sends(filters, before);
        incoming.push(...page.items);
        if (!page.items.length || page.next_before === before) break;
        before = page.next_before;
      }
      const freshIds = new Set(incoming.map((s) => s.id));
      // An active row can move beyond the first page. Refresh just those jobs
      // so their stale status cannot keep the polling loop alive forever.
      const loaded = new Map([...(history?.pages.flatMap((p) => p.items) ?? []), ...(previous?.items ?? [])].map((s) => [s.id, s]));
      const active = [...loaded.values()].filter((s) => isSending(s) && !freshIds.has(s.id));
      const refreshed = await Promise.all(active.map((s) => api.emails.send(s.id)));
      const items = [...new Map([...(previous?.items ?? []), ...refreshed, ...incoming].map((s) => [s.id, s])).values()];
      return { items, next_before: previous ? previous.next_before : head.next_before };
    },
    refetchInterval: (query) => {
      const history = queryClient.getQueryData<{ pages: SendsPage[] }>(olderKey);
      const current = new Map([...(history?.pages.flatMap((p) => p.items) ?? []), ...(query.state.data?.items ?? [])].map((s) => [s.id, s]));
      return [...current.values()].some(isSending) ? POLL_MS : false;
    },
  });
  const cursor = first.data?.next_before;
  const older = useInfiniteQuery({
    queryKey: olderKey,
    queryFn: ({ pageParam }) => api.emails.sends(filters, pageParam),
    initialPageParam: cursor ?? undefined,
    getNextPageParam: (last) => last.next_before ?? undefined,
    enabled: false,
  });
  const items = [...new Map([...(older.data?.pages.flatMap((p) => p.items) ?? []), ...(first.data?.items ?? [])]
    .map((s) => [s.id, s])).values()].sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
  return {
    ...first,
    data: first.data ? { pages: [{ items }] } : undefined,
    hasNextPage: older.data ? older.hasNextPage : cursor != null,
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
