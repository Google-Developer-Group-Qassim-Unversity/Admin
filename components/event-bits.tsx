"use client";

import * as React from "react";
import Image from "next/image";
import { useLocale } from "next-intl";
import { CalendarDays } from "lucide-react";

import { Plate, type DoorTone } from "@/components/najdi";
import { EVENT_TONE, type Urgency } from "@/components/status-badge";
import type { Event } from "@/lib/api-types";
import { getEffectiveEndDate, parseLocalDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { intlLocale } from "@/lib/format";

/**
 * An event's door colour. Draft and closed are mud (nothing to do, or done
 * with), open is indigo (members are signing up), active is green (it is
 * running) unless it has ended without attendance being closed, which is
 * madder: overdue.
 */
export function eventTone(event: Pick<Event, "status" | "start_datetime" | "end_datetime">, now = Date.now()): DoorTone {
  if (event.status === "active") {
    const start = parseLocalDateTime(event.start_datetime);
    const end = getEffectiveEndDate(start, parseLocalDateTime(event.end_datetime));
    if (end.getTime() < now) return "madder";
  }
  return EVENT_TONE[event.status];
}

/** The tone an urgency reads as; a step with no urgency is plain mud. */
export function urgencyTone(urgency: Urgency | null): DoorTone {
  switch (urgency) {
    case "waiting":
      return "ochre";
    case "overdue":
      return "madder";
    case "info":
      return "indigo";
    case "done":
      return "green";
    default:
      return "umber";
  }
}

/** The event's department in the reader's language, or null for a club-wide event. */
export function useDepartmentName() {
  const locale = useLocale();
  return React.useCallback(
    (event: Pick<Event, "department_id" | "department_name" | "department_ar_name">) =>
      event.department_id == null && !event.department_name
        ? null
        : locale === "ar"
          ? (event.department_ar_name ?? event.department_name ?? null)
          : (event.department_name ?? event.department_ar_name ?? null),
    [locale],
  );
}

/**
 * Dates in the reader's language: Gregorian calendar and the interface's own
 * digits, matching the rest of the console.
 */
export function useEventDates() {
  const locale = useLocale();
  return React.useMemo(() => {
    const loc = intlLocale(locale);
    const day = new Intl.DateTimeFormat(loc, { day: "numeric", month: "short" });
    const dayLong = new Intl.DateTimeFormat(loc, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    const time = new Intl.DateTimeFormat(loc, { hour: "numeric", minute: "2-digit" });
    const weekday = new Intl.DateTimeFormat(loc, { weekday: "short" });
    const span = new Intl.DateTimeFormat(loc, { weekday: "short", day: "numeric", month: "long", year: "numeric" });
    return {
      /** "14 Oct" */
      day: (iso: string) => day.format(parseLocalDateTime(iso)),
      /** "Tuesday 14 October 2026" */
      dayLong: (d: Date) => dayLong.format(d),
      /** "6:00 pm" */
      time: (iso: string) => time.format(parseLocalDateTime(iso)),
      /** "Thu 8 – Fri 9 October 2026", or one day when both fall on it. */
      range: (from: Date, to: Date) => (from.toDateString() === to.toDateString() ? dayLong.format(from) : span.formatRange(from, to)),
      /** "Tue" */
      weekday: (iso: string) => weekday.format(parseLocalDateTime(iso)),
    };
  }, [locale]);
}

/** Only absolute http(s) URLs are posters; anything else is a missing image. */
export function posterUrl(event: Pick<Event, "image_url">): string | null {
  return event.image_url?.startsWith("http") ? event.image_url : null;
}

/**
 * The event's poster as a small square, or - with no poster - a plate in the
 * event's state colour, so a list row is always led by something.
 */
export function EventThumb({ event, size = 56, className }: { event: Event; size?: number; className?: string }) {
  const url = posterUrl(event);
  if (!url) {
    return <Plate tone={eventTone(event)} icon={CalendarDays} size={size >= 56 ? "lg" : "md"} className={className} />;
  }
  return (
    <span
      className={cn("bg-sunk relative block shrink-0 overflow-hidden rounded-lg ring-1 ring-rule", className)}
      style={{ width: size, height: size }}
    >
      <Image src={url} alt="" fill sizes={`${size}px`} className="object-cover" />
    </span>
  );
}
