"use client";

import { useTranslations } from "next-intl";

import { BrandRail } from "@/components/brand-mark";

import type { Event, EventStatus } from "@/lib/api-types";

const ORDER: EventStatus[] = ["draft", "open", "active", "closed"];

const BARS: Record<EventStatus, string> = {
  draft: "bg-muted-foreground/50",
  open: "bg-brand-blue",
  active: "bg-brand-green",
  closed: "bg-border",
};

/** Where every event in the term currently sits. Counted from the list itself. */
export function PipelineCard({ events }: { events: Event[] }) {
  const t = useTranslations("dashboard");
  const ts = useTranslations("events.status");

  const counts = ORDER.map((status) => ({
    status,
    count: events.filter((e) => e.status === status).length,
  }));
  const max = Math.max(1, ...counts.map((c) => c.count));

  return (
    <div className="bg-card border-border flex flex-col overflow-hidden rounded-xl border">
      <BrandRail />
      <div className="flex flex-col gap-3 p-4">
      <div className="flex items-baseline gap-2">
        <h3 className="font-display text-sm font-bold tracking-tight">{t("pipeline")}</h3>
        <span className="text-muted-foreground ms-auto text-[11.5px]">
          {t("eventCount", { count: events.length })}
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        {counts.map(({ status, count }) => (
          <div key={status} className="flex items-center gap-2.5">
            <span className="text-muted-foreground w-16 shrink-0 text-xs capitalize">
              {ts(status)}
            </span>
            <span className="bg-muted h-2 flex-1 overflow-hidden rounded-full">
              <span
                className={`block h-2 rounded-full ${BARS[status]}`}
                style={{ width: `${Math.round((count / max) * 100)}%` }}
              />
            </span>
            <span className="tabular w-6 shrink-0 text-end text-xs font-semibold">{count}</span>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}
