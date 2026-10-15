"use client";

import * as React from "react";
import { addDays, addMonths, endOfMonth, endOfWeek, format, isSameMonth, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { useLocale, useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";

import { Mortar } from "@/components/najdi";
import { useDepartmentName, useFormatDateRange } from "@/components/pipeline/shared";
import { PIPELINE_DAY_STYLES, type PipelineDayStatus } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePipelineCalendar } from "@/hooks/use-pipeline";
import { cn } from "@/lib/utils";
import type { CalendarDay } from "@/lib/pipeline-types";
import { intlLocale } from "@/lib/format";

const ISO = "yyyy-MM-dd";
const LEGEND: PipelineDayStatus[] = ["open", "locked", "held", "booked", "published", "banned"];

/**
 * A month of the booking calendar, laid as a course of bricks in mortar. Each
 * brick wears its day's state (DESIGN.md §1): sunk when it is too soon, madder
 * when Logistics closed it, ochre while a draft holds it, an indigo plate when
 * booked, a green one when its event is published. Today is ringed in ink and
 * picked days turn solid ochre.
 *
 * What a tap means (picking days to close, a range to book, opening the
 * request on a day) is the parent's business: `onDayClick`, `isSelectable`.
 * `range` marks the two ends of a picked range; `toolbar` sits at the trailing
 * end of the month header. On wide screens bricks are tall enough to name the
 * department or the closing reason.
 */
export function BookingCalendar({
  selected,
  range,
  onDayClick,
  isSelectable,
  toolbar,
  showNotes = true,
  blockActions,
  className,
}: {
  selected?: Set<string>;
  range?: { start: string | null; end: string | null };
  onDayClick?: (day: CalendarDay) => void;
  isSelectable?: (day: CalendarDay) => boolean;
  toolbar?: React.ReactNode;
  /** The first-bookable line and the list of closed days under the legend. */
  showNotes?: boolean;
  /** Buttons at the end of each closed block's line (Logistics edits or reopens it). */
  blockActions?: (block: ClosedBlock) => React.ReactNode;
  className?: string;
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
    const short = new Intl.DateTimeFormat(intlLocale(locale), { weekday: "short" });
    const narrow = new Intl.DateTimeFormat(intlLocale(locale), { weekday: "narrow" });
    return Array.from({ length: 7 }, (_, i) => ({ short: short.format(addDays(gridStart, i)), narrow: narrow.format(addDays(gridStart, i)) }));
  }, [locale, gridStart]);
  const monthLabel = new Intl.DateTimeFormat(intlLocale(locale), { month: "long", year: "numeric" }).format(month);
  const dayNumber = React.useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const longDay = React.useMemo(
    () => new Intl.DateTimeFormat(intlLocale(locale), { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }),
    [locale],
  );

  const cells: Date[] = [];
  for (let day = gridStart; day <= gridEnd; day = addDays(day, 1)) cells.push(day);

  const closed = groupBlocks((data?.days ?? []).filter((d) => d.status === "banned" && isSameMonth(parseISO(d.date), month)));

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setMonth((m) => addMonths(m, -1))} aria-label={t("previous")}>
            <ChevronLeft className="size-5 rtl:-scale-x-100" />
          </Button>
          <h3 className="font-display min-w-36 text-center text-[19px] leading-tight font-semibold" aria-live="polite">
            {monthLabel}
          </h3>
          <Button variant="ghost" size="icon" onClick={() => setMonth((m) => addMonths(m, 1))} aria-label={t("next")}>
            <ChevronRight className="size-5 rtl:-scale-x-100" />
          </Button>
        </div>
        {toolbar ? <div className="ms-auto flex flex-wrap items-center gap-2">{toolbar}</div> : null}
      </div>

      {error ? <p className="text-door-madder-ink text-sm">{error.message}</p> : null}

      <div>
        <div className="grid grid-cols-7 gap-1 px-1 pb-1" aria-hidden="true">
          {weekdays.map((w) => (
            <span key={w.short} className="text-ink-2 text-center text-xs font-bold">
              <span className="sm:hidden">{w.narrow}</span>
              <span className="max-sm:hidden">{w.short}</span>
            </span>
          ))}
        </div>
        <Mortar className="grid-cols-7">
          {cells.map((cell) => {
            const iso = format(cell, ISO);
            const day = byDate.get(iso);
            if (!isSameMonth(cell, month)) return <span key={iso} aria-hidden="true" className="h-12 sm:h-[76px]" />;
            if (isPending || !day) return <Skeleton key={iso} className="h-12 rounded-[2px] sm:h-[76px]" />;
            const clickable = !!onDayClick && (isSelectable ? isSelectable(day) : true);
            const isSelected = selected?.has(iso) ?? false;
            const isEnd = isSelected && !!range && (range.start === iso || range.end === iso);
            const first = day.requests?.[0];
            const label =
              day.status === "banned" && day.reason
                ? day.reason
                : first
                  ? `${departmentName(first.department)}${day.requests && day.requests.length > 1 ? ` +${day.requests.length - 1}` : ""}`
                  : isSelected
                    ? t("yourPick")
                    : null;
            const words = [
              longDay.format(new Date(`${iso}T00:00:00Z`)),
              t(`status.${day.status}`),
              day.reason,
              day.blocked_by ? t("closedBy", { name: day.blocked_by.name }) : null,
              first ? departmentName(first.department) : null,
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <button
                key={iso}
                type="button"
                disabled={!clickable}
                aria-pressed={onDayClick ? isSelected : undefined}
                aria-label={words}
                title={words}
                onClick={() => onDayClick?.(day)}
                className={cn(
                  "relative flex h-12 flex-col items-center justify-center rounded-[2px] text-[15px] transition-[background-color,filter,transform] duration-150 outline-none focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring sm:h-[76px] sm:items-start sm:justify-between sm:px-2 sm:pt-1.5 sm:pb-1.5",
                  "shadow-[inset_0_-2px_0_rgb(58_42_31/0.08)]",
                  PIPELINE_DAY_STYLES[day.status].cell,
                  clickable ? "cursor-pointer active:translate-y-px" : "cursor-default",
                  clickable && day.status === "open" && !isSelected && "hover:bg-door-ochre-soft",
                  clickable && (day.status === "booked" || day.status === "published") && "hover:brightness-110",
                  isSelected && "bg-door-ochre! text-on-door-ochre! shadow-[inset_0_-3px_0_rgb(0_0_0/0.18)]!",
                  day.date === data?.today && !isSelected && "shadow-[inset_0_0_0_2px_var(--foreground)]",
                )}
              >
                <b className={cn("tabular leading-none", day.status === "locked" ? "font-normal" : "font-bold", day.status === "banned" && "line-through decoration-1")}>
                  {dayNumber.format(cell.getDate())}
                </b>
                {label ? (
                  <small className="max-w-full truncate text-[11px] leading-tight font-medium max-sm:hidden"><bdi>{label}</bdi></small>
                ) : null}
                {day.status === "banned" ? (
                  <i aria-hidden="true" className="bg-door-madder absolute top-1 end-1 size-1.5 rounded-[1px] sm:hidden" />
                ) : null}
                {isEnd ? (
                  <i aria-hidden="true" className="bg-on-door-ochre absolute bottom-1.5 h-0.5 w-3.5 rounded-[1px] sm:end-2" />
                ) : null}
              </button>
            );
          })}
        </Mortar>
      </div>

      <ul className="text-ink-2 flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px]">
        {LEGEND.map((status) => (
          <li key={status} className="inline-flex items-center gap-1.5">
            <span className={cn("inline-block h-3 w-4 rounded-[1px]", PIPELINE_DAY_STYLES[status].dot)} aria-hidden="true" />
            {t(`status.${status}`)}
          </li>
        ))}
        {onDayClick && selected ? (
          <li className="inline-flex items-center gap-1.5">
            <span className="bg-door-ochre inline-block h-3 w-4 rounded-[1px]" aria-hidden="true" />
            {t("yourPick")}
          </li>
        ) : null}
      </ul>

      {showNotes && data ? (
        <div className="text-ink-2 flex flex-col gap-1 text-[13px]">
          <p className="flex items-start gap-2">
            <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {t("firstBookable", {
              date: new Intl.DateTimeFormat(intlLocale(locale), { day: "numeric", month: "long", timeZone: "UTC" }).format(
                new Date(`${data.first_bookable_date}T00:00:00Z`),
              ),
            })}
          </p>
          {closed.length ? (
            <ul className="flex flex-col gap-1.5 ps-6">
              {closed.map((block) => (
                <ClosedBlockLine key={block.id} block={block} actions={blockActions?.(block)} />
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Days Logistics closed together: the block's days (this month's), why, and who closed them. */
export interface ClosedBlock {
  id: string;
  days: string[];
  reason: string | null;
  blockedBy: string | null;
}

function groupBlocks(days: CalendarDay[]): ClosedBlock[] {
  const blocks = new Map<string, ClosedBlock>();
  for (const day of days) {
    const id = day.block_id ?? day.date;
    const block = blocks.get(id) ?? { id, days: [], reason: day.reason, blockedBy: day.blocked_by?.name ?? null };
    block.days.push(day.date);
    blocks.set(id, block);
  }
  return [...blocks.values()];
}

/** Consecutive days as one range: ["2026-03-01", "2026-03-02", "2026-03-05"] -> [[01, 02], [05, 05]]. */
function runs(days: string[]): [string, string][] {
  const out: [string, string][] = [];
  for (const day of [...days].sort()) {
    const last = out.at(-1);
    if (last && format(addDays(parseISO(last[1]), 1), ISO) === day) last[1] = day;
    else out.push([day, day]);
  }
  return out;
}

function ClosedBlockLine({ block, actions }: { block: ClosedBlock; actions?: React.ReactNode }) {
  const t = useTranslations("pipeline.calendar");
  const locale = useLocale();
  const formatRange = useFormatDateRange();
  return (
    <li className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="text-door-madder-ink tabular font-bold">
        {runs(block.days)
          .map(([start, end]) => formatRange(start, end))
          .join(locale === "ar" ? "، " : ", ")}
      </span>
      <span>
        · {block.reason ? <bdi>{block.reason}</bdi> : t("status.banned")}
        {block.blockedBy ? (
          <>
            {" · "}
            {t("closedBy", { name: block.blockedBy })}
          </>
        ) : null}
      </span>
      {actions ? <span className="ms-auto flex gap-1">{actions}</span> : null}
    </li>
  );
}
