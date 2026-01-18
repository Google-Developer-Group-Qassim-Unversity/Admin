import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { GoogleFormData } from '@/lib/api-types';
import { getFormByEventId } from '@/lib/api';

// Query keys
export const formKeys = {
  all: ['forms'] as const,
  byEvent: (eventId: number) => [...formKeys.all, 'event', eventId] as const,
};

export const authKeys = {
  status: (eventId: number) => ['auth', 'status', eventId] as const,
};

// Types
interface GoogleUser {
  name?: string;
  email?: string;
  picture?: string;
}

interface AuthStatusResponse {
  user: GoogleUser | null;
}

// Hooks
export function useFormData(eventId: number) {
  return useQuery({
    queryKey: formKeys.byEvent(eventId),
    queryFn: async (): Promise<GoogleFormData | null> => {
      const result = await getFormByEventId(eventId);
      
      if (!result.success) {
        // No form exists for this event (404) - this is expected
        if (result.error.status === 404) return null;
        throw new Error(result.error.message);
      }
      
      return {
        id: result.data.id,
        googleFormId: result.data.google_form_id,
        googleRespondersUrl: result.data.google_responders_url,
      };
    },
  });
}

export function useGoogleAuthStatus(eventId: number) {
  return useQuery({
    queryKey: authKeys.status(eventId),
    queryFn: async (): Promise<GoogleUser | null> => {
      const res = await fetch(`/api/auth/status?eventId=${eventId}`);
      if (!res.ok) throw new Error('Failed to check auth status');
      
      const data: AuthStatusResponse = await res.json();
      return data.user || null;
    },
  });
}

export function useCopyForm(eventId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (refreshToken: string) => {
      const res = await fetch('/api/drive/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, refreshToken }),
      });
      if (!res.ok) throw new Error('Failed to attach form');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: formKeys.byEvent(eventId) });
      queryClient.invalidateQueries({ queryKey: authKeys.status(eventId) });
    },
  });
}

export function useUnattachForm(eventId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/drive/unattach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId }),
      });
      if (!res.ok) throw new Error('Failed to un-attach form');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: formKeys.byEvent(eventId) });
    },
  });
}

export function usePublishForm(eventId: number) {
  return useMutation({
    mutationFn: async (formId: string) => {
      const res = await fetch('/api/drive/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, formId }),
      });
      if (!res.ok) throw new Error('Failed to publish Google Form');
      return res.json();
    },
  });
}
