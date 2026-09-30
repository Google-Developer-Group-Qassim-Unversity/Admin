"use client";

import { useLocale, useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { parseLocalDateTime } from "@/lib/utils";
import type { Event } from "@/lib/api-types";
import { MapPin, Globe, Trophy, CalendarDays } from "lucide-react";

interface FullEventPointsCardProps {
  event: Event;
}

/**
 * A full (attendance) event in the points section. Phone: a compact row with
 * a square thumbnail, and the whole row opens the points editor. sm+: the
 * image heads a card with "View event" / "Edit points" buttons.
 */
export function FullEventPointsCard({ event }: FullEventPointsCardProps) {
  const t = useTranslations("events");
  const tp = useTranslations("points");
  const locale = useLocale();
  const formatStartDate = (dateString: string) => {
    const date = parseLocalDateTime(dateString);
    return date.toLocaleDateString(locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const LocationIcon = event.location_type === "online" ? Globe : MapPin;

  const imageUrl = event.image_url?.startsWith('http') ? event.image_url : null;

  return (
    <article className="group bg-card border-border relative flex h-full overflow-hidden rounded-2xl border transition-shadow hover:shadow-[0_2px_4px_oklch(0_0_0/0.04),0_8px_24px_oklch(0_0_0/0.06)] sm:flex-col">
      <div className="bg-muted relative m-2.5 aspect-square w-[76px] shrink-0 self-start overflow-hidden rounded-xl sm:m-0 sm:aspect-video sm:w-full sm:rounded-none">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 76px, (max-width: 1200px) 50vw, 33vw"
            className="object-cover"
            priority={false}
          />
        ) : (
          <div className="text-muted-foreground flex h-full items-center justify-center">
            <Trophy className="h-6 w-6 opacity-40 sm:h-12 sm:w-12" />
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 py-3 pe-3.5 sm:gap-3 sm:p-4">
        <div className="flex flex-col-reverse items-start gap-1.5 sm:flex-row sm:justify-between sm:gap-2">
          <h3 className="line-clamp-2 min-w-0 flex-1 text-[15px] leading-snug font-semibold sm:text-lg" dir="auto">
            {/* Stretched: the whole card opens the points editor. */}
            <Link
              href={`/points/${event.id}`}
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

          {event.location && (
            <div className="flex min-w-0 max-w-full items-center gap-1.5">
              <dt className="sr-only">{t("card.location")}</dt>
              <LocationIcon className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              <dd className="truncate" dir="auto">{event.location}</dd>
            </div>
          )}
        </dl>

        <div className="relative z-10 mt-auto hidden gap-2 pt-1 sm:flex">
          <Button asChild variant="outline" className="flex-1">
            <Link href={`/events/${event.id}?from=points`}>{tp("viewEvent")}</Link>
          </Button>
          <Button asChild className="flex-1">
            <Link href={`/points/${event.id}`}>{tp("editPoints")}</Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
