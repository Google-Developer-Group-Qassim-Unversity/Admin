"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ChevronRight, Eye, EyeOff } from "lucide-react";

import { INK, Plate } from "@/components/najdi";
import { parseLocalDateTime } from "@/lib/utils";
import type { Event } from "@/lib/api-types";
import { intlLocale } from "@/lib/format";

/** "12 Oct 2026" in the reader's language, Gregorian. */
export function usePointsDate() {
  const locale = useLocale();
  return (iso: string) =>
    parseLocalDateTime(iso).toLocaleDateString(intlLocale(locale), {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
}

/**
 * A custom (points-only) event: one row on the wall. The plate says whether it
 * shows on the public leaderboard (indigo) or is hidden (umber); the whole row
 * opens the points editor.
 */
export function PointsCustomEventCard({ event }: { event: Event }) {
  const tp = useTranslations("points");
  const tf = useTranslations("customEventForm");
  const formatDate = usePointsDate();

  const isHidden = event.location_type === "hidden";
  const href = `/points/${event.id}`;

  return (
    <li className="border-rule relative flex min-h-16 items-center gap-3 border-b px-1 py-3 transition-colors last:border-b-0 hover:bg-card active:bg-sunk md:px-4">
      <Plate tone={isHidden ? "umber" : "indigo"} icon={isHidden ? EyeOff : Eye} />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h3 className="truncate text-[15px] leading-snug font-bold">
          {/* Stretched: the whole row opens the points editor. */}
          <Link
            href={href}
            aria-label={`${event.name}: ${tp("editPoints")}`}
            className="outline-none after:absolute after:inset-0 focus-visible:after:outline-2 focus-visible:after:outline-offset-[-2px] focus-visible:after:outline-ring"
          >
            <bdi>{event.name}</bdi>
          </Link>
        </h3>
        <p className="text-ink-2 flex flex-wrap items-center gap-x-2 text-[13px]">
          <span className="tabular">{formatDate(event.start_datetime)}</span>
          <span aria-hidden="true">·</span>
          <span className={isHidden ? INK.umber : INK.indigo}>{isHidden ? tf("hidden") : tf("visible")}</span>
        </p>
        {event.description ? (
          <p dir="auto" className="text-ink-2 line-clamp-1 text-[13px] max-md:hidden">
            {event.description}
          </p>
        ) : null}
      </div>

      <span className="text-ink-2 text-[13px] font-bold max-md:hidden">{tp("editPoints")}</span>
      <ChevronRight className="text-ink-3 size-[18px] shrink-0 rtl:-scale-x-100" aria-hidden="true" />
    </li>
  );
}
