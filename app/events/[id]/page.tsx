"use client";

import * as React from "react";
import Image from "next/image";
import { parseLocalDateTime, isOvernightEvent, getEventDayCount, getEffectiveEndDate } from "@/lib/utils";
import { useEventContext } from "@/contexts/event-context";
import { useEventAttendance } from "@/hooks/use-event";
import { ArrowRight, MapPin, Globe, Calendar, Clock, ImageIcon, Trophy, Users, UserCheck, type LucideIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { SectionHead } from "@/components/najdi";

/** One labelled fact in the summary list: icon chip, muted label, value. */
function Fact({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-rule flex items-start gap-3 border-b py-3 last:border-b-0">
      <Icon className="text-ink-2 mt-0.5 size-[18px] shrink-0" strokeWidth={1.75} aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:gap-4">
        <dt className="text-ink-2 shrink-0 text-[13.5px] leading-6 sm:w-36">{label}</dt>
        <dd className="text-foreground text-[15px] leading-6 font-medium break-words">{children}</dd>
      </div>
    </div>
  );
}

export default function EventInfoPage() {
  const t = useTranslations("eventInfo");
  const locale = useLocale();
  const { event } = useEventContext();

  const { data: attendanceData } = useEventAttendance(
    event?.id ?? 0,
    "all",
    !!event,
    "count"
  );

  if (!event) {
    return null;
  }

  const imageUrl = event.image_url?.startsWith('http') ? event.image_url : null;

  const LocationIcon = event.location_type === "online" ? Globe : MapPin;
  // Gregorian calendar with Latin digits in Arabic, matching the event cards.
  const dateLocale = locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB";

  const formatDate = (dateString: string) => {
    const date = parseLocalDateTime(dateString);
    return date.toLocaleDateString(dateLocale, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = parseLocalDateTime(dateString);
    return date.toLocaleTimeString(dateLocale, {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const startDate = formatDate(event.start_datetime);
  const dailyStartTime = formatTime(event.start_datetime);
  const dailyEndTime = formatTime(event.end_datetime);

  const start = parseLocalDateTime(event.start_datetime);
  const end = parseLocalDateTime(event.end_datetime);

  const isSameDay = start.toDateString() === end.toDateString();
  const overnight = isOvernightEvent(start, end);
  const diffDays = getEventDayCount(start, end);
  const effectiveEnd = getEffectiveEndDate(start, end);
  const endDate = formatDate(effectiveEnd.toISOString());
  const singleDay = isSameDay || overnight;

  const getLocationTypeLabel = () => {
    switch (event.location_type) {
      case "online":
        return t("onlineEvent");
      case "on-site":
        return t("onsiteEvent");
      case "none":
        return t("noLocation");
      default:
        return event.location_type;
    }
  };

  const showAttendance = event.status === "active" || event.status === "closed";

  return (
    // Phone: poster, facts, description stacked. lg+: poster beside the rest.
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-10">
      {imageUrl ? (
        <div className="bg-sunk ring-rule flex justify-center overflow-hidden rounded-xl ring-1">
          <Image
            src={imageUrl}
            alt={event.name}
            width={600}
            height={600}
            sizes="(min-width: 1024px) 40vw, 100vw"
            className="h-auto max-h-[60dvh] w-full object-contain lg:max-h-150"
          />
        </div>
      ) : (
        <div className="border-adobe text-ink-2 flex items-center justify-center gap-2 rounded-xl border border-dashed py-6 lg:aspect-square lg:flex-col lg:py-0">
          <ImageIcon className="size-5 lg:size-10" strokeWidth={1.5} aria-hidden="true" />
          <span className="text-sm">{t("noImage")}</span>
        </div>
      )}

      <div className="flex min-w-0 flex-col gap-8">
        <section aria-labelledby="event-details" className="flex flex-col gap-1">
          <SectionHead id="event-details" title={t("details")} />
          <dl>
            <Fact icon={Calendar} label={t("date")}>
              {singleDay ? (
                startDate
              ) : (
                <>
                  <span className="block">{startDate}</span>
                  <span className="block">
                    <ArrowRight className="text-ink-2 me-1.5 inline size-4 align-[-2px] rtl:-scale-x-100" aria-hidden="true" />
                    {endDate}
                  </span>
                  {diffDays > 1 && (
                    <span className="text-ink-2 block text-[13px] font-normal">{t("daysCount", { count: diffDays })}</span>
                  )}
                </>
              )}
            </Fact>

            <Fact icon={Clock} label={t("time")}>
              <span className="tabular" dir="auto">
                {dailyStartTime} – {dailyEndTime}
              </span>
              {!singleDay && <span className="text-ink-2 ms-2 text-[13px] font-normal">{t("daily")}</span>}
            </Fact>

            {event.location_type !== "none" && (
              <Fact icon={LocationIcon} label={getLocationTypeLabel()}>
                <span dir="auto">{event.location}</span>
              </Fact>
            )}

            {showAttendance && (
              <Fact icon={UserCheck} label={t("attendance")}>
                <span className="tabular">{t("attendeesCount", { count: attendanceData?.attendance_count ?? 0 })}</span>
              </Fact>
            )}

            <Fact icon={event.is_official ? Trophy : Users} label={t("eventType")}>
              {event.is_official ? t("official") : t("unofficial")}
            </Fact>
          </dl>
        </section>

        <section aria-labelledby="event-description" className="flex flex-col gap-3">
          <SectionHead id="event-description" title={t("description")} />
          {event.description ? (
            <p dir="auto" className="max-w-[70ch] text-[15px] leading-relaxed break-words whitespace-pre-wrap">
              {event.description}
            </p>
          ) : (
            <p className="text-ink-2 text-sm">{t("noDescription")}</p>
          )}
        </section>
      </div>
    </div>
  );
}
