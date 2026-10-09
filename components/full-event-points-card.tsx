"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { CalendarDays, ChevronRight, Globe, MapPin } from "lucide-react";

import { Plate, type DoorTone } from "@/components/najdi";
import { usePointsDate } from "@/components/points-custom-event-card";
import { StatusBadge } from "@/components/status-badge";
import type { Event, EventStatus } from "@/lib/api-types";

const STATUS_TONE: Record<EventStatus, DoorTone> = { draft: "umber", open: "indigo", active: "green", closed: "umber" };

/**
 * A full (attendance) event in the points section: one row on the wall. The
 * poster, or a plate in the event's status colour, leads; the whole row opens
 * the points editor, and "View event" is its own link on wider screens.
 */
export function FullEventPointsCard({ event }: { event: Event }) {
  const t = useTranslations("events");
  const tp = useTranslations("points");
  const formatDate = usePointsDate();

  const LocationIcon = event.location_type === "online" ? Globe : MapPin;
  const imageUrl = event.image_url?.startsWith("http") ? event.image_url : null;

  return (
    <li className="border-rule relative flex min-h-[72px] items-center gap-3 border-b px-1 py-3 transition-colors last:border-b-0 hover:bg-card active:bg-sunk md:px-4">
      {imageUrl ? (
        <span className="bg-sunk relative size-12 shrink-0 overflow-hidden rounded-lg">
          <Image src={imageUrl} alt="" fill sizes="48px" className="object-cover" />
        </span>
      ) : (
        <Plate tone={STATUS_TONE[event.status]} icon={CalendarDays} />
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <h3 className="truncate text-[15px] leading-snug font-bold" dir="auto">
          {/* Stretched: the whole row opens the points editor. */}
          <Link
            href={`/points/${event.id}`}
            aria-label={`${event.name}: ${tp("editPoints")}`}
            className="outline-none after:absolute after:inset-0 focus-visible:after:outline-2 focus-visible:after:outline-offset-[-2px] focus-visible:after:outline-ring"
          >
            {event.name}
          </Link>
        </h3>
        <dl className="text-ink-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
          <div className="flex items-center gap-1.5">
            <dt className="sr-only">{t("card.starts")}</dt>
            <dd className="tabular">{formatDate(event.start_datetime)}</dd>
          </div>
          {event.location ? (
            <div className="flex min-w-0 max-w-full items-center gap-1.5">
              <dt className="sr-only">{t("card.location")}</dt>
              <LocationIcon className="size-3.5 shrink-0" aria-hidden="true" />
              <dd className="truncate" dir="auto">
                {event.location}
              </dd>
            </div>
          ) : null}
          <StatusBadge status={event.status} className="max-sm:hidden" />
        </dl>
      </div>

      <StatusBadge status={event.status} className="shrink-0 sm:hidden" />
      <Link
        href={`/events/${event.id}?from=points`}
        className="text-door-indigo-ink relative z-10 flex min-h-10 items-center px-2 text-[13px] font-bold hover:underline max-md:hidden"
      >
        {tp("viewEvent")}
      </Link>
      <ChevronRight className="text-ink-3 size-[18px] shrink-0 rtl:-scale-x-100" aria-hidden="true" />
    </li>
  );
}
