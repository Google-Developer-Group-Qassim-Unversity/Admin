import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { serverApi } from "@/lib/api/server";
import { getQueryClient } from "@/lib/query-client";
import { membersPaginatedQuery, memberStatsQuery } from "@/hooks/use-members";
import { ManageMembersContent } from "@/app/manage-members/manage-members-content";

const DEFAULT_PARAMS = { page: 1, pageSize: 50 };

export default async function ManageMembersPage() {
  const api = await serverApi();
  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.prefetchQuery(membersPaginatedQuery(api, DEFAULT_PARAMS)),
    queryClient.prefetchQuery(memberStatsQuery(api)),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ManageMembersContent />
    </HydrationBoundary>
  );
}
