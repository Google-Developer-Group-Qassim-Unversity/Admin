import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { GoogleFormData, FormType } from '@/lib/api-types';
import { getFormByEventId, updateForm } from '@/lib/api';

// Query keys
export const formKeys = {
  all: ['forms'] as const,
  byEvent: (eventId: number) => [...formKeys.all, 'event', eventId] as const,
};

export const authKeys = {
  status: (eventId: number) => ['auth', 'status', eventId] as const,
};

export const formSchemaKeys = {
  all: ['formSchemas'] as const,
  byFormId: (formId: string) => [...formSchemaKeys.all, formId] as const,
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
        formType: result.data.form_type,
        googleFormId: result.data.google_form_id,
        googleRefreshToken: result.data.google_refresh_token,
        googleRespondersUrl: result.data.google_responders_url,
      };
    },
  });
}

export function useFormSchema(formId: string | null | undefined) {
  return useQuery({
    queryKey: formSchemaKeys.byFormId(formId || ''),
    queryFn: async () => {
      if (!formId) {
        throw new Error('Form ID is required');
      }
      
      const res = await fetch(`/api/drive/form-schema/${formId}`);
      if (!res.ok) {
        throw new Error('Failed to fetch form schema');
      }
      
      const data = await res.json();
      return data.schema;
    },
    enabled: !!formId,
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

/**
 * Hook to update form type (registration requirement toggle)
 * - Toggle OFF: sets form_type to "none" but preserves Google form data
 * - Toggle ON: sets form_type to "google" if Google form exists, otherwise "registration"
 */
export function useUpdateFormType(eventId: number, getToken: () => Promise<string | null>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      formData, 
      requireRegistration 
    }: { 
      formData: GoogleFormData; 
      requireRegistration: boolean;
    }) => {
      if (!formData.id) {
        throw new Error('Form ID is required');
      }

      // Determine the target form_type based on toggle state and existing Google data
      let targetFormType: FormType;
      if (!requireRegistration) {
        // Toggling OFF: set to "none" but preserve all Google data
        targetFormType = 'none';
      } else {
        // Toggling ON: check if Google form data exists
        if (formData.googleFormId) {
          // Google form data exists, set to "google"
          targetFormType = 'google';
        } else {
          // No Google form data, set to "registration"
          targetFormType = 'registration';
        }
      }

      const result = await updateForm(formData.id, {
        event_id: eventId,
        form_type: targetFormType,
        // Preserve all Google form data regardless of toggle state
        google_form_id: formData.googleFormId,
        google_refresh_token: formData.googleRefreshToken ?? null,
        google_responders_url: formData.googleRespondersUrl ?? null,
        google_watch_id: null, // Keep watch_id handling separate
      }, getToken);

      if (!result.success) {
        throw new Error(result.error.message);
      }

      return result.data;
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
