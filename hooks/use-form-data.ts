import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { GoogleFormData, FormType } from '@/lib/api-types';
import { getFormByEventId, updateForm, attachForm, unattachForm, getFormSchema } from '@/lib/api';

type GetTokenFn = () => Promise<string | null>;

// Query keys
export const formKeys = {
  all: ['forms'] as const,
  byEvent: (eventId: number) => [...formKeys.all, 'event', eventId] as const,
};

export const formSchemaKeys = {
  all: ['formSchemas'] as const,
  byFormId: (formId: number) => [...formSchemaKeys.all, formId] as const,
};

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
        googleWatchId: result.data.google_watch_id,
        googleRespondersUrl: result.data.google_responders_url,
        adminGoogleEmail: result.data.admin_google_email,
        grantedEmails: result.data.granted_emails,
      };
    },
  });
}

export function useFormSchema(formId: number | null | undefined, getToken?: GetTokenFn) {
  return useQuery({
    queryKey: formSchemaKeys.byFormId(formId ?? 0),
    queryFn: async () => {
      if (!formId) {
        throw new Error('Form ID is required');
      }

      const result = await getFormSchema(formId, getToken);
      if (!result.success) {
        throw new Error(result.error.message);
      }

      return result.data;
    },
    enabled: !!formId,
  });
}

/**
 * Copies the template form under the club's own Google account and invites
 * `adminGoogleEmail` as an editor. Idempotent: calling it again for the same
 * event with a different email re-invites without re-copying the form - this
 * is what "request access for a different email" uses.
 */
export function useAttachForm(eventId: number, getToken?: GetTokenFn) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (adminGoogleEmail: string) => {
      const result = await attachForm(eventId, adminGoogleEmail, getToken);
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

export function useUnattachForm(eventId: number, getToken?: GetTokenFn) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const result = await unattachForm(eventId, getToken);
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
        google_watch_id: formData.googleWatchId ?? null,
        google_responders_url: formData.googleRespondersUrl ?? null,
        admin_google_email: formData.adminGoogleEmail ?? null,
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
