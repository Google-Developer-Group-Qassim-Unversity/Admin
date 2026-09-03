"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarPlus, AlertCircle, Calendar } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EventsList } from "@/components/events-list";
import { EventsListSkeleton } from "@/components/events-list-skeleton";
import { getEvents } from "@/lib/api";

export default function ManageEventsPage() {
  const t = useTranslations("events");
  const [eventsResponse, setEventsResponse] = React.useState<Awaited<ReturnType<typeof getEvents>> | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [semester, setSemester] = React.useState<string>("all");

  React.useEffect(() => {
    async function fetchEvents() {
      setIsLoading(true);
      const filters = semester !== "all" ? { semester } : undefined;
      const response = await getEvents(filters);
      setEventsResponse(response);
      setIsLoading(false);
    }
    fetchEvents();
  }, [semester]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        </div>
        <Button asChild>
          <Link href="/events/create" className="flex items-center gap-2">
            <CalendarPlus className="h-4 w-4" />
            {t("create")}
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
            <AlertTitle>{t("loadFailed")}</AlertTitle>
            <AlertDescription>
              {eventsResponse.error.message || t("loadFailedDescription")}
              {eventsResponse.error.isServerError && (
                <span className="block mt-1">{t("serverUnavailable")}</span>
              )}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Success State - Has Events */}
      {!isLoading && eventsResponse?.success && eventsResponse.data.length > 0 && (
        <EventsList 
          events={eventsResponse.data}
          semester={semester}
          onSemesterChange={setSemester}
        />
      )}

      {/* Empty State - No Events */}
      {!isLoading && eventsResponse?.success && eventsResponse.data.length === 0 && (
        <div className="flex justify-center">
          <Alert className="max-w-2xl">
            <Calendar className="h-4 w-4" />
            <AlertTitle>{t("noneFound")}</AlertTitle>
            <AlertDescription>
              {t("noneMatchSemester")}
              <div className="mt-4">
                <Button asChild size="sm">
                  <Link href="/events/create" className="flex items-center gap-2">
                    <CalendarPlus className="h-4 w-4" />
                    {t("createNew")}
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