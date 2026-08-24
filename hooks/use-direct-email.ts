import { useMutation } from "@tanstack/react-query";
import { sendDirectEmail } from "@/lib/api";
import type { DirectEmailRequest } from "@/lib/api-types";

export function useSendDirectEmail(getToken: () => Promise<string | null>) {
  return useMutation({
    mutationFn: async (payload: DirectEmailRequest) => {
      const result = await sendDirectEmail(payload, getToken);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });
}
