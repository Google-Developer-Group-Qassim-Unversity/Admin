"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertCircle, Calendar, CalendarPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FullEventsPointsList } from "@/components/full-events-points-list";
import { getEvents } from "@/lib/api";
import type { Event } from "@/lib/api-types";
import { useTranslations } from "next-intl";

export default function FullEventsPage() {
  const t = useTranslations("fullEvents");
  const tp = useTranslations("pointsList");
  const te = useTranslations("events");
  const [fullEvents, setFullEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ message: string; isServerError?: boolean } | null>(null);
  const [semester, setSemester] = useState<string>("all");

  useEffect(() => {
    async function fetchEvents() {
      setIsLoading(true);
      setError(null);
      const filters = semester !== "all" ? { semester } : undefined;
      const response = await getEvents(filters);
      if (response.success) {
        const full = response.data.filter(
          (e) => e.location_type !== "none" && e.location_type !== "hidden"
        );
        setFullEvents(full);
      } else {
        setError(response.error);
      }
      setIsLoading(false);
    }
    fetchEvents();
  }, [semester]);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground mt-2">
              {t("subtitle")}
            </p>
          </div>
        </div>
        <div className="flex justify-center py-12">
          <div className="animate-pulse text-muted-foreground">{tp("loadingEvents")}</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground mt-2">
              {t("subtitle")}
            </p>
          </div>
        </div>
        <div className="flex justify-center">
          <Alert variant="destructive" className="max-w-2xl">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{te("loadFailed")}</AlertTitle>
            <AlertDescription>
              {error.message || te("loadFailedDescription")}
              {error.isServerError && (
                <span className="block mt-1">{te("serverUnavailable")}</span>
              )}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  if (fullEvents.length === 0) {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
            <p className="text-muted-foreground mt-2">
              {t("subtitle")}
            </p>
          </div>
        </div>
        <div className="flex justify-center">
          <Alert className="max-w-2xl">
            <Calendar className="h-4 w-4" />
            <AlertTitle>{t("noneFound")}</AlertTitle>
            <AlertDescription>
              {t("noneMatchSemester")}
              <div className="mt-4">
                <Button asChild size="sm">
                  <Link
                    href="/events/create"
                    className="flex items-center gap-2"
                  >
                    <CalendarPlus className="h-4 w-4" />
                    {te("create")}
                  </Link>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-muted-foreground mt-2">
            Manage points for full events
          </p>
        </div>
      </div>

      <FullEventsPointsList
        events={fullEvents}
        semester={semester}
        onSemesterChange={setSemester}
      />
    </div>
  );
}