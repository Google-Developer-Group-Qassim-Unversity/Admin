import Link from "next/link";
import { CalendarPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EventCard } from "@/components/event-card";
import { getEvents } from "@/lib/api";

export default async function ManageEventsPage() {
  const eventsResponse = await getEvents();
  const events = eventsResponse.success ? eventsResponse.data : [];
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Events</h1>
          <p className="text-muted-foreground mt-2">
            View and manage all your events
          </p>
        </div>
        <Button asChild>
          <Link href="/create-event" className="flex items-center gap-2">
            <CalendarPlus className="h-4 w-4" />
            Create Event
          </Link>
        </Button>
      </div>

      {/* Events List */}
      {events.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border bg-card p-6">
          <p className="text-muted-foreground text-center py-8">
            No events created yet. Click Create Event to get started.
          </p>
        </div>
      )}
    </div>
  );
}
