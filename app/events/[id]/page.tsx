"use client";

import * as React from "react";
import Image from "next/image";
import { parseLocalDateTime, isOvernightEvent, getEventDayCount, getEffectiveEndDate } from "@/lib/utils";
import { useEventContext } from "@/contexts/event-context";
import { useEventAttendance, useEventDetails } from "@/hooks/use-event";
import { ArrowRight, MapPin, Globe, Calendar, Clock, ImageIcon, Trophy, Users, UserCheck, UserRound, type LucideIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

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
    <div className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
      <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <dt className="text-muted-foreground text-[13px] leading-5">{label}</dt>
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
  // Who is responsible lives on /details (staff-only), not on the public event row.
  const { data: details } = useEventDetails(event?.id ?? 0, !!event);

  if (!event) {
    return null;
  }

  const imageUrl = event.image_url?.startsWith('http') ? event.image_url : null;

  const LocationIcon = event.location_type === "online" ? Globe : MapPin;
  // Gregorian calendar with Latin digits in Arabic, matching the event cards.
  const dateLocale = locale === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-US";

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
    <div className="grid grid-cols-1 items-start gap-4 sm:gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-8">
      {imageUrl ? (
        <div className="border-border bg-muted/40 flex justify-center overflow-hidden rounded-2xl border">
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
        <div className="border-border bg-muted/40 text-muted-foreground flex items-center justify-center gap-2 rounded-2xl border border-dashed py-6 lg:aspect-square lg:flex-col lg:py-0">
          <ImageIcon className="h-5 w-5 opacity-60 lg:h-12 lg:w-12" aria-hidden="true" />
          <span className="text-sm">{t("noImage")}</span>
        </div>
      )}

      <div className="min-w-0 space-y-4 sm:space-y-6">
        <section className="bg-card border-border overflow-hidden rounded-xl border">
          <h2 className="sr-only">{t("details")}</h2>
          <dl className="divide-border divide-y">
            <Fact icon={Calendar} label={t("date")}>
              {singleDay ? (
                startDate
              ) : (
                <>
                  <span className="block">{startDate}</span>
                  <span className="block">
                    <ArrowRight className="text-muted-foreground me-1.5 inline h-4 w-4 align-[-2px] rtl:-scale-x-100" aria-hidden="true" />
                    {endDate}
                  </span>
                  {diffDays > 1 && (
                    <span className="text-muted-foreground block text-[13px] font-normal">
                      {t("daysCount", { count: diffDays })}
                    </span>
                  )}
                </>
              )}
            </Fact>

            <Fact icon={Clock} label={t("time")}>
              <span className="tabular" dir="auto">{dailyStartTime} – {dailyEndTime}</span>
              {!singleDay && (
                <span className="text-muted-foreground ms-2 text-[13px] font-normal">{t("daily")}</span>
              )}
            </Fact>

            {event.location_type !== "none" && (
              <Fact icon={LocationIcon} label={getLocationTypeLabel()}>
                <span dir="auto">{event.location}</span>
              </Fact>
            )}

            {showAttendance && (
              <Fact icon={UserCheck} label={t("attendance")}>
                <span className="tabular">
                  {t("attendeesCount", { count: attendanceData?.attendance_count ?? 0 })}
                </span>
              </Fact>
            )}

            {details && (
              <Fact icon={UserRound} label={t("responsible")}>
                {details.responsible ? (
                  <span dir="auto">{details.responsible.name}</span>
                ) : (
                  <span className="text-muted-foreground font-normal">{t("responsibleUnknown")}</span>
                )}
                {details.created_by && details.created_by.member_id !== details.responsible?.member_id && (
                  <span dir="auto" className="text-muted-foreground block text-[13px] font-normal">
                    {t("createdBy", { name: details.created_by.name })}
                  </span>
                )}
              </Fact>
            )}

            <Fact icon={event.is_official ? Trophy : Users} label={t("eventType")}>
              {event.is_official ? t("official") : t("unofficial")}
            </Fact>
          </dl>
        </section>

        <section className="bg-card border-border rounded-xl border px-4 py-4 sm:px-5 sm:py-5">
          <h2 className="font-display mb-2 text-base font-semibold tracking-tight">{t("description")}</h2>
          {event.description ? (
            <p dir="auto" className="text-muted-foreground text-[15px] leading-relaxed whitespace-pre-wrap break-words">
              {event.description}
            </p>
          ) : (
            <p className="text-muted-foreground text-sm italic">
              {t("noDescription")}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
