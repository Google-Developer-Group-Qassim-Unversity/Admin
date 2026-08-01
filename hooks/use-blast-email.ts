import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ApiRequestError,
  createEmailTemplate,
  deleteEmailTemplate,
  getBlastEligibleCount,
  getEmailTemplates,
  sendBlastEmail,
  sendBlastEmailTest,
  updateEmailTemplate,
} from "@/lib/api";
import type { BlastSendRequest, BlastTestRequest, EmailTemplateInput } from "@/lib/api-types";

export const emailTemplateKeys = {
  all: ["email-templates"] as const,
  list: () => [...emailTemplateKeys.all, "list"] as const,
};

export const blastEligibleCountKeys = {
  all: ["blast-eligible-count"] as const,
};

export function useSendBlastEmail(getToken: () => Promise<string | null>) {
  return useMutation({
    mutationFn: async (payload: BlastSendRequest) => {
      const result = await sendBlastEmail(payload, getToken);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });
}

export function useSendBlastEmailTest(getToken: () => Promise<string | null>) {
  return useMutation({
    mutationFn: async (payload: BlastTestRequest) => {
      const result = await sendBlastEmailTest(payload, getToken);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });
}

export function useBlastEligibleCount(getToken: () => Promise<string | null>) {
  return useQuery({
    queryKey: blastEligibleCountKeys.all,
    queryFn: async () => {
      const result = await getBlastEligibleCount(getToken);
      if (!result.success) {
        throw new ApiRequestError(result.error);
      }
      return result.data;
    },
  });
}

export function useEmailTemplates(getToken: () => Promise<string | null>) {
  return useQuery({
    queryKey: emailTemplateKeys.list(),
    queryFn: async () => {
      const result = await getEmailTemplates(getToken);
      if (!result.success) {
        throw new ApiRequestError(result.error);
      }
      return result.data;
    },
  });
}

export function useCreateEmailTemplate(getToken: () => Promise<string | null>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: EmailTemplateInput) => {
      const result = await createEmailTemplate(payload, getToken);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailTemplateKeys.list() });
    },
  });
}

export function useUpdateEmailTemplate(getToken: () => Promise<string | null>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ templateId, payload }: { templateId: number; payload: EmailTemplateInput }) => {
      const result = await updateEmailTemplate(templateId, payload, getToken);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailTemplateKeys.list() });
    },
  });
}

export function useDeleteEmailTemplate(getToken: () => Promise<string | null>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (templateId: number) => {
      const result = await deleteEmailTemplate(templateId, getToken);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailTemplateKeys.list() });
    },
  });
}
