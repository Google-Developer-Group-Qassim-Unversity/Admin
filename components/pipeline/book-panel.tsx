"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { useTranslations } from "next-intl";
import { CalendarCheck, X } from "lucide-react";
import { toast } from "sonner";

import { BookingCalendar } from "@/components/pipeline/booking-calendar";
import { useBookOver } from "@/components/pipeline/override-dialog";
import { BehalfNote } from "@/components/pipeline/roles";
import { isBookable, useDepartmentName, useFormatDateRange } from "@/components/pipeline/shared";
import { Button } from "@/components/ui/button";
import { useBookRequest } from "@/hooks/use-pipeline";
import { isolate } from "@/lib/format";
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
export function BookPanel({ me, onDone, ownIds }: { me: PipelineMe; onDone: () => void; ownIds?: ReadonlySet<number> }) {
  const t = useTranslations("pipeline.book");
  const router = useRouter();
  const departmentName = useDepartmentName();
  const formatRange = useFormatDateRange();
  const dayCount = useDayCount();
  const range = useRangePicker(MAX_BOOKING_DAYS);
  // The caller's own departments; a super admin can also book for any other, on its behalf.
  const own = React.useMemo(
    () => me.departments.filter((d) => !ownIds || ownIds.has(d.id)),
    [me.departments, ownIds],
  );
  const others = React.useMemo(
    () => (me.is_super_admin ? me.departments.filter((d) => !own.includes(d)) : []),
    [me.departments, me.is_super_admin, own],
  );
  const ordered = React.useMemo(() => [...own, ...others], [own, others]);
  // Start on the caller's own department; someone else's is always a deliberate pick.
  const [departmentId, setDepartmentId] = React.useState<string>(() => (own[0] ? String(own[0].id) : ""));
  const book = useBookRequest();
  const bookOver = useBookOver(me);
  const chosen = me.departments.find((d) => String(d.id) === departmentId);

  const isSelectable = (day: CalendarDay) => isBookable(day, me);

  const onBook = async () => {
    if (!range.start || !range.end || !departmentId) return;
    const [start, end] = [range.start, range.end];
    try {
      await bookOver.guard(start, end, undefined, async (bumps) => {
        try {
          const request = await book.mutateAsync({ departmentId: Number(departmentId), start, end, bumps });
          toast.success(t("booked"));
          router.push(`/pipeline/requests/${request.id}`);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : t("failed"));
        }
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("failed"));
    }
  };

  return (
    <div className="flex flex-col gap-5 max-md:pb-28">
      {bookOver.dialog}
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
        <fieldset className="flex flex-col gap-3">
          <legend className="border-foreground mb-2 w-full border-b pb-2 text-base font-bold">{t("pickDepartment")}</legend>
          {own.length ? (
            <DepartmentChoices
              label={others.length ? t("yourDepartments") : undefined}
              departments={own}
              value={departmentId}
              onChange={setDepartmentId}
            />
          ) : null}
          {others.length ? (
            <DepartmentChoices
              label={t("otherDepartments")}
              departments={others}
              value={departmentId}
              onChange={setDepartmentId}
            />
          ) : null}
          {chosen && others.includes(chosen) ? (
            <BehalfNote>{t("onBehalf", { name: isolate(departmentName(chosen)) })}</BehalfNote>
          ) : null}
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

function DepartmentChoices({
  label,
  departments,
  value,
  onChange,
}: {
  label?: string;
  departments: PipelineMe["departments"];
  value: string;
  onChange: (id: string) => void;
}) {
  const departmentName = useDepartmentName();
  return (
    <div className="flex flex-col gap-2">
      {label ? <span className="text-ink-2 text-[12.5px] font-bold">{label}</span> : null}
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {departments.map((d) => {
          const on = String(d.id) === value;
          return (
            <button
              key={d.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(String(d.id))}
              className={`inline-flex min-h-11 items-center rounded-lg px-3.5 text-sm font-bold transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                on ? "bg-foreground text-background" : "bg-card text-foreground shadow-[inset_0_0_0_1px_var(--rule)] hover:shadow-[inset_0_0_0_1px_var(--adobe)]"
              }`}
            >
              <bdi>{departmentName(d)}</bdi>
            </button>
          );
        })}
      </div>
    </div>
  );
}
