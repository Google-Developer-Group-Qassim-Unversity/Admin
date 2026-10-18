"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { Globe, MapPin } from "lucide-react";

import { NextStepChip } from "@/components/event-card";
import { EventThumb, useDepartmentName, useEventDates } from "@/components/event-bits";
import { StatusBadge } from "@/components/status-badge";
import type { Event } from "@/lib/api-types";
import { parseLocalDateTime } from "@/lib/utils";

const DAY_MS = 86_400_000;

function RelativeDay({ date, now }: { date: Date; now: number }) {
  const t = useTranslations("events.when");
  const days = Math.round((date.getTime() - now) / DAY_MS);

  if (days === 0) return <span className="text-door-green-ink font-bold">{t("today")}</span>;
  if (days > 0) return <span>{t("inDays", { days })}</span>;
  return <span>{t("agoDays", { days: Math.abs(days) })}</span>;
}

/**
 * The dense view of the events list, from md up. Every row answers "what is
 * this event waiting for" in its last column, so the list doubles as a work
 * queue.
 */
export function EventsTable({ events, now }: { events: Event[]; now: number }) {
  const t = useTranslations("events");
  const dates = useEventDates();
  const departmentName = useDepartmentName();

  return (
    <div className="bg-card ring-rule overflow-hidden rounded-xl ring-1">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-start">
          <thead>
            <tr className="border-foreground border-b">
              {(["event", "status", "when", "where", "next"] as const).map((col) => (
                <th key={col} scope="col" className="text-ink-2 px-4 py-3 text-start text-[12.5px] font-bold">
                  {t(`columns.${col}`)}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {events.map((event) => {
              const LocationIcon = event.location_type === "online" ? Globe : MapPin;
              const start = parseLocalDateTime(event.start_datetime);
              const dept = departmentName(event);

              return (
                <tr key={event.id} className="border-rule hover:bg-background border-b transition-colors last:border-b-0">
                  <td className="max-w-[360px] px-4 py-3">
                    <Link href={`/events/${event.id}`} className="group flex items-center gap-3 outline-none">
                      <EventThumb event={event} size={44} />
                      <span className="flex min-w-0 flex-col gap-0.5">
                        <span className="truncate text-sm font-bold group-hover:underline group-hover:underline-offset-4 group-focus-visible:underline" dir="auto">
                          {event.name}
                        </span>
                        <span className="text-ink-2 truncate text-[12.5px]" dir="auto">
                          {[dept, event.is_official ? t("official") : t("unofficial")].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                    </Link>
                  </td>

                  <td className="px-4 py-3">
                    <StatusBadge status={event.status} />
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="tabular text-[13px] font-medium">
                        {dates.weekday(event.start_datetime)} {dates.day(event.start_datetime)} · {dates.time(event.start_datetime)}
                      </span>
                      <span className="text-ink-2 text-[12px]">
                        <RelativeDay date={start} now={now} />
                      </span>
                    </div>
                  </td>

                  <td className="text-ink-2 max-w-[200px] px-4 py-3">
                    {event.location_type === "none" || event.location_type === "hidden" ? (
                      <span className="text-[12.5px]">—</span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[13px]">
                        <LocationIcon className="size-3.5 shrink-0" aria-hidden="true" />
                        <span className="truncate" dir="auto">{event.location}</span>
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <NextStepChip event={event} now={now} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
