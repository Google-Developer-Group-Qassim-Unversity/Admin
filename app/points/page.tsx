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
import { useTranslations } from "next-intl";

export default function PointsPage() {
  const t = useTranslations("pointsList");
  const te = useTranslations("events");
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
        <div className="animate-pulse text-muted-foreground">{t("loadingEvents")}</div>
      </div>
    );
  }

  if (error) {
    return (
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
    );
  }

  if (customEvents.length === 0) {
    return (
      <div className="flex justify-center">
        <Alert className="max-w-2xl">
          <Calendar className="h-4 w-4" />
          <AlertTitle>{t("noneYetTitle")}</AlertTitle>
          <AlertDescription>
            {t("noneYetDescription")}
            <div className="mt-4">
              <Button asChild size="sm">
                <Link
                  href="/points/create"
                  className="flex items-center gap-2"
                >
                  <Trophy className="h-4 w-4" />
                  {t("createFirst")}
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
