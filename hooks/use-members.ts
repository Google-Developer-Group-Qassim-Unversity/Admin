import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getMembers, createMemberManual, batchCreateMembers, ApiRequestError } from '@/lib/api';
import type { ManualMemberCreateRequest, BatchCreateMemberItem } from '@/lib/api-types';

export const memberKeys = {
  all: ['members'] as const,
  list: () => [...memberKeys.all, 'list'] as const,
};

export function useMembers(getToken: () => Promise<string | null>) {
  return useQuery({
    queryKey: memberKeys.list(),
    queryFn: async () => {
      const result = await getMembers(getToken);
      if (!result.success) {
        throw new ApiRequestError(result.error);
      }
      return result.data;
    },
  });
}

export function useCreateMemberManual(getToken: () => Promise<string | null>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: ManualMemberCreateRequest) => {
      const result = await createMemberManual(data, getToken);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.list() });
    },
  });
}

export function useBatchCreateMembers(getToken: () => Promise<string | null>) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (members: BatchCreateMemberItem[]) => {
      const result = await batchCreateMembers(members, getToken);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: memberKeys.list() });
    },
  });
}