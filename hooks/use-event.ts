import { useQuery, useMutation, useQueryClient, keepPreviousData, queryOptions } from '@tanstack/react-query';
import { useApi } from '@/lib/api/client';
import { ApiRequestError } from '@/lib/api';
import type {
  CreateContentLinkPayload,
  Event,
  UpdateContentLinkPayload,
  UpdateEventPayload,
  BackfillMember,
  AttendanceType,
  EventsPageParams,
} from '@/lib/api-types';
import type { Api, EventsFilters } from '@/lib/api/resources';
import { pipelineKeys } from './use-pipeline';

// Query keys
const eventKeysAll = ['events'] as const;
export const eventKeys = {
  all: eventKeysAll,
  lists: () => [...eventKeysAll, 'list'] as const,
  list: (filters?: EventsFilters) => [...eventKeys.lists(), filters] as const,
  details: () => [...eventKeysAll, 'detail'] as const,
  // Route params are strings, counters are numbers: one key per id, whatever
  // type it arrives as, or invalidations miss the cached query silently.
  detail: (id: number | string) => [...eventKeys.details(), String(id)] as const,
  fullDetails: () => [...eventKeysAll, 'fullDetail'] as const,
  fullDetail: (id: number | string) => [...eventKeys.fullDetails(), String(id)] as const,
  actions: () => [...eventKeysAll, 'actions'] as const,
  departmentsRoot: [...eventKeysAll, 'departments'] as const,
  departments: (endDate?: string) => [...eventKeys.departmentsRoot, endDate ?? 'all'] as const,
  attendance: (id: number | string, day: string, type?: string) => [...eventKeysAll, 'attendance', id, day, type] as const,
  recordingCandidates: (id: number | string) => [...eventKeysAll, 'recordingCandidates', String(id)] as const,
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

// Query option factories - the same definition prefetched server-side
// (`serverApi()`) and read client-side (`useApi()`), so the two can never
// drift onto different query keys and silently miss hydration.
export const eventQuery = (api: Api, id: number | string) =>
  queryOptions({
    queryKey: eventKeys.detail(id),
    queryFn: () => api.events.get(id),
  });

export const eventsPaginatedQuery = (api: Api, params: EventsPageParams) =>
  queryOptions({
    queryKey: [...eventKeys.lists(), 'paginated', params],
    queryFn: () => api.events.listPaginated(params),
  });

// Hooks
export function useEvent(id: number | string) {
  const api = useApi();
  return useQuery(eventQuery(api, id));
}

/** Every event, optionally narrowed by semester or date range. */
export function useEvents(filters?: EventsFilters) {
  const api = useApi();
  return useQuery({
    queryKey: eventKeys.list(filters),
    queryFn: () => api.events.list(filters),
  });
}

/**
 * One server-rendered page of events for the admin list. The database does the
 * paging, semester/status filtering and name search; `keepPreviousData` keeps
 * the current page on screen while the next loads.
 */
export function useEventsPaginated(params: EventsPageParams) {
  const api = useApi();
  return useQuery({
    ...eventsPaginatedQuery(api, params),
    placeholderData: keepPreviousData,
  });
}

export function useEventDetails(id: number | string, enabled = true) {
  const api = useApi();
  return useQuery({
    queryKey: eventKeys.fullDetail(id),
    queryFn: () => api.events.details(id),
    enabled,
  });
}

/** Who did what to the event. Under the full-detail key, so whatever refreshes the event refreshes this too. */
export function useEventHistory(id: number | string, enabled = true) {
  const api = useApi();
  return useQuery({
    queryKey: [...eventKeys.fullDetail(id), "history"],
    queryFn: () => api.events.history(id),
    enabled,
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

/** Invalidate every cache a content-link change touches: the event's own
 * detail caches and the events list. */
function useContentLinkCacheInvalidation(id: number) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: eventKeys.fullDetail(id) });
    queryClient.invalidateQueries({ queryKey: eventKeys.detail(id) });
    queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
  };
}

/** Paste a labeled link to event content (Drive/YouTube) on the Content tab. */
export function useCreateContentLink(id: number) {
  const api = useApi();
  const onLinkChanged = useContentLinkCacheInvalidation(id);

  return useMutation({
    mutationFn: (data: CreateContentLinkPayload) => api.events.createContentLink(id, data),
    onSuccess: onLinkChanged,
  });
}

/** Upload slides directly to Google Drive via streamed multipart upload. */
export function useUploadDriveSlides(id: number) {
  const api = useApi();
  const onLinkChanged = useContentLinkCacheInvalidation(id);

  return useMutation({
    mutationFn: ({ file, onProgress }: { file: File; onProgress?: (progress: number) => void }) =>
      api.events.uploadDriveSlides(id, file, onProgress),
    onSuccess: onLinkChanged,
  });
}

/** Edit a content link's label, URL, kind or publish state. */
export function useUpdateContentLink(id: number) {
  const api = useApi();
  const onLinkChanged = useContentLinkCacheInvalidation(id);

  return useMutation({
    mutationFn: ({ linkId, data }: { linkId: string; data: UpdateContentLinkPayload }) =>
      api.events.updateContentLink(id, linkId, data),
    onSuccess: onLinkChanged,
  });
}

/** Hard-delete a content link; it never comes back. */
export function useDeleteContentLink(id: number) {
  const api = useApi();
  const onLinkChanged = useContentLinkCacheInvalidation(id);

  return useMutation({
    mutationFn: (linkId: string) => api.events.removeContentLink(id, linkId),
    onSuccess: onLinkChanged,
  });
}

/** Fetch Google Meet recording candidates for an event from Drive. */
export function useRecordingCandidates(id: number, enabled: boolean = true) {
  const api = useApi();
  return useQuery({
    queryKey: eventKeys.recordingCandidates(id),
    queryFn: () => api.events.getRecordingCandidates(id),
    enabled: enabled && id !== 0,
    staleTime: 10_000,
    retry: (failureCount, error) =>
      !(error instanceof ApiRequestError && error.status === 503) && failureCount < 3,
  });
}

/** Grant public access to a recording candidate file in Drive. */
export function useMakeRecordingPublic(id: number) {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (fileId: string) => api.events.makeRecordingCandidatePublic(id, fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: eventKeys.recordingCandidates(id) });
    },
  });
}

/** Fetch Google Drive storage quota telemetry (fail-soft). */
export function useDriveStorageQuota() {
  const api = useApi();
  return useQuery({
    queryKey: ['drive', 'storage-quota'],
    queryFn: () => api.events.getDriveStorageQuota(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useActions() {
  const api = useApi();
  return useQuery({
    queryKey: eventKeys.actions(),
    queryFn: () => api.actions.list(),
  });
}

/**
 * Departments for the department picker. With an `endDate` ("YYYY-MM-DD"),
 * the list is the departments enrolled in the semester that date falls in,
 * minus the ones hidden from the leaderboard; without it, every department.
 */
export function useDepartments(endDate?: string) {
  const api = useApi();
  return useQuery({
    queryKey: eventKeys.departments(endDate),
    queryFn: () => api.departments.list(endDate ? { endDate } : undefined),
    // Changing the event's end date moves the list to another semester;
    // keep the current options on screen while the new one loads.
    placeholderData: keepPreviousData,
  });
}

/** One department by id - used to keep an option for an event's existing
 * department when it no longer qualifies for the picker's semester. */
export function useDepartment(id: number | undefined) {
  const api = useApi();
  return useQuery({
    queryKey: [...eventKeys.departmentsRoot, 'byId', id] as const,
    queryFn: () => api.departments.get(id!),
    enabled: id != null,
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

export function useScanAttendance() {
  const api = useApi();
  const onAttendanceChanged = useAttendanceInvalidation();

  return useMutation({
    mutationFn: ({ eventId, uuid, day, sig }: { eventId: number; uuid: string; day?: number; sig?: string }) =>
      api.attendance.scan(eventId, uuid, day, sig),
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
      // A pipeline request it was published from goes too, and frees its days.
      queryClient.invalidateQueries({ queryKey: pipelineKeys.all });
    },
  });
}
