import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { serverApi } from "@/lib/api/server";
import { getQueryClient } from "@/lib/query-client";
import { eventsPaginatedQuery } from "@/hooks/use-event";
import { EventsContent } from "@/app/events/events-content";

const DEFAULT_PARAMS = { page: 1, pageSize: 12, excludeCustom: true };

export default async function EventsPage() {
  const api = await serverApi();
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(eventsPaginatedQuery(api, DEFAULT_PARAMS));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <EventsContent />
    </HydrationBoundary>
  );
}
