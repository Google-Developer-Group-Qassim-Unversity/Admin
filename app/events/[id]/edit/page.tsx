"use client";

import { EventEditTab } from "@/components/event-edit-tab";
import { useEventContext } from "@/contexts/event-context";

export default function EventEditPage() {
  const { event, refetch } = useEventContext();

  if (!event) {
    return null;
  }

  return <EventEditTab event={event} onEventChange={refetch} />;
}
