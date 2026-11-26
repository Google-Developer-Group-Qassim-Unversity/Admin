"use client";

import Link from "next/link";
import { Award, Ban, CalendarClock, CheckCircle2, FileEdit, Radio } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { Plate } from "@/components/najdi";
import { resolveLifecycleState } from "@/lib/event-lifecycle";
import { useFormatters } from "@/lib/format";
import { parseLocalDateTime } from "@/lib/utils";
import type { Event } from "@/lib/api-types";

interface EventStatusItemProps {
  event: Event;
  onOpenCertificates?: () => void;
}

/**
 * Lifecycle-aware status header strip on the Attendance page.
 * Events end automatically from the Riyadh clock — no manual close/reopen toggle.
 */
export function EventStatusItem({ event, onOpenCertificates }: EventStatusItemProps) {
  const t = useTranslations("attendance.lifecycleStrip");
  const fmt = useFormatters();
  const state = resolveLifecycleState(event);

  if (state === "draft") {
    return (
      <section className="border-rule flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:gap-6">
        <Plate tone="umber" icon={FileEdit} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h2 className="text-base font-bold">{t("draftTitle")}</h2>
            <StatusBadge state="draft" />
          </div>
          <p className="text-ink-2 text-[13.5px]">{t("draftDescription")}</p>
        </div>
        <Button asChild variant="green" className="w-full shrink-0 sm:w-auto">
          <Link href={`/events/${event.id}/manage`}>{t("goToPublish")}</Link>
        </Button>
      </section>
    );
  }

  if (state === "cancelled") {
    return (
      <section className="border-rule flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:gap-6">
        <Plate tone="madder" icon={Ban} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h2 className="text-base font-bold">{t("cancelledTitle")}</h2>
            <StatusBadge state="cancelled" />
          </div>
          <p className="text-ink-2 text-[13.5px]">{t("cancelledDescription")}</p>
        </div>
        <Button asChild variant="outline" className="w-full shrink-0 sm:w-auto">
          <Link href={`/events/${event.id}/manage`}>{t("manageStatus")}</Link>
        </Button>
      </section>
    );
  }

  if (state === "upcoming") {
    const startFormatted = fmt.dateTime(parseLocalDateTime(event.start_datetime));
    return (
      <section className="border-rule flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:gap-6">
        <Plate tone="indigo" icon={CalendarClock} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h2 className="text-base font-bold">{t("upcomingTitle")}</h2>
            <StatusBadge state="upcoming" />
          </div>
          <p className="text-ink-2 text-[13.5px]">{t("upcomingDescription", { time: startFormatted })}</p>
        </div>
      </section>
    );
  }

  if (state === "live") {
    return (
      <section className="border-rule flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:gap-6">
        <Plate tone="green" icon={Radio} />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h2 className="text-base font-bold">{t("liveTitle")}</h2>
            <StatusBadge state="live" />
          </div>
          <p className="text-ink-2 text-[13.5px]">{t("liveDescription")}</p>
        </div>
      </section>
    );
  }

  // Ended (published + ended)
  return (
    <section className="border-rule flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:gap-6">
      <Plate tone="neutral" icon={CheckCircle2} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <h2 className="text-base font-bold">{t("endedTitle")}</h2>
          <StatusBadge state="ended" />
        </div>
        <p className="text-ink-2 text-[13.5px]">{t("endedDescription")}</p>
      </div>
      {onOpenCertificates ? (
        <Button variant="outline" onClick={onOpenCertificates} className="w-full shrink-0 sm:w-auto">
          <Award />
          {t("sendCertificates")}
        </Button>
      ) : null}
    </section>
  );
}
