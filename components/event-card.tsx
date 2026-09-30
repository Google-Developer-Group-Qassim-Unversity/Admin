"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { parseLocalDateTime } from "@/lib/utils";
import type { Event } from "@/lib/api-types";
import { MapPin, Globe, Users, Building2, CalendarDays, ImageOff } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const t = useTranslations("events");
  const tc = useTranslations("common.actions");
  const locale = useLocale();
  // "Oct 14" / "١٤ أكتوبر", in the interface's own locale.
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

  return (
    <article className="group bg-card border-border relative flex h-full overflow-hidden rounded-2xl border transition-shadow hover:shadow-[0_2px_4px_oklch(0_0_0/0.04),0_8px_24px_oklch(0_0_0/0.06)] sm:flex-col">
      {/* Phones get a square thumbnail beside the text so a dozen events fit in
          a few thumb-flicks. From sm up the image heads the card at a fixed
          height and is shown whole (object-contain) so posters are never
          cropped and every card lines up with the tallest. */}
      <div className="bg-muted relative m-2.5 aspect-square w-[92px] shrink-0 self-start overflow-hidden rounded-xl sm:m-0 sm:aspect-auto sm:h-64 sm:w-full sm:rounded-none">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 92px, (max-width: 1200px) 50vw, 33vw"
            className="object-cover sm:object-contain"
            priority={false}
          />
        ) : (
          <div className="text-muted-foreground flex h-full items-center justify-center">
            <ImageOff className="h-6 w-6 opacity-50 sm:hidden" />
            <span className="hidden text-sm sm:inline">{t("card.noImage")}</span>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 py-3 pe-3.5 sm:gap-3 sm:p-4">
        <div className="flex flex-col-reverse items-start gap-1.5 sm:flex-row sm:justify-between sm:gap-2">
          <h3 className="line-clamp-2 min-w-0 flex-1 self-stretch text-[15px] leading-snug font-semibold sm:text-base" dir="auto">
            {/* Stretched: the whole card opens the event. */}
            <Link
              href={`/events/${event.id}`}
              className="outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-[3px] focus-visible:after:ring-ring/50"
            >
              {event.name}
            </Link>
          </h3>
          <StatusBadge status={event.status} className="shrink-0 px-2 py-0.5 sm:px-2.5 sm:py-1" />
        </div>

        {event.description && (
          <p dir="auto" className="text-muted-foreground line-clamp-1 hidden text-sm sm:block">
            {event.description}
          </p>
        )}

        <dl className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] sm:flex-col sm:items-start sm:gap-y-1.5 sm:text-sm">
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">{t("card.starts")}</dt>
            <CalendarDays className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
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
                <Users className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                <span className="tabular">{event.attendance_count ?? 0}</span>
              </Link>
            </dd>
          </div>

          {event.location_type !== "none" && event.location && (
            <div className="flex min-w-0 max-w-full items-center gap-1.5">
              <dt className="sr-only">{t("card.location")}</dt>
              <LocationIcon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              <dd className="truncate" dir="auto">
                {event.location}
              </dd>
            </div>
          )}

          {/* Department - plain label, not clickable */}
          {departmentName && (
            <div className="flex min-w-0 max-w-full items-center gap-1.5">
              <dt className="sr-only">{t("card.department")}</dt>
              <Building2 className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              <dd className="truncate" dir="auto">
                {departmentName}
              </dd>
            </div>
          )}
        </dl>

        {/* On a phone the card itself is the "manage" target and editing is a
            tab inside the event, so the button row is for wider screens. */}
        <div className="relative z-10 mt-auto hidden gap-2 pt-1 sm:flex">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link href={`/events/${event.id}/edit`}>{tc("edit")}</Link>
          </Button>
          <Button asChild size="sm" className="flex-1">
            <Link href={`/events/${event.id}`}>{tc("manage")}</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
