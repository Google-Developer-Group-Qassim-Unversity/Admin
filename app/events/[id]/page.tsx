"use client";

import { useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Info, Link2, Users, ClipboardCheck, Pencil } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { EventInfoTab } from "@/components/event-info-tab";
import { EventManageTab } from "@/components/event-manage-tab";
import { EventResponsesTab } from "@/components/event-responses-tab";
import { EventEditTab } from "@/components/event-edit-tab";
import { EventAttendanceTab } from "@/components/event-attendance-tab";
import { useEvent } from "@/hooks/use-event";
import { saveRefreshToken } from "@/lib/google-token-storage";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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
    const TabSkeleton = ({ w }: { w: string }) => (
      <div className="flex items-center gap-2 pb-3">
        <Skeleton className="h-4 w-4" />
        <Skeleton className={`h-4 ${w}`} />
      </div>
    );

    return (
      <div className="space-y-6">
        <Skeleton className="h-9 w-32" />
        <div className="space-y-6">
          <div className="border-b">
            <div className="flex gap-6">
              <div className="flex items-center gap-2 pb-3 border-b-2 border-primary">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-20" />
              </div>
              {["w-36", "w-32", "w-24", "w-20"].map((w, i) => (
                <TabSkeleton key={i} w={w} />
              ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Skeleton className="w-full h-150 rounded-lg" />
            
            <div className="space-y-6">
              <Skeleton className="h-12 w-3/4" />
              <div className="flex gap-2">
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-7 w-32" />
              </div>
              
              <div className="space-y-4">
                {["w-56", "w-48", "w-40"].map((w, i) => (
                  <Skeleton key={i} className={`h-6 ${w}`} />
                ))}
              </div>
              
              <div className="space-y-4 rounded-lg border bg-card p-6 mt-8">
                <Skeleton className="h-7 w-32" />
                <div className="space-y-3">
                  {["w-full", "w-full", "w-5/6", "w-full", "w-3/4"].map((w, i) => (
                    <Skeleton key={i} className={`h-4 ${w}`} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
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

  const backHref = searchParams.get('from') === 'points' ? '/points' : '/events';
  const backLabel = searchParams.get('from') === 'points' ? 'Back to Points' : 'Back to Events';

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href={backHref} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>
      </Button>
      <Tabs defaultValue="info" className="space-y-6">
        <ScrollArea className="w-full">
          <TabsList variant="line">
            <TabsTrigger value="info" className="flex items-center gap-2">
              <Info className="h-4 w-4" />
              Event Info
            </TabsTrigger>
            <TabsTrigger value="manage" className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Google Form & Publish
            </TabsTrigger>
            <TabsTrigger value="responses" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Manage Responses
            </TabsTrigger>
            <TabsTrigger value="attendance" className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Attendance
            </TabsTrigger>
            <TabsTrigger value="edit" className="flex items-center gap-2">
              <Pencil className="h-4 w-4" />
              Edit Event
            </TabsTrigger>
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

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
        <EventAttendanceTab event={event} onEventChange={refetch} />
      </TabsContent>

      <TabsContent value="edit">
        <EventEditTab event={event} onEventChange={refetch} />
      </TabsContent>
      </Tabs>
    </div>
  );
}
