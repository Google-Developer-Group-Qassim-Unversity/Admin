"use client";

import { useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EventInfoTab } from "@/components/event-info-tab";
import { EventManageTab } from "@/components/event-manage-tab";
import { EventResponsesTab } from "@/components/event-responses-tab";
import { EventEditTab } from "@/components/event-edit-tab";
import { EventAttendanceTab } from "@/components/event-attendance-tab";
import { useEvent } from "@/hooks/use-event";
import { saveRefreshToken } from "@/lib/google-token-storage";
import { Button } from "@/components/ui/button";

export default function EventPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const eventId = params.id as string;

  const { data: event, isLoading, error, refetch } = useEvent(eventId);

  // Save refresh token from OAuth callback
  useEffect(() => {
    const refreshToken = searchParams.get('save_refresh_token');
    if (refreshToken) {
      saveRefreshToken(refreshToken);
      // Clean up the URL
      const url = new URL(window.location.href);
      url.searchParams.delete('save_refresh_token');
      window.history.replaceState({}, '', url);
    }
  }, [searchParams]);

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
        Error: {error.message}
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
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/events" className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Events
        </Link>
      </Button>
      <Tabs defaultValue="info" className="space-y-6">
        <TabsList variant="line">
        <TabsTrigger value="info">Event Info</TabsTrigger>
        <TabsTrigger value="manage">Google Form & Publish</TabsTrigger>
        <TabsTrigger value="responses">Manage Responses</TabsTrigger>
        <TabsTrigger value="attendance">Attendance</TabsTrigger>
        <TabsTrigger value="edit">Edit Event</TabsTrigger>
      </TabsList>

      <TabsContent value="info">
        <EventInfoTab event={event} />
      </TabsContent>

      <TabsContent value="manage">
        <EventManageTab event={event} onEventChange={refetch} />
      </TabsContent>

      <TabsContent value="responses">
        <EventResponsesTab event={event} onEventChange={refetch} />
      </TabsContent>

      <TabsContent value="attendance">
        <EventAttendanceTab event={event} />
      </TabsContent>

      <TabsContent value="edit">
        <EventEditTab event={event} onEventChange={refetch} />
      </TabsContent>
      </Tabs>
    </div>
  );
}
