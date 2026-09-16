"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Globe, MapPin } from "lucide-react";

import { StatusBadge, URGENCY_STYLES } from "@/components/status-badge";
import type { Event } from "@/lib/api-types";
import { nextStepFor } from "@/lib/event-next-step";
import { parseLocalDateTime } from "@/lib/utils";

const DAY_MS = 86_400_000;

function RelativeDay({ date, now }: { date: Date; now: number }) {
  const t = useTranslations("events.when");
  const days = Math.round((date.getTime() - now) / DAY_MS);

  if (days === 0) return <span className="text-brand-green-ink font-semibold">{t("today")}</span>;
  if (days > 0) return <span>{t("inDays", { days })}</span>;
  return <span>{t("agoDays", { days: Math.abs(days) })}</span>;
}

function NextStepCell({ event, now }: { event: Event; now: number }) {
  const t = useTranslations("events.nextStep");
  const step = nextStepFor(event, new Date(now));

  if (step.key === "done") {
    return <span className="text-muted-foreground text-[11.5px]">{t("done")}</span>;
  }

  const pill = step.urgency ? URGENCY_STYLES[step.urgency].pill : "bg-muted text-foreground";

  return (
    <Link
      href={step.href}
      className={`inline-flex h-7 items-center rounded-md px-2.5 text-[11.5px] font-bold transition-opacity hover:opacity-85 ${pill}`}
    >
      {t(step.key)}
    </Link>
  );
}

/**
 * The dense view of the events list. Every row answers "what is this event
 * waiting for" in its last column, so the list doubles as a work queue.
 */
export function EventsTable({ events }: { events: Event[] }) {
  const t = useTranslations("events");
  // Read the clock once, at mount. Every "in 3 days" and every "next step" in
  // the table is then measured from the same instant, and re-renders stay pure.
  const [now] = React.useState(() => Date.now());

  return (
    <div className="bg-card border-border overflow-hidden rounded-xl border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-start">
          <thead>
            <tr className="bg-muted/40 border-border border-b">
              {["event", "status", "when", "where", "next"].map((col) => (
                <th
                  key={col}
                  className="text-muted-foreground px-4 py-2.5 text-start text-[11px] font-semibold tracking-wide"
                >
                  {t(`columns.${col}`)}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {events.map((event) => {
              const LocationIcon = event.location_type === "online" ? Globe : MapPin;
              const start = parseLocalDateTime(event.start_datetime);

              return (
                <tr
                  key={event.id}
                  className="border-border/60 hover:bg-muted/40 border-b transition-colors last:border-b-0"
                >
                  <td className="max-w-[320px] px-4 py-3">
                    <Link href={`/events/${event.id}`} className="flex flex-col gap-0.5">
                      <span className="truncate text-[13px] font-semibold">{event.name}</span>
                      <span className="text-muted-foreground truncate text-[11px]">
                        {event.is_official ? t("official") : t("unofficial")}
                      </span>
                    </Link>
                  </td>

                  <td className="px-4 py-3">
                    <StatusBadge status={event.status} />
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="tabular text-xs">
                        {start.toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span className="text-muted-foreground text-[10.5px]">
                        <RelativeDay date={start} now={now} />
                      </span>
                    </div>
                  </td>

                  <td className="text-muted-foreground max-w-[180px] px-4 py-3">
                    {event.location_type === "none" || event.location_type === "hidden" ? (
                      <span className="text-[11.5px]">—</span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs">
                        <LocationIcon className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{event.location}</span>
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <NextStepCell event={event} now={now} />
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
