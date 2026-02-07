import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEvent, getEventDetails, getEvents, updateEvent, updateEventPartial, publishEvent, unpublishEvent, closeEventResponses, closeEvent, sendEventCertificates, getActions, getDepartments } from '@/lib/api';
import type { Event, UpdateEventPayload } from '@/lib/api-types';

// Query keys
export const eventKeys = {
  all: ['events'] as const,
  lists: () => [...eventKeys.all, 'list'] as const,
  list: (params?: { limit?: number; offset?: number }) => [...eventKeys.lists(), params] as const,
  details: () => [...eventKeys.all, 'detail'] as const,
  detail: (id: number | string) => [...eventKeys.details(), id] as const,
  fullDetails: () => [...eventKeys.all, 'fullDetail'] as const,
  fullDetail: (id: number | string) => [...eventKeys.fullDetails(), id] as const,
  actions: () => [...eventKeys.all, 'actions'] as const,
  departments: () => [...eventKeys.all, 'departments'] as const,
};

// Hooks
export function useEvent(id: number | string) {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: async () => {
      const result = await getEvent(id);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });
}

export function useEvents() {
  return useQuery({
    queryKey: eventKeys.list(),
    queryFn: async () => {
      const result = await getEvents();
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });
}

export function useEventDetails(id: number | string, getToken: () => Promise<string | null>) {
  return useQuery({
    queryKey: eventKeys.fullDetail(id),
    queryFn: async () => {
      const result = await getEventDetails(id, getToken);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });
}

export function useUpdateEvent(getToken: () => Promise<string | null>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateEventPayload }) => {
      const result = await updateEvent(id, data, getToken);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: (data, { id }) => {
      // Update the cache with the new data
      queryClient.setQueryData(eventKeys.detail(id), data);
      // Invalidate details and list to refetch
      queryClient.invalidateQueries({ queryKey: eventKeys.fullDetails() });
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
  });
}

/**
 * Hook for partial event updates (e.g., status changes).
 * Uses PATCH instead of PUT.
 */
export function useUpdateEventPartial(getToken: () => Promise<string | null>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Event> }) => {
      const result = await updateEventPartial(id, data, getToken);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: (data, { id }) => {
      // Update the cache with the new data
      queryClient.setQueryData(eventKeys.detail(id), data);
      // Invalidate details and list to refetch
      queryClient.invalidateQueries({ queryKey: eventKeys.fullDetails() });
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
  });
}

export function useActions() {
  return useQuery({
    queryKey: eventKeys.actions(),
    queryFn: async () => {
      const result = await getActions();
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });
}

export function useDepartments() {
  return useQuery({
    queryKey: eventKeys.departments(),
    queryFn: async () => {
      const result = await getDepartments();
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });
}

/**
 * Hook for publishing an event via POST /events/[id]/publish.
 */
export function usePublishEvent(getToken: () => Promise<string | null>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const result = await publishEvent(id, getToken);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: (data, id) => {
      // Update the cache with the new data
      queryClient.setQueryData(eventKeys.detail(id), data);
      // Invalidate details and list to refetch
      queryClient.invalidateQueries({ queryKey: eventKeys.fullDetails() });
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
  });
}

/**
 * Hook for unpublishing an event via POST /events/[id]/unpublish.
 */
export function useUnpublishEvent(getToken: () => Promise<string | null>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const result = await unpublishEvent(id, getToken);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: (data, id) => {
      // Update the cache with the new data
      queryClient.setQueryData(eventKeys.detail(id), data);
      // Invalidate details and list to refetch
      queryClient.invalidateQueries({ queryKey: eventKeys.fullDetails() });
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
  });
}

/**
 * Hook for closing event responses via POST /events/[id]/close.
 * Changes event status from "open" to "active".
 */
export function useCloseEventResponses(getToken: () => Promise<string | null>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const result = await closeEventResponses(id, getToken);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: (data, id) => {
      // Update the cache with the new data
      queryClient.setQueryData(eventKeys.detail(id), data);
      // Invalidate details and list to refetch
      queryClient.invalidateQueries({ queryKey: eventKeys.fullDetails() });
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
  });
}

/**
 * Hook for closing an event.
 * Changes event status to "closed".
 */
export function useCloseEvent(getToken: () => Promise<string | null>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const result = await closeEvent(id, getToken);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: (data, id) => {
      // Update the cache with the new data
      queryClient.setQueryData(eventKeys.detail(id), data);
      // Invalidate details and list to refetch
      queryClient.invalidateQueries({ queryKey: eventKeys.fullDetails() });
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
  });
}

/**
 * Hook for sending event certificates.
 * Sends certificates to all attendees.
 */
export function useSendCertificates(getToken: () => Promise<string | null>) {
  return useMutation({
    mutationFn: async (id: number) => {
      const result = await sendEventCertificates(id, getToken);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });
}
