"use client";

import * as React from "react";
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameMonth, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useDepartmentName } from "@/components/pipeline/shared";
import { PIPELINE_DAY_STYLES, type PipelineDayStatus } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePipelineCalendar } from "@/hooks/use-pipeline";
import type { CalendarDay } from "@/lib/pipeline-types";

const ISO = "yyyy-MM-dd";
const LEGEND: PipelineDayStatus[] = ["open", "held", "booked", "published", "banned", "locked"];

/**
 * A month of the booking calendar. Days are coloured by status; clicking one
 * calls `onDayClick`, and `selected` days get a ring. What a click means -
 * picking days to ban, or a range to book - is the parent's business.
 * `toolbar` sits at the trailing end of the month header.
 */
export function BookingCalendar({
  selected,
  onDayClick,
  isSelectable,
  toolbar,
}: {
  selected?: Set<string>;
  onDayClick?: (day: CalendarDay) => void;
  isSelectable?: (day: CalendarDay) => boolean;
  toolbar?: React.ReactNode;
}) {
  const t = useTranslations("pipeline.calendar");
  const locale = useLocale();
  const departmentName = useDepartmentName();
  const [month, setMonth] = React.useState(() => startOfMonth(new Date()));

  const gridStart = startOfWeek(startOfMonth(month));
  const gridEnd = endOfWeek(endOfMonth(month));
  const { data, isPending, error } = usePipelineCalendar(format(gridStart, ISO), format(gridEnd, ISO));

  const byDate = React.useMemo(() => new Map((data?.days ?? []).map((d) => [d.date, d])), [data]);
  const weekdays = React.useMemo(() => {
    const formatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
    return Array.from({ length: 7 }, (_, i) => formatter.format(addDays(gridStart, i)));
  }, [locale, gridStart]);
  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(month);

  // Only the statuses this month actually shows; "open" is always worth a key.
  const legend = LEGEND.filter((status) => status === "open" || data?.days.some((d) => d.status === status));

  const cells: Date[] = [];
  for (let day = gridStart; day <= gridEnd; day = addDays(day, 1)) cells.push(day);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-display min-w-36 text-lg font-semibold tracking-tight">{monthLabel}</h3>
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => setMonth((m) => addMonths(m, -1))} aria-label={t("previous")}>
            <ChevronLeft className="h-4 w-4 rtl:-scale-x-100" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label={t("next")}>
            <ChevronRight className="h-4 w-4 rtl:-scale-x-100" />
          </Button>
        </div>
        {toolbar ? <div className="ms-auto flex items-center gap-2">{toolbar}</div> : null}
      </div>

      {error ? <p className="text-brand-red-ink text-sm">{error.message}</p> : null}

      <div className="grid grid-cols-7 gap-1 text-center">
        {weekdays.map((w) => (
          <div key={w} className="text-muted-foreground py-1 text-[11px] font-semibold uppercase">
            {w}
          </div>
        ))}
        {cells.map((cell) => {
          const iso = format(cell, ISO);
          const day = byDate.get(iso);
          const inMonth = isSameMonth(cell, month);
          if (isPending || !day) {
            return <Skeleton key={iso} className="h-16 rounded-lg sm:h-20" />;
          }
          const style = PIPELINE_DAY_STYLES[day.status];
          const clickable = !!onDayClick && (isSelectable ? isSelectable(day) : true);
          const isSelected = selected?.has(iso);
          const firstRequest = day.requests?.[0];
          return (
            <button
              key={iso}
              type="button"
              disabled={!clickable}
              onClick={() => onDayClick?.(day)}
              title={day.reason ?? (firstRequest ? departmentName(firstRequest.department) : t(`status.${day.status}`))}
              className={`border-border flex h-16 flex-col items-start gap-0.5 overflow-hidden rounded-lg border p-1.5 text-start transition sm:h-20 ${style.cell} ${
                inMonth ? "" : "opacity-40"
              } ${clickable ? "hover:ring-primary/50 cursor-pointer hover:ring-2" : "cursor-default"} ${
                isSelected ? "ring-primary ring-2" : ""
              } ${day.date === data?.today ? "font-bold" : ""}`}
            >
              <span className="tabular text-xs">{format(cell, "d")}</span>
              {day.status === "banned" && day.reason ? (
                <span className="line-clamp-2 text-[10px] leading-tight">{day.reason}</span>
              ) : null}
              {firstRequest ? (
                <span className="line-clamp-2 text-[10px] leading-tight">
                  {departmentName(firstRequest.department)}
                  {day.requests && day.requests.length > 1 ? ` +${day.requests.length - 1}` : ""}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-1.5">
        {legend.map((status) => (
          <span key={status} className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <span className={`inline-block h-2 w-2 rounded-full ${PIPELINE_DAY_STYLES[status].dot}`} />
            {t(`status.${status}`)}
          </span>
        ))}
      </div>
      {data && onDayClick ? (
        <p className="text-muted-foreground text-xs">
          {t("firstBookable", { date: format(parseISO(data.first_bookable_date), "d MMM yyyy") })}
        </p>
      ) : null}
    </div>
  );
}
