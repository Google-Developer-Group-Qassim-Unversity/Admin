import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { serverApi } from "@/lib/api/server";
import { getQueryClient } from "@/lib/query-client";
import { eventQuery } from "@/hooks/use-event";
import { EventLayoutContent } from "@/app/events/[id]/event-layout-content";

export default async function EventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const api = await serverApi();
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(eventQuery(api, id));

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <EventLayoutContent eventId={id}>{children}</EventLayoutContent>
    </HydrationBoundary>
  );
}
