"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { parseLocalDateTime } from "@/lib/utils";
import type { Event } from "@/lib/api-types";
import { MapPin, Globe, Users, Building2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const t = useTranslations("events");
  const tc = useTranslations("common.actions");
  const locale = useLocale();
  // Format the start date to "MMM DD" format
  const formatStartDate = (dateString: string) => {
    const date = parseLocalDateTime(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  };

  // Get location icon based on location type
  const LocationIcon = event.location_type === "online" ? Globe : MapPin;

  const imageUrl = event.image_url?.startsWith('http') ? event.image_url : null;

  const departmentName =
    event.department_id == null
      ? null
      : locale === "ar"
        ? (event.department_ar_name ?? event.department_name)
        : (event.department_name ?? event.department_ar_name);

  // Get status badge variant
  const getStatusVariant = (status: Event["status"]) => {
    switch (status) {
      case "draft":
        return "default";
      case "open":
        return "secondary";
      case "active":
        return "default";
      case "closed":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <Card className="overflow-hidden flex flex-col h-full">
      {/* Event Image: every box gets the same height, so a missing image or a
          short one lines up with the tallest card; the image itself is shown
          whole (object-contain) on the muted background, never cropped */}
      <div className="relative w-full h-80 bg-muted">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={event.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-contain"
            priority={false}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <span className="text-sm">{t("card.noImage")}</span>
          </div>
        )}
      </div>

      {/* Event Details */}
      <CardHeader className="flex-1 px-4 pb-2">
        <div className="flex items-start justify-between gap-2 mb-1">
          <Button
            asChild
            variant="link"
            className="font-semibold text-base h-auto p-0 flex-1 justify-start text-start whitespace-normal text-foreground hover:text-foreground"
          >
            <Link href={`/events/${event.id}`} className="line-clamp-2">
              {event.name}
            </Link>
          </Button>
          <Badge variant={getStatusVariant(event.status)}>
            {t(`status.${event.status}`)}
          </Badge>
        </div>

        {event.description && (
          <p dir="auto" className="text-sm text-muted-foreground line-clamp-1">
            {event.description}
          </p>
        )}
      </CardHeader>

      <CardContent className="px-4 pb-2 space-y-1.5">
        {/* Location */}
        {event.location_type !== "none" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LocationIcon className="h-4 w-4 shrink-0" />
            <span className="truncate">{event.location}</span>
          </div>
        )}

        {/* Start Date */}
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{t("card.starts")}</span>
          <span className="text-muted-foreground">
            {formatStartDate(event.start_datetime)}
          </span>
        </div>

        {/* Attendance - links to the event's attendance tab */}
        <Link
          href={`/events/${event.id}/attendance`}
          className="flex items-center gap-2 text-sm rounded-sm -mx-1 px-1 py-0.5 transition-colors hover:bg-muted"
        >
          <span className="font-medium">{t("card.attendance")}</span>
          <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-muted-foreground">
            {event.attendance_count ?? 0}
          </span>
        </Link>

        {/* Department - plain label, not clickable */}
        {departmentName && (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">{t("card.department")}</span>
            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground truncate" dir="auto">
              {departmentName}
            </span>
          </div>
        )}
      </CardContent>

      {/* Actions */}
      <CardFooter className="px-4 pb-3 gap-2">
        <Button asChild variant="outline" className="flex-1 h-8">
          <Link href={`/events/${event.id}/edit`}>{tc("edit")}</Link>
        </Button>
        <Button asChild className="flex-1 h-8">
          <Link href={`/events/${event.id}`}>{tc("manage")}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
