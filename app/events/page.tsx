import Link from "next/link";
import { CalendarPlus, AlertCircle, Calendar } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EventsList } from "@/components/events-list";
import { getEvents } from "@/lib/api";

export default async function ManageEventsPage() {
  const eventsResponse = await getEvents();
  
  // Sort events by start_datetime DESC if fetch was successful
  const sortedEvents = eventsResponse.success 
    ? [...eventsResponse.data].sort((a, b) => 
        new Date(b.start_datetime).getTime() - new Date(a.start_datetime).getTime()
      )
    : [];

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
          <Link href="/events/create" className="flex items-center gap-2">
            <CalendarPlus className="h-4 w-4" />
            Create Event
          </Link>
        </Button>
      </div>

      {/* Error State - Fetch Failed */}
      {!eventsResponse.success && (
        <div className="flex justify-center">
          <Alert variant="destructive" className="max-w-2xl">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to Load Events</AlertTitle>
            <AlertDescription>
              {eventsResponse.error.message || "An error occurred while fetching events. Please try refreshing the page."}
              {eventsResponse.error.isServerError && (
                <span className="block mt-1">
                  The server may be temporarily unavailable. Please try again later.
                </span>
              )}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Success State - Has Events */}
      {eventsResponse.success && sortedEvents.length > 0 && (
        <EventsList events={sortedEvents} />
      )}

      {/* Empty State - No Events */}
      {eventsResponse.success && sortedEvents.length === 0 && (
        <div className="flex justify-center">
          <Alert className="max-w-2xl">
            <Calendar className="h-4 w-4" />
            <AlertTitle>No Events Yet</AlertTitle>
            <AlertDescription>
              Get started by creating your first event.
              <div className="mt-4">
                <Button asChild size="sm">
                  <Link href="/events/create" className="flex items-center gap-2">
                    <CalendarPlus className="h-4 w-4" />
                    Create Your First Event
                  </Link>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}
