import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/lib/api/client';
import type { Event, UpdateEventPayload, BackfillMember, AttendanceType } from '@/lib/api-types';
import type { EventsFilters } from '@/lib/api/resources';

// Query keys
export const eventKeys = {
  all: ['events'] as const,
  lists: () => [...eventKeys.all, 'list'] as const,
  list: (filters?: EventsFilters) => [...eventKeys.lists(), filters] as const,
  details: () => [...eventKeys.all, 'detail'] as const,
  detail: (id: number | string) => [...eventKeys.details(), id] as const,
  fullDetails: () => [...eventKeys.all, 'fullDetail'] as const,
  fullDetail: (id: number | string) => [...eventKeys.fullDetails(), id] as const,
  actions: () => [...eventKeys.all, 'actions'] as const,
  departments: () => [...eventKeys.all, 'departments'] as const,
  attendance: (id: number | string, day: string, type?: string) => [...eventKeys.all, 'attendance', id, day, type] as const,
};

/**
 * Invalidate everything that shows an event after it changes.
 *
 * Eleven mutations below repeated these three lines. They are one unit: the
 * detail cache gets the fresh row, the full-detail and list queries refetch.
 */
function useEventCacheUpdates() {
  const queryClient = useQueryClient();

  return (id: number, event: Event) => {
    queryClient.setQueryData(eventKeys.detail(id), event);
    queryClient.invalidateQueries({ queryKey: eventKeys.fullDetails() });
    queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
  };
}

// Hooks
export function useEvent(id: number | string) {
  const api = useApi();
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: () => api.events.get(id),
  });
}

/** Every event, optionally narrowed by semester or date range. */
export function useEvents(filters?: EventsFilters) {
  const api = useApi();
  return useQuery({
    queryKey: eventKeys.list(filters),
    queryFn: () => api.events.list(filters),
  });
}

export function useEventDetails(id: number | string) {
  const api = useApi();
  return useQuery({
    queryKey: eventKeys.fullDetail(id),
    queryFn: () => api.events.details(id),
  });
}

export function useUpdateEvent() {
  const api = useApi();
  const onEventChanged = useEventCacheUpdates();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateEventPayload }) => api.events.update(id, data),
    onSuccess: (data, { id }) => onEventChanged(id, data),
  });
}

/**
 * Hook for partial event updates (e.g., status changes).
 * Uses PATCH instead of PUT.
 */
export function useUpdateEventPartial() {
  const api = useApi();
  const onEventChanged = useEventCacheUpdates();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Event> }) => api.events.updatePartial(id, data),
    onSuccess: (data, { id }) => onEventChanged(id, data),
  });
}

/**
 * Hook for setting (or clearing) a remote event's join link via
 * PUT /events/[id]/meeting-url. Pass null to clear it.
 */
export function useUpdateEventMeetingUrl() {
  const api = useApi();
  const onEventChanged = useEventCacheUpdates();

  return useMutation({
    mutationFn: ({ id, meetingUrl }: { id: number; meetingUrl: string | null }) =>
      api.events.updateMeetingUrl(id, meetingUrl),
    onSuccess: (data, { id }) => onEventChanged(id, data),
  });
}

export function useActions() {
  const api = useApi();
  return useQuery({
    queryKey: eventKeys.actions(),
    queryFn: () => api.actions.list(),
  });
}

export function useDepartments() {
  const api = useApi();
  return useQuery({
    queryKey: eventKeys.departments(),
    queryFn: () => api.departments.list(),
  });
}

/**
 * Hook for publishing an event via PUT /events/[id]/status.
 */
export function usePublishEvent() {
  const api = useApi();
  const onEventChanged = useEventCacheUpdates();

  return useMutation({
    mutationFn: (id: number) => api.eventStatus.publish(id),
    onSuccess: (data, id) => onEventChanged(id, data),
  });
}

/**
 * Hook for unpublishing an event, back to "draft".
 */
export function useUnpublishEvent() {
  const api = useApi();
  const onEventChanged = useEventCacheUpdates();

  return useMutation({
    mutationFn: (id: number) => api.eventStatus.unpublish(id),
    onSuccess: (data, id) => onEventChanged(id, data),
  });
}

/**
 * Hook for closing event responses.
 * Changes event status from "open" to "active".
 */
export function useCloseEventResponses() {
  const api = useApi();
  const onEventChanged = useEventCacheUpdates();

  return useMutation({
    mutationFn: (id: number) => api.eventStatus.closeResponses(id),
    onSuccess: (data, id) => onEventChanged(id, data),
  });
}

/**
 * Hook for re-opening event responses.
 * Changes event status from "active" back to "open".
 */
export function useOpenEventResponses() {
  const api = useApi();
  const onEventChanged = useEventCacheUpdates();

  return useMutation({
    mutationFn: (id: number) => api.eventStatus.openResponses(id),
    onSuccess: (data, id) => onEventChanged(id, data),
  });
}

/**
 * Hook for closing an event.
 * Changes event status to "closed".
 */
export function useCloseEvent() {
  const api = useApi();
  const onEventChanged = useEventCacheUpdates();

  return useMutation({
    mutationFn: (id: number) => api.eventStatus.close(id),
    onSuccess: (data, id) => onEventChanged(id, data),
  });
}

/**
 * Hook for re-opening a closed event.
 * Changes event status from "closed" back to "active".
 */
export function useOpenEvent() {
  const api = useApi();
  const onEventChanged = useEventCacheUpdates();

  return useMutation({
    mutationFn: (id: number) => api.eventStatus.reopen(id),
    onSuccess: (data, id) => onEventChanged(id, data),
  });
}

/**
 * Hook for sending event certificates.
 * Sends certificates to all attendees.
 */
export function useSendCertificates() {
  const api = useApi();
  return useMutation({
    mutationFn: (id: number) => api.certificates.sendForEvent(id),
  });
}

/**
 * Hook for fetching event attendance records.
 * @param day - "1", "2", ..., "all", or "exclusive_all"
 * @param type - "count", "detailed", or "me" (defaults to "detailed")
 */
export function useEventAttendance(
  eventId: number | string,
  day: string,
  enabled = true,
  type: AttendanceType = "detailed"
) {
  const api = useApi();
  return useQuery({
    queryKey: eventKeys.attendance(eventId, day, type),
    queryFn: () => api.attendance.forEvent(Number(eventId), day, type),
    enabled,
  });
}

/** Refetch an event's attendance after it has been edited. */
function useAttendanceInvalidation() {
  const queryClient = useQueryClient();
  return (eventId: number) => queryClient.invalidateQueries({ queryKey: eventKeys.attendance(eventId, 'all') });
}

export function useMarkAttendanceManual() {
  const api = useApi();
  const onAttendanceChanged = useAttendanceInvalidation();

  return useMutation({
    mutationFn: ({ eventId, memberIds, days }: { eventId: number; memberIds: number[]; days?: number[] }) =>
      api.attendance.markManual(eventId, memberIds, days),
    onSuccess: (_, { eventId }) => onAttendanceChanged(eventId),
  });
}

export function useRemoveAttendanceManual() {
  const api = useApi();
  const onAttendanceChanged = useAttendanceInvalidation();

  return useMutation({
    mutationFn: ({ eventId, memberIds, day }: { eventId: number; memberIds: number[]; day?: number }) =>
      api.attendance.removeManual(eventId, memberIds, day),
    onSuccess: (_, { eventId }) => onAttendanceChanged(eventId),
  });
}

export function useCopyAttendance() {
  const api = useApi();
  const onAttendanceChanged = useAttendanceInvalidation();

  return useMutation({
    mutationFn: ({ eventId, sourceDay, targetDays }: { eventId: number; sourceDay: number; targetDays: number[] }) =>
      api.attendance.copy(eventId, sourceDay, targetDays),
    onSuccess: (_, { eventId }) => onAttendanceChanged(eventId),
  });
}

export function useBackfillAttendance() {
  const api = useApi();
  const onAttendanceChanged = useAttendanceInvalidation();

  return useMutation({
    mutationFn: ({ eventId, members, day }: { eventId: number; members: BackfillMember[]; day: number }) =>
      api.attendance.backfill(eventId, members, day),
    onSuccess: (_, { eventId }) => onAttendanceChanged(eventId),
  });
}

/**
 * Hook for deleting a draft event.
 * Only events with status "draft" can be deleted.
 */
export function useDeleteEvent() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => api.events.remove(id),
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: eventKeys.detail(id) });
      queryClient.removeQueries({ queryKey: eventKeys.fullDetail(id) });
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
  });
}
