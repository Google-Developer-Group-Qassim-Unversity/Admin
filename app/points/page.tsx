"use client";

import * as React from "react";
import Link from "next/link";
import { Trophy, AlertCircle, Calendar, CalendarPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { CustomEventsList } from "@/components/custom-events-list";
import { FullEventsPointsList } from "@/components/full-events-points-list";
import { getEvents } from "@/lib/api";

export default function ManagePointsPage() {
  const [customEventsResponse, setCustomEventsResponse] = React.useState<Awaited<ReturnType<typeof getEvents>> | null>(null);
  const [fullEventsResponse, setFullEventsResponse] = React.useState<Awaited<ReturnType<typeof getEvents>> | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchEvents() {
      setIsLoading(true);
      const response = await getEvents();
      if (response.success) {
        const customEvents = response.data.filter(
          (e) => e.location_type === "none" || e.location_type === "hidden"
        );
        const fullEvents = response.data.filter(
          (e) => e.location_type !== "none" && e.location_type !== "hidden"
        );
        setCustomEventsResponse({ success: true, data: customEvents });
        setFullEventsResponse({ success: true, data: fullEvents });
      } else {
        setCustomEventsResponse(response);
        setFullEventsResponse(response);
      }
      setIsLoading(false);
    }
    fetchEvents();
  }, []);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Points</h1>
          <p className="text-muted-foreground mt-2">
            View and manage point events for departments and members
          </p>
        </div>
        <Button asChild>
          <Link href="/points/create" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Create Custom Event
          </Link>
        </Button>
      </div>

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-pulse text-muted-foreground">Loading events...</div>
        </div>
      )}

      {!isLoading && customEventsResponse && !customEventsResponse.success && (
        <div className="flex justify-center">
          <Alert variant="destructive" className="max-w-2xl">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to Load Events</AlertTitle>
            <AlertDescription>
              {customEventsResponse.error.message ||
                "An error occurred while fetching events. Please try refreshing the page."}
              {customEventsResponse.error.isServerError && (
                <span className="block mt-1">
                  The server may be temporarily unavailable. Please try again
                  later.
                </span>
              )}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {!isLoading && customEventsResponse?.success && (
        <Tabs defaultValue="custom" className="space-y-6">
          <TabsList variant="line">
            <TabsTrigger value="custom" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Custom Events
            </TabsTrigger>
            <TabsTrigger value="full" className="flex items-center gap-2">
              <CalendarPlus className="h-4 w-4" />
              Full Events
            </TabsTrigger>
          </TabsList>

          <TabsContent value="custom">
            {customEventsResponse.data.length > 0 ? (
              <CustomEventsList events={customEventsResponse.data} />
            ) : (
              <div className="flex justify-center">
                <Alert className="max-w-2xl">
                  <Calendar className="h-4 w-4" />
                  <AlertTitle>No Custom Events Yet</AlertTitle>
                  <AlertDescription>
                    Get started by creating your first custom point event.
                    <div className="mt-4">
                      <Button asChild size="sm">
                        <Link
                          href="/points/create"
                          className="flex items-center gap-2"
                        >
                          <Trophy className="h-4 w-4" />
                          Create Your First Custom Event
                        </Link>
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </TabsContent>

          <TabsContent value="full">
            {fullEventsResponse?.success && fullEventsResponse.data.length > 0 ? (
              <FullEventsPointsList events={fullEventsResponse.data} />
            ) : (
              <div className="flex justify-center">
                <Alert className="max-w-2xl">
                  <Calendar className="h-4 w-4" />
                  <AlertTitle>No Full Events Yet</AlertTitle>
                  <AlertDescription>
                    Full events are created from the Events page. Create an event
                    there to manage its points here.
                    <div className="mt-4">
                      <Button asChild size="sm">
                        <Link
                          href="/events/create"
                          className="flex items-center gap-2"
                        >
                          <CalendarPlus className="h-4 w-4" />
                          Create Event
                        </Link>
                      </Button>
                    </div>
                  </AlertDescription>
                </Alert>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
