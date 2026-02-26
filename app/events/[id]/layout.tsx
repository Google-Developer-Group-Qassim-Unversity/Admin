"use client";

import { useEffect } from "react";
import { useParams, useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Info, Link2, Users, ClipboardCheck, Pencil, CalendarX } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { EventProvider } from "@/contexts/event-context";
import { useEvent } from "@/hooks/use-event";
import { saveRefreshToken } from "@/lib/google-token-storage";
import { ApiRequestError } from "@/lib/api";

const TAB_ITEMS = [
  { value: "info", label: "Event Info", icon: Info, path: "" },
  { value: "manage", label: "Google Form & Publish", icon: Link2, path: "/manage" },
  { value: "responses", label: "Manage Responses", icon: Users, path: "/responses" },
  { value: "attendance", label: "Attendance", icon: ClipboardCheck, path: "/attendance" },
  { value: "edit", label: "Edit Event", icon: Pencil, path: "/edit" },
];

function TabSkeleton({ w }: { w: string }) {
  return (
    <div className="flex items-center gap-2 pb-3">
      <Skeleton className="h-4 w-4" />
      <Skeleton className={`h-4 ${w}`} />
    </div>
  );
}

function EventLayoutContent({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const eventId = params.id as string;

  const { data: event, isLoading, error, refetch } = useEvent(eventId);

  useEffect(() => {
    const refreshToken = searchParams.get('save_refresh_token');
    if (refreshToken) {
      saveRefreshToken(refreshToken);
      const url = new URL(window.location.href);
      url.searchParams.delete('save_refresh_token');
      window.history.replaceState({}, '', url);
    }
  }, [searchParams]);

  const backHref = searchParams.get('from') === 'points' ? '/points' : '/events';
  const backLabel = searchParams.get('from') === 'points' ? 'Back to Points' : 'Back to Events';

  const isActiveTab = (tabPath: string) => {
    if (tabPath === "") {
      return pathname === `/events/${eventId}` || pathname === `/events/${eventId}/`;
    }
    return pathname === `/events/${eventId}${tabPath}`;
  };

  if (isLoading) {
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
    if (error instanceof ApiRequestError && error.isNotFound) {
      return (
        <div className="flex items-center justify-center min-h-[70vh]">
          <Card className="max-w-md">
            <CardContent className="pt-6">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <CalendarX />
                  </EmptyMedia>
                  <EmptyTitle>Event not found</EmptyTitle>
                  <EmptyDescription>
                    The event you're looking for doesn't exist or has been deleted.
                  </EmptyDescription>
                </EmptyHeader>
                <Button asChild>
                  <Link href="/events">Go back to Events</Link>
                </Button>
              </Empty>
            </CardContent>
          </Card>
        </div>
      );
    }
    return (
      <div className="text-center py-12 text-destructive">
        Error: {error.message}
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CalendarX />
                </EmptyMedia>
                <EmptyTitle>Event not found</EmptyTitle>
                <EmptyDescription>
                  The event you're looking for doesn't exist or has been deleted.
                </EmptyDescription>
              </EmptyHeader>
              <Button asChild>
                <Link href="/events">Go back to Events</Link>
              </Button>
            </Empty>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <EventProvider event={event} isLoading={isLoading} error={error} refetch={refetch}>
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={backHref} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        </Button>
        
        <nav className="border-b">
          <ScrollArea className="w-full">
            <div className="flex gap-1">
              {TAB_ITEMS.map((tab) => {
                const isActive = isActiveTab(tab.path);
                const href = `/events/${eventId}${tab.path}`;
                return (
                  <Link
                    key={tab.value}
                    href={href}
                    className={`flex items-center gap-2 px-3 py-3 text-sm font-medium transition-colors relative ${
                      isActive
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                    )}
                  </Link>
                );
              })}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </nav>

        <div className="space-y-6">
          {children}
        </div>
      </div>
    </EventProvider>
  );
}

export default function EventLayout({ children }: { children: React.ReactNode }) {
  return <EventLayoutContent>{children}</EventLayoutContent>;
}
