"use client";

import { EventResponsesTab } from "@/components/event-responses-tab";
import { useEventContext } from "@/contexts/event-context";

export default function EventResponsesPage() {
  const { event, refetch } = useEventContext();

  if (!event) {
    return null;
  }

  return <EventResponsesTab event={event} onEventChange={refetch} />;
}
