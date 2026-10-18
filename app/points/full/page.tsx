"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, CalendarPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FullEventsPointsList } from "@/components/full-events-points-list";
import { PointsEmpty, PointsListSkeleton, PointsLoadError } from "@/components/points-list-states";
import { getEvents } from "@/lib/api";
import type { Event } from "@/lib/api-types";
import { useTranslations } from "next-intl";

export default function FullEventsPage() {
  const t = useTranslations("fullEvents");
  const te = useTranslations("events");
  const [fullEvents, setFullEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ message: string; isServerError?: boolean } | null>(null);
  const [semester, setSemester] = useState<string>("all");

  useEffect(() => {
    async function fetchEvents() {
      setIsLoading(true);
      setError(null);
      const response = await getEvents(semester !== "all" ? { semester } : undefined);
      if (response.success) {
        setFullEvents(response.data.filter((e) => e.location_type !== "none" && e.location_type !== "hidden"));
      } else {
        setError(response.error);
      }
      setIsLoading(false);
    }
    fetchEvents();
  }, [semester]);

  // Only the results area changes with the state; the filter bar above it
  // stays mounted, so an empty semester never strands you without the picker.
  let status: React.ReactNode = null;
  if (isLoading) {
    status = <PointsListSkeleton />;
  } else if (error) {
    status = <PointsLoadError message={error.message} isServerError={error.isServerError} />;
  } else if (fullEvents.length === 0) {
    status = (
      <PointsEmpty icon={CalendarDays} title={t("noneFound")} description={t("noneMatchSemester")}>
        <Button asChild>
          <Link href="/events/create">
            <CalendarPlus />
            {te("create")}
          </Link>
        </Button>
      </PointsEmpty>
    );
  }

  return <FullEventsPointsList events={fullEvents} semester={semester} onSemesterChange={setSemester} status={status} />;
}
