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
import { StatusBadge } from "@/components/status-badge";
import { parseLocalDateTime } from "@/lib/utils";
import type { Event } from "@/lib/api-types";
import { MapPin, Globe, Users, Building2, CalendarDays, ImageOff } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

interface EventCardProps {
  event: Event;
}

/**
 * One card per event, in two layouts: a compact thumbnail row on phones and
 * the full poster card from sm up. Both render and CSS shows one, so the grid
 * never lays out a hidden twin (display:none takes no grid cell).
 */
export function EventCard({ event }: EventCardProps) {
  return (
    <>
      <MobileEventCard event={event} />
      <DesktopEventCard event={event} />
    </>
  );
}

/** Phones: a thumbnail row where the whole card opens the event. */
function MobileEventCard({ event }: EventCardProps) {
  const t = useTranslations("events");
  const locale = useLocale();
  // "Oct 14" / "١٤ أكتوبر", in the interface's own locale.
  const formatStartDate = (dateString: string) => {
    const date = parseLocalDateTime(dateString);
    return date.toLocaleDateString(locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-US", {
      month: "short",
      day: "numeric",
    });
  };

  const LocationIcon = event.location_type === "online" ? Globe : MapPin;
  const imageUrl = event.image_url?.startsWith("http") ? event.image_url : null;
  const departmentName =
    event.department_id == null
      ? null
      : locale === "ar"
        ? (event.department_ar_name ?? event.department_name)
        : (event.department_name ?? event.department_ar_name);

  return (
    <article className="group bg-card border-border relative flex h-full sm:hidden overflow-hidden rounded-2xl border transition-shadow hover:shadow-[0_2px_4px_oklch(0_0_0/0.04),0_8px_24px_oklch(0_0_0/0.06)]">
      {/* A square thumbnail beside the text, so a dozen events fit in a few
          thumb-flicks. */}
      <div className="bg-muted relative m-2.5 aspect-square w-[92px] shrink-0 self-start overflow-hidden rounded-xl">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="92px"
            className="object-cover"
            priority={false}
          />
        ) : (
          <div className="text-muted-foreground flex h-full items-center justify-center">
            <ImageOff className="h-6 w-6 opacity-50" />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 py-3 pe-3.5">
        <div className="flex flex-col-reverse items-start gap-1.5">
          <h3 className="line-clamp-2 min-w-0 flex-1 self-stretch text-[15px] leading-snug font-semibold" dir="auto">
            {/* Stretched: the whole card opens the event. */}
            <Link
              href={`/events/${event.id}`}
              className="outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-[3px] focus-visible:after:ring-ring/50"
            >
              {event.name}
            </Link>
          </h3>
          <StatusBadge status={event.status} className="shrink-0 px-2 py-0.5" />
        </div>

        <dl className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">{t("card.starts")}</dt>
            <CalendarDays className="h-3.5 w-3.5 shrink-0" />
            <dd className="tabular text-foreground font-medium">
              {formatStartDate(event.start_datetime)}
            </dd>
          </div>

          {/* Attendance - links to the event's attendance tab */}
          <div className="relative z-10">
            <dt className="sr-only">{t("card.attendance")}</dt>
            <dd>
              <Link
                href={`/events/${event.id}/attendance`}
                className="hover:bg-muted hover:text-foreground -mx-1 flex items-center gap-1.5 rounded-md px-1 py-0.5 transition-colors"
              >
                <Users className="h-3.5 w-3.5 shrink-0" />
                <span className="tabular">{event.attendance_count ?? 0}</span>
              </Link>
            </dd>
          </div>

          {event.location_type !== "none" && event.location && (
            <div className="flex min-w-0 max-w-full items-center gap-1.5">
              <dt className="sr-only">{t("card.location")}</dt>
              <LocationIcon className="h-3.5 w-3.5 shrink-0" />
              <dd className="truncate" dir="auto">
                {event.location}
              </dd>
            </div>
          )}

          {/* Department - plain label, not clickable */}
          {departmentName && (
            <div className="flex min-w-0 max-w-full items-center gap-1.5">
              <dt className="sr-only">{t("card.department")}</dt>
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <dd className="truncate" dir="auto">
                {departmentName}
              </dd>
            </div>
          )}
        </dl>
      </div>
    </article>
  );
}

/** sm and up: the card as it was before the phone pass. */
function DesktopEventCard({ event }: EventCardProps) {
  const t = useTranslations("events");
  const tc = useTranslations("common.actions");
  const locale = useLocale();
  // Format the start date to "MMM DD" format
  const formatStartDate = (dateString: string) => {
    const date = parseLocalDateTime(dateString);
    return date.toLocaleDateString(locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-US", {
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
    <Card className="hidden sm:flex overflow-hidden flex-col h-full">
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
            <Link href={`/events/${event.id}`} className="line-clamp-2" dir="auto">
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
            <span className="truncate" dir="auto">{event.location}</span>
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
