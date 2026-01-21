import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSubmissions, acceptSubmissions } from "@/lib/api";
import type { Submission, AcceptSubmissionPayload } from "@/lib/api-types";

// Query keys
export const submissionKeys = {
  all: ["submissions"] as const,
  byEvent: (eventId: number) => [...submissionKeys.all, "event", eventId] as const,
};

// Hooks
export function useSubmissions(
  eventId: number,
  getToken?: () => Promise<string | null>
) {
  return useQuery({
    queryKey: submissionKeys.byEvent(eventId),
    queryFn: async (): Promise<Submission[]> => {
      const result = await getSubmissions(eventId, getToken);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    enabled: Number.isFinite(eventId) && !!getToken,
  });
}

export function useAcceptSubmissions(
  getToken: () => Promise<string | null>
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AcceptSubmissionPayload[]) => {
      const result = await acceptSubmissions(payload, getToken);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: () => {
      // Invalidate all submission queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: submissionKeys.all });
    },
  });
}
