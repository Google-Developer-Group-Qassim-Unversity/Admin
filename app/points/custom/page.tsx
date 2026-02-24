"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy, AlertCircle, Calendar } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CustomEventsList } from "@/components/custom-events-list";
import { getEvents } from "@/lib/api";
import type { Event } from "@/lib/api-types";

export default function CustomEventsPage() {
  const [customEvents, setCustomEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ message: string; isServerError?: boolean } | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      setIsLoading(true);
      setError(null);
      const response = await getEvents();
      if (response.success) {
        const custom = response.data.filter(
          (e) => e.location_type === "none" || e.location_type === "hidden"
        );
        setCustomEvents(custom);
      } else {
        setError(response.error);
      }
      setIsLoading(false);
    }
    fetchEvents();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-pulse text-muted-foreground">Loading events...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center">
        <Alert variant="destructive" className="max-w-2xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Failed to Load Events</AlertTitle>
          <AlertDescription>
            {error.message ||
              "An error occurred while fetching events. Please try refreshing the page."}
            {error.isServerError && (
              <span className="block mt-1">
                The server may be temporarily unavailable. Please try again
                later.
              </span>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (customEvents.length === 0) {
    return (
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
    );
  }

  return <CustomEventsList events={customEvents} />;
}
