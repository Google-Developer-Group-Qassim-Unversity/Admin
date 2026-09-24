import { useQuery, useMutation, useQueryClient, keepPreviousData, queryOptions } from '@tanstack/react-query';
import { useApi } from '@/lib/api/client';
import { getMembers, createMemberManual, batchCreateMembers, ApiRequestError } from '@/lib/api';
import type { ManualMemberCreateRequest, BatchCreateMemberItem, MembersPageParams } from '@/lib/api-types';
import type { Api } from '@/lib/api/resources';

export const memberKeys = {
  all: ['members'] as const,
  list: () => [...memberKeys.all, 'list'] as const,
  paginated: (params: MembersPageParams) => [...memberKeys.all, 'paginated', params] as const,
  stats: () => [...memberKeys.all, 'stats'] as const,
};

// Query option factories - the same definition prefetched server-side
// (`serverApi()`) and read client-side (`useApi()`), so the two can never
// drift onto different query keys and silently miss hydration.
export const membersPaginatedQuery = (api: Api, params: MembersPageParams) =>
  queryOptions({
    queryKey: memberKeys.paginated(params),
    queryFn: () => api.members.listPaginated(params),
  });

export const memberStatsQuery = (api: Api) =>
  queryOptions({
    queryKey: memberKeys.stats(),
    queryFn: () => api.members.stats(),
  });

/**
 * One server-rendered page of members. `keepPreviousData` holds the current
 * rows on screen while the next page loads, so paging and typing never flash an
 * empty table. Search, sort and paging all happen in the database.
 */
export function useMembersPaginated(params: MembersPageParams, enabled = true) {
  const api = useApi();
  return useQuery({
    ...membersPaginatedQuery(api, params),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** Whole-table member counts for the page cards - one cheap grouped query. */
export function useMemberStats() {
  const api = useApi();
  return useQuery(memberStatsQuery(api));
}

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
