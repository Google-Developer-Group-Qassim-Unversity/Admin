import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { serverApi } from "@/lib/api/server";
import { getQueryClient } from "@/lib/query-client";
import { clubOverviewQuery } from "@/hooks/use-club-structure";
import { ClubStructureContent } from "@/app/club-structure/club-structure-content";

export default async function ClubStructurePage() {
  const api = await serverApi();
  const queryClient = getQueryClient();
  await Promise.all([
    queryClient.prefetchQuery(clubOverviewQuery(api, false)),
    queryClient.prefetchQuery(clubOverviewQuery(api, true)),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ClubStructureContent />
    </HydrationBoundary>
  );
}
