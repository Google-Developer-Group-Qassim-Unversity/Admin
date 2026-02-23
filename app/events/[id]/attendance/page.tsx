"use client";

import { EventAttendanceTab } from "@/components/event-attendance-tab";
import { useEventContext } from "@/contexts/event-context";

export default function EventAttendancePage() {
  const { event, refetch } = useEventContext();

  if (!event) {
    return null;
  }

  return <EventAttendanceTab event={event} onEventChange={refetch} />;
}
