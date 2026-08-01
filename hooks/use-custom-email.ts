import { useMutation } from "@tanstack/react-query";
import { sendCustomEmail, sendCustomEmailTest } from "@/lib/api";
import type { CustomEmailRequest, CustomEmailTestRequest } from "@/lib/api-types";

export function useSendCustomEmail(getToken: () => Promise<string | null>) {
  return useMutation({
    mutationFn: async ({
      eventId,
      payload,
    }: {
      eventId: number;
      payload: CustomEmailRequest;
    }) => {
      const result = await sendCustomEmail(eventId, payload, getToken);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });
}

export function useSendCustomEmailTest(getToken: () => Promise<string | null>) {
  return useMutation({
    mutationFn: async ({
      eventId,
      payload,
    }: {
      eventId: number;
      payload: CustomEmailTestRequest;
    }) => {
      const result = await sendCustomEmailTest(eventId, payload, getToken);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });
}
