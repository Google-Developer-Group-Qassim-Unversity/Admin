import { useMutation } from '@tanstack/react-query';
import { resetLeaderboardCache } from '@/lib/api';

export function useResetLeaderboardCache(getToken: () => Promise<string | null>) {
  return useMutation({
    mutationFn: async () => {
      const result = await resetLeaderboardCache(getToken);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
  });
}
