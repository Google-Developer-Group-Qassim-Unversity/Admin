"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarPlus, AlertCircle, Calendar } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { EventsList } from "@/components/events-list";
import { EventsListSkeleton } from "@/components/events-list-skeleton";
import { ApiRequestError } from "@/lib/api/errors";
import { useEvents } from "@/hooks/use-event";

export default function ManageEventsPage() {
  const t = useTranslations("events");
  const [semester, setSemester] = React.useState<string>("all");
  // react-query owns the loading and error states this page used to keep in
  // useState, and caches per semester rather than refetching on every switch.
  const { data: events, isPending, error } = useEvents(semester !== "all" ? { semester } : undefined);

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
      {isPending && <EventsListSkeleton />}

      {/* Error State - Fetch Failed */}
      {!isPending && error && (
        <div className="flex justify-center">
          <Alert variant="destructive" className="max-w-2xl">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("loadFailed")}</AlertTitle>
            <AlertDescription>
              {error.message || t("loadFailedDescription")}
              {error instanceof ApiRequestError && error.isServerError && (
                <span className="block mt-1">{t("serverUnavailable")}</span>
              )}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Success State - Has Events */}
      {!isPending && events && events.length > 0 && (
        <EventsList 
          events={events}
          semester={semester}
          onSemesterChange={setSemester}
        />
      )}

      {/* Empty State - No Events */}
      {!isPending && events && events.length === 0 && (
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