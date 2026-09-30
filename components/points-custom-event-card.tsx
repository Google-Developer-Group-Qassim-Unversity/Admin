"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { CalendarDays, ChevronRight, Eye, EyeOff, Trophy } from "lucide-react";

import { Button } from "@/components/ui/button";
import { parseLocalDateTime } from "@/lib/utils";
import type { Event } from "@/lib/api-types";

/**
 * A custom (points-only) event. On a phone it is a compact row - icon, name,
 * date and visibility - and the whole row opens the points editor. From sm up
 * it is a card in the grid with an explicit "Edit points" button.
 */
export function PointsCustomEventCard({ event }: { event: Event }) {
  const tp = useTranslations("points");
  const tf = useTranslations("customEventForm");
  const locale = useLocale();

  const date = parseLocalDateTime(event.start_datetime).toLocaleDateString(
    locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-US",
    { month: "short", day: "numeric", year: "numeric" },
  );
  const isHidden = event.location_type === "hidden";
  const href = `/points/${event.id}`;

  return (
    <article className="group bg-card border-border relative flex h-full items-center gap-3 rounded-2xl border p-3 transition-shadow hover:shadow-[0_2px_4px_oklch(0_0_0/0.04),0_8px_24px_oklch(0_0_0/0.06)] sm:flex-col sm:items-stretch sm:gap-4 sm:p-4">
      <div className="flex min-w-0 flex-1 items-center gap-3 sm:items-start">
        <span className="bg-muted text-muted-foreground flex h-11 w-11 shrink-0 items-center justify-center rounded-xl">
          <Trophy className="h-5 w-5" />
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h3 className="line-clamp-2 text-[15px] leading-snug font-semibold sm:text-base" dir="auto">
            {/* Stretched: the whole card opens the points editor. */}
            <Link
              href={href}
              className="outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-[3px] focus-visible:after:ring-ring/50"
            >
              {event.name}
            </Link>
          </h3>

          <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] sm:text-sm">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              <span className="tabular text-foreground font-medium">{date}</span>
            </span>
            <span className="flex items-center gap-1.5">
              {isHidden ? (
                <EyeOff className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              ) : (
                <Eye className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              )}
              {isHidden ? tf("hidden") : tf("visible")}
            </span>
          </div>

          {event.description && (
            <p dir="auto" className="text-muted-foreground mt-1 line-clamp-1 hidden text-sm sm:block">
              {event.description}
            </p>
          )}
        </div>
      </div>

      <ChevronRight className="text-muted-foreground h-5 w-5 shrink-0 rtl:-scale-x-100 sm:hidden" aria-hidden />

      <Button asChild className="relative z-10 mt-auto hidden w-full sm:inline-flex">
        <Link href={href}>{tp("editPoints")}</Link>
      </Button>
    </article>
  );
}
