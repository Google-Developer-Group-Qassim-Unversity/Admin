"use client";

import { EventManageTab } from "@/components/event-manage-tab";
import { useEventContext } from "@/contexts/event-context";

export default function EventManagePage() {
  const { event, refetch } = useEventContext();

  if (!event) {
    return null;
  }

  return <EventManageTab event={event} onEventChange={refetch} />;
}
