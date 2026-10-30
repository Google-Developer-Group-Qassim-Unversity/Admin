import { useQuery } from "@tanstack/react-query";
import { getEmailJob } from "@/lib/api";
import type { EmailJobStatus } from "@/lib/api-types";

const TERMINAL_STATUSES: EmailJobStatus[] = ["succeeded", "partial", "failed"];
const JOB_POLL_INTERVAL_MS = 2000;

export const emailJobKeys = {
  all: ["email-jobs"] as const,
  detail: (jobId: number) => [...emailJobKeys.all, "detail", jobId] as const,
};

/** Polls a single job until it reaches a terminal status. Pass a falsy jobId to skip. */
export function useEmailJob(jobId: number | null | undefined, getToken: () => Promise<string | null>) {
  return useQuery({
    queryKey: emailJobKeys.detail(jobId ?? -1),
    queryFn: async () => {
      const result = await getEmailJob(jobId as number, getToken);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    enabled: jobId != null,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && TERMINAL_STATUSES.includes(status) ? false : JOB_POLL_INTERVAL_MS;
    },
  });
}
