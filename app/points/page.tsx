import Link from "next/link";
import { Trophy, AlertCircle, Calendar } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CustomEventsList } from "@/components/custom-events-list";
import { getCustomEvents } from "@/lib/api";

export default async function ManagePointsPage() {
  const eventsResponse = await getCustomEvents();

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

      {/* Error State */}
      {eventsResponse && !eventsResponse.success && (
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
      {eventsResponse?.success && eventsResponse.data.length > 0 && (
          <CustomEventsList events={eventsResponse.data} />
        )}

      {/* Empty State */}
      {eventsResponse?.success && eventsResponse.data.length === 0 && (
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
