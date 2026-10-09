"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CustomEventsList } from "@/components/custom-events-list";
import { PointsEmpty, PointsListSkeleton, PointsLoadError } from "@/components/points-list-states";
import { getEvents } from "@/lib/api";
import type { Event } from "@/lib/api-types";
import { useTranslations } from "next-intl";

/** Custom (points-only) events. The page header and tabs come from the points layout. */
export default function PointsPage() {
  const t = useTranslations("pointsList");
  const [customEvents, setCustomEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<{ message: string; isServerError?: boolean } | null>(null);

  useEffect(() => {
    async function fetchEvents() {
      setIsLoading(true);
      setError(null);
      const response = await getEvents();
      if (response.success) {
        setCustomEvents(response.data.filter((e) => e.location_type === "none" || e.location_type === "hidden"));
      } else {
        setError(response.error);
      }
      setIsLoading(false);
    }
    fetchEvents();
  }, []);

  if (isLoading) return <PointsListSkeleton />;
  if (error) return <PointsLoadError message={error.message} isServerError={error.isServerError} />;
  if (customEvents.length === 0) {
    return (
      <PointsEmpty icon={Trophy} title={t("noneYetTitle")} description={t("noneYetDescription")}>
        <Button asChild>
          <Link href="/points/create">
            <Plus />
            {t("createFirst")}
          </Link>
        </Button>
      </PointsEmpty>
    );
  }
  return <CustomEventsList events={customEvents} />;
}
