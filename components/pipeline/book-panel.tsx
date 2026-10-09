"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { useTranslations } from "next-intl";
import { CalendarCheck, X } from "lucide-react";
import { toast } from "sonner";

import { BookingCalendar } from "@/components/pipeline/booking-calendar";
import { useDepartmentName, useFormatDateRange } from "@/components/pipeline/shared";
import { Button } from "@/components/ui/button";
import { useBookRequest } from "@/hooks/use-pipeline";
import type { CalendarDay, PipelineMe } from "@/lib/pipeline-types";

export const MAX_BOOKING_DAYS = 4;

/** Picks a date range on the calendar: the first click starts it, the second ends it. */
export function useRangePicker(maxDays: number | null) {
  const [start, setStart] = React.useState<string | null>(null);
  const [end, setEnd] = React.useState<string | null>(null);

  const onDayClick = (day: CalendarDay) => {
    if (!start || end) {
      setStart(day.date);
      setEnd(null);
      return;
    }
    const length = differenceInCalendarDays(parseISO(day.date), parseISO(start)) + 1;
    if (length < 1 || (maxDays !== null && length > maxDays)) {
      setStart(day.date);
      return;
    }
    setEnd(day.date);
  };

  const selected = React.useMemo(() => {
    const days = new Set<string>();
    if (!start) return days;
    const last = end ?? start;
    for (let d = parseISO(start); format(d, "yyyy-MM-dd") <= last; d = addDays(d, 1)) days.add(format(d, "yyyy-MM-dd"));
    return days;
  }, [start, end]);

  const reset = () => {
    setStart(null);
    setEnd(null);
  };

  return { start, end: end ?? start, selected, onDayClick, reset };
}

/** "2 days" in the reader's language. */
function useDayCount() {
  const t = useTranslations("pipeline.book");
  return (start: string, end: string) => t("days", { count: differenceInCalendarDays(parseISO(end), parseISO(start)) + 1 });
}

/**
 * Booking mode: tap the first day and the last, say which department, book.
 * The days are held for 24 hours while the request is filled in. On a phone the
 * summary and the ochre Book button ride in a bar above the bottom navigation.
 */
export function BookPanel({ me, onDone, ownIds }: { me: PipelineMe; onDone: () => void; ownIds?: Set<number> }) {
  const t = useTranslations("pipeline.book");
  const router = useRouter();
  const departmentName = useDepartmentName();
  const formatRange = useFormatDateRange();
  const dayCount = useDayCount();
  const range = useRangePicker(me.is_super_admin ? null : MAX_BOOKING_DAYS);
  // The caller's own department first; a super admin can still pick any.
  const ordered = React.useMemo(
    () => [...me.departments].sort((a, b) => Number(ownIds?.has(b.id) ?? 0) - Number(ownIds?.has(a.id) ?? 0)),
    [me.departments, ownIds],
  );
  const [departmentId, setDepartmentId] = React.useState<string>(() =>
    ordered.length === 1 || (ownIds && ordered[0] && ownIds.has(ordered[0].id)) ? String(ordered[0].id) : "",
  );
  const book = useBookRequest();
  const chosen = me.departments.find((d) => String(d.id) === departmentId);

  // Super admins can book any day; everyone else only open ones.
  const isSelectable = (day: CalendarDay) => me.is_super_admin || day.status === "open";

  const onBook = async () => {
    if (!range.start || !range.end || !departmentId) return;
    try {
      const request = await book.mutateAsync({ departmentId: Number(departmentId), start: range.start, end: range.end });
      toast.success(t("booked"));
      router.push(`/pipeline/requests/${request.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("failed"));
    }
  };

  return (
    <div className="flex flex-col gap-5 max-md:pb-28">
      <p className="text-ink-2 text-sm text-pretty">{t(me.is_super_admin ? "hintSuperAdmin" : "hint", { max: MAX_BOOKING_DAYS })}</p>
      <BookingCalendar
        selected={range.selected}
        range={{ start: range.start, end: range.end }}
        onDayClick={range.onDayClick}
        isSelectable={isSelectable}
        toolbar={
          <Button variant="ghost" size="sm" onClick={onDone}>
            <X />
            {t("cancel")}
          </Button>
        }
      />

      {/* One department is the answer already; only ask when there is a choice. */}
      {ordered.length > 1 ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="border-foreground mb-2 w-full border-b pb-2 text-base font-bold">{t("pickDepartment")}</legend>
          <div role="radiogroup" aria-label={t("pickDepartment")} className="flex flex-wrap gap-2">
            {ordered.map((d) => {
              const on = String(d.id) === departmentId;
              return (
                <button
                  key={d.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setDepartmentId(String(d.id))}
                  className={`inline-flex min-h-11 items-center rounded-lg px-3.5 text-sm font-bold transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                    on ? "bg-foreground text-background" : "bg-card text-foreground shadow-[inset_0_0_0_1px_var(--rule)] hover:shadow-[inset_0_0_0_1px_var(--adobe)]"
                  }`}
                >
                  {departmentName(d)}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <div className="bg-card border-foreground flex items-center gap-3 border-t px-4 pt-3 pb-3 max-md:fixed max-md:inset-x-0 max-md:bottom-[calc(4rem+env(safe-area-inset-bottom))] max-md:z-30 md:rounded-xl md:border-0 md:ring-1 md:ring-rule">
        <div className="flex min-w-0 flex-1 flex-col leading-snug">
          {range.start && range.end ? (
            <>
              <b className="tabular text-[17px] font-bold">{formatRange(range.start, range.end)}</b>
              <span className="text-ink-2 truncate text-[13px]">
                {dayCount(range.start, range.end)}
                {chosen ? ` · ${departmentName(chosen)}` : ""} · {t("heldFor")}
              </span>
            </>
          ) : (
            <span className="text-ink-2 text-sm">{t("pickDays")}</span>
          )}
        </div>
        <Button variant="ochre" size="lg" className="min-w-32" onClick={onBook} disabled={!range.start || !departmentId || book.isPending}>
          <CalendarCheck />
          {t("book")}
        </Button>
      </div>
    </div>
  );
}
