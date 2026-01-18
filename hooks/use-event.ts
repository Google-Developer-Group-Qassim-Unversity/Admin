import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEvent, getEvents, updateEvent } from '@/lib/api';
import type { Event } from '@/lib/api-types';

// Query keys
export const eventKeys = {
  all: ['events'] as const,
  lists: () => [...eventKeys.all, 'list'] as const,
  list: (params?: { limit?: number; offset?: number }) => [...eventKeys.lists(), params] as const,
  details: () => [...eventKeys.all, 'detail'] as const,
  detail: (id: number | string) => [...eventKeys.details(), id] as const,
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

export function useEvents(params?: { limit?: number; offset?: number }) {
  return useQuery({
    queryKey: eventKeys.list(params),
    queryFn: async () => {
      const result = await getEvents(params);
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
    mutationFn: async ({ id, data }: { id: number; data: Partial<Event> }) => {
      const result = await updateEvent(id, data, getToken);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: (data, { id }) => {
      // Update the cache with the new data
      queryClient.setQueryData(eventKeys.detail(id), data);
      // Invalidate the list to refetch
      queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
    },
  });
}
