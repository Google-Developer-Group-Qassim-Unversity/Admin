"use client";

import * as React from "react";
import Link from "next/link";
import { Trophy, AlertCircle, Calendar } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CustomEventsList } from "@/components/custom-events-list";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { getCustomEvents } from "@/lib/api";

function CustomEventsListSkeleton() {
  return (
    <div className="space-y-4">
      {/* Search Skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-64" />
      </div>

      {/* Grid Skeleton */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <Card key={index} className="overflow-hidden flex flex-col h-full">
            <Skeleton className="w-full aspect-video" />
            <CardHeader className="flex-1 pb-3">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-3/4" />
                </div>
                <Skeleton className="h-5 w-14" />
              </div>
            </CardHeader>
            <CardContent className="pb-3 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-32" />
              </div>
            </CardContent>
            <CardFooter className="pt-3">
              <Skeleton className="h-9 flex-1" />
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function ManagePointsPage() {
  const [eventsResponse, setEventsResponse] = React.useState<Awaited<
    ReturnType<typeof getCustomEvents>
  > | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchEvents() {
      setIsLoading(true);
      const response = await getCustomEvents();
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
          <h1 className="text-3xl font-bold tracking-tight">
            Manage Custom Points
          </h1>
          <p className="text-muted-foreground mt-2">
            View and manage custom point events for departments
          </p>
        </div>
        <Button asChild>
          <Link href="/points/create" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Create Custom Event
          </Link>
        </Button>
      </div>

      {/* Loading State */}
      {isLoading && <CustomEventsListSkeleton />}

      {/* Error State */}
      {!isLoading && eventsResponse && !eventsResponse.success && (
        <div className="flex justify-center">
          <Alert variant="destructive" className="max-w-2xl">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Failed to Load Custom Events</AlertTitle>
            <AlertDescription>
              {eventsResponse.error.message ||
                "An error occurred while fetching custom events. Please try refreshing the page."}
              {eventsResponse.error.isServerError && (
                <span className="block mt-1">
                  The server may be temporarily unavailable. Please try again
                  later.
                </span>
              )}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Success State - Has Events */}
      {!isLoading &&
        eventsResponse?.success &&
        eventsResponse.data.length > 0 && (
          <CustomEventsList events={eventsResponse.data} />
        )}

      {/* Empty State */}
      {!isLoading &&
        eventsResponse?.success &&
        eventsResponse.data.length === 0 && (
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
    </div>
  );
}
