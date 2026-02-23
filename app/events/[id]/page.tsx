"use client";

import { EventInfoTab } from "@/components/event-info-tab";
import { useEventContext } from "@/contexts/event-context";

export default function EventInfoPage() {
  const { event } = useEventContext();

  if (!event) {
    return null;
  }

  return <EventInfoTab event={event} />;
}
