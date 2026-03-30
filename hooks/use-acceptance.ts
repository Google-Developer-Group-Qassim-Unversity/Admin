import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sendAcceptanceBlasts } from "@/lib/api";
import { submissionKeys } from "./use-submissions";

export function useSendAcceptance(getToken: () => Promise<string | null>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      subject,
      htmlContent,
    }: {
      eventId: number;
      subject: string;
      htmlContent: string;
    }) => {
      const result = await sendAcceptanceBlasts(eventId, subject, htmlContent, getToken);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: submissionKeys.all });
    },
  });
}