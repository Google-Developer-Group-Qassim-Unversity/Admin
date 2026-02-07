"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarPlus, AlertCircle, Calendar } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EventsList } from "@/components/events-list";
import { EventsListSkeleton } from "@/components/events-list-skeleton";
import { getEvents } from "@/lib/api";

export default function ManageEventsPage() {
  const [eventsResponse, setEventsResponse] = React.useState<Awaited<ReturnType<typeof getEvents>> | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchEvents() {
      setIsLoading(true);
      const response = await getEvents();
      setEventsResponse(response);
      setIsLoading(false);
    }
    fetchEvents();
  }, []);

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

      {/* Loading State */}
      {isLoading && <EventsListSkeleton />}

      {/* Error State - Fetch Failed */}
      {!isLoading && eventsResponse && !eventsResponse.success && (
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
      {!isLoading && eventsResponse?.success && eventsResponse.data.length > 0 && (
        <EventsList events={eventsResponse.data} />
      )}

      {/* Empty State - No Events */}
      {!isLoading && eventsResponse?.success && eventsResponse.data.length === 0 && (
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
