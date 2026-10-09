"use client";

import Image from "next/image";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronRight, Globe, ImageOff, MapPin, Users } from "lucide-react";

import { EventThumb, eventTone, posterUrl, urgencyTone, useDepartmentName, useEventDates } from "@/components/event-bits";
import { Mark, SOFT } from "@/components/najdi";
import { StatusBadge } from "@/components/status-badge";
import type { Event } from "@/lib/api-types";
import { nextStepFor } from "@/lib/event-next-step";
import { cn } from "@/lib/utils";

/** The step this event is waiting for, as a small chip in its state colour. */
export function NextStepChip({ event, now, className }: { event: Event; now: number; className?: string }) {
  const t = useTranslations("events.nextStep");
  const step = nextStepFor(event, new Date(now));
  if (step.key === "done") return <span className={cn("text-ink-2 text-[12.5px]", className)}>{t("done")}</span>;
  return (
    <Link
      href={step.href}
      className={cn(
        "relative z-10 inline-flex h-8 items-center gap-1 rounded-sm px-2.5 text-[12.5px] font-bold whitespace-nowrap transition-[filter] hover:brightness-95 pointer-coarse:h-9",
        SOFT[urgencyTone(step.urgency)],
        className,
      )}
    >
      {t(step.key)}
      <ChevronRight className="size-3.5 rtl:-scale-x-100" aria-hidden="true" />
    </Link>
  );
}

/**
 * One event as a row on the wall: poster (or a plate in its state colour),
 * title, when and where, its status and the step it is waiting for. The whole
 * row opens the event; the step chip goes straight to that step.
 */
export function EventRow({ event, now }: { event: Event; now: number }) {
  const t = useTranslations("events");
  const dates = useEventDates();
  const departmentName = useDepartmentName();
  const dept = departmentName(event);
  const LocationIcon = event.location_type === "online" ? Globe : MapPin;
  const showLocation = event.location_type !== "none" && event.location_type !== "hidden" && Boolean(event.location);

  return (
    <li className="border-rule relative flex items-start gap-3 border-b px-1 py-3 transition-colors hover:bg-card has-[a:active]:bg-sunk">
      <EventThumb event={event} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="line-clamp-2 text-[15px] leading-snug font-bold" dir="auto">
          <Link
            href={`/events/${event.id}`}
            className="outline-none after:absolute after:inset-0 focus-visible:after:outline-2 focus-visible:after:outline-offset-[-2px] focus-visible:after:outline-ring"
          >
            {event.name}
          </Link>
        </h3>
        <p className="text-ink-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px]">
          <span className="tabular text-foreground font-medium">
            {dates.weekday(event.start_datetime)} {dates.day(event.start_datetime)}
          </span>
          {dept ? (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate" dir="auto">{dept}</span>
            </>
          ) : null}
          {showLocation ? (
            <span className="flex min-w-0 max-w-full items-center gap-1">
              <LocationIcon className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="sr-only">{t("card.location")}</span>
              <span className="truncate" dir="auto">{event.location}</span>
            </span>
          ) : null}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <StatusBadge status={event.status} />
          <NextStepChip event={event} now={now} />
          {event.status === "active" || event.status === "closed" ? (
            <Link
              href={`/events/${event.id}/attendance`}
              className="text-ink-2 hover:text-foreground relative z-10 inline-flex h-8 items-center gap-1 rounded-sm px-1 text-[12.5px] font-bold"
            >
              <Users className="size-3.5" aria-hidden="true" />
              <span className="sr-only">{t("card.attendance")}</span>
              <span className="tabular">{event.attendance_count ?? 0}</span>
            </Link>
          ) : null}
        </div>
      </div>
      <ChevronRight className="text-ink-3 mt-1 size-[18px] shrink-0 rtl:-scale-x-100" aria-hidden="true" />
    </li>
  );
}

/**
 * The poster view: the poster leads, uncropped on a sunk ground, with the
 * state as a square mark and the title under it. For browsing a term's events
 * by their artwork.
 */
export function EventPosterTile({ event, now }: { event: Event; now: number }) {
  const t = useTranslations("events");
  const dates = useEventDates();
  const departmentName = useDepartmentName();
  const dept = departmentName(event);
  const url = posterUrl(event);

  return (
    <li className="group relative flex flex-col gap-2">
      <div className="bg-sunk ring-rule relative aspect-[4/5] overflow-hidden rounded-xl ring-1 transition-shadow group-hover:shadow-[0_10px_24px_-14px_rgb(58_42_31/0.55)]">
        {url ? (
          <Image src={url} alt="" fill sizes="(min-width: 1280px) 20vw, (min-width: 768px) 30vw, 100vw" className="object-contain" />
        ) : (
          <div className="text-ink-3 flex h-full flex-col items-center justify-center gap-2 text-sm">
            <ImageOff className="size-6" aria-hidden="true" />
            {t("card.noImage")}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1 px-0.5">
        <div className="flex items-center gap-2">
          <Mark tone={eventTone(event, now)} />
          <span className="text-ink-2 text-[12.5px] font-bold">{t(`status.${event.status}`)}</span>
          <span className="text-ink-2 tabular ms-auto text-[12.5px]">{dates.day(event.start_datetime)}</span>
        </div>
        <h3 className="line-clamp-2 text-[15px] leading-snug font-bold" dir="auto">
          <Link
            href={`/events/${event.id}`}
            className="outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:outline-2 focus-visible:after:outline-ring"
          >
            {event.name}
          </Link>
        </h3>
        {dept ? (
          <p className="text-ink-2 truncate text-[13px]" dir="auto">
            {dept}
          </p>
        ) : null}
      </div>
    </li>
  );
}
