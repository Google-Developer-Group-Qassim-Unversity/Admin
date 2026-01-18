"use client";

import * as React from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EventInfoTab } from "@/components/event-info-tab";
import { EventManageTab } from "@/components/event-manage-tab";
import { EventResponsesTab } from "@/components/event-responses-tab";
import { EventEditTab } from "@/components/event-edit-tab";
import { getEvent } from "@/lib/api";
import { saveRefreshToken } from "@/lib/google-token-storage";
import type { Event } from "@/lib/api-types";

export default function EventPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const eventId = params.id as string;

  const [event, setEvent] = React.useState<Event | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Save refresh token from OAuth callback
  React.useEffect(() => {
    const refreshToken = searchParams.get('save_refresh_token');
    if (refreshToken) {
      saveRefreshToken(refreshToken);
      // Clean up the URL
      const url = new URL(window.location.href);
      url.searchParams.delete('save_refresh_token');
      window.history.replaceState({}, '', url);
    }
  }, [searchParams]);

  const fetchEvent = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const response = await getEvent(eventId);
    if (response.success) {
      setEvent(response.data);
    } else {
      setError(response.error.message);
    }
    setIsLoading(false);
  }, [eventId]);

  React.useEffect(() => {
    fetchEvent();
  }, [fetchEvent]);

  if (isLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Loading event...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 text-destructive">
        Error: {error}
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Event not found
      </div>
    );
  }

  return (
    <Tabs defaultValue="info" className="space-y-6">
      <TabsList variant="line">
        <TabsTrigger value="info">Event Info</TabsTrigger>
        <TabsTrigger value="manage">Google Form & Publish</TabsTrigger>
        <TabsTrigger value="responses">Manage Responses</TabsTrigger>
        <TabsTrigger value="edit">Edit Event</TabsTrigger>
      </TabsList>

      <TabsContent value="info">
        <EventInfoTab event={event} />
      </TabsContent>

      <TabsContent value="manage">
        <EventManageTab event={event} onEventChange={fetchEvent} />
      </TabsContent>

      <TabsContent value="responses">
        <EventResponsesTab event={event} />
      </TabsContent>

      <TabsContent value="edit">
        <EventEditTab event={event} />
      </TabsContent>
    </Tabs>
  );
}
