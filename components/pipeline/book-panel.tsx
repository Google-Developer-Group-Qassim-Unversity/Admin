"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { useTranslations } from "next-intl";
import { CalendarPlus, X } from "lucide-react";
import { toast } from "sonner";

import { BookingCalendar } from "@/components/pipeline/booking-calendar";
import { useDepartmentName, useFormatDateRange } from "@/components/pipeline/shared";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export function BookPanel({ me, onDone }: { me: PipelineMe; onDone: () => void }) {
  const t = useTranslations("pipeline.book");
  const router = useRouter();
  const departmentName = useDepartmentName();
  const formatRange = useFormatDateRange();
  const range = useRangePicker(me.is_super_admin ? null : MAX_BOOKING_DAYS);
  const [departmentId, setDepartmentId] = React.useState<string>(
    me.departments.length === 1 ? String(me.departments[0].id) : "",
  );
  const book = useBookRequest();

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

  const cancel = (
    <Button variant="ghost" size="sm" onClick={onDone}>
      <X className="h-4 w-4" />
      {t("cancel")}
    </Button>
  );

  return (
    <div className="flex flex-col gap-4">
      <BookingCalendar
        selected={range.selected}
        onDayClick={range.onDayClick}
        isSelectable={isSelectable}
        toolbar={cancel}
      />
      {/* On a phone the bar follows the thumb, just above the tab bar. */}
      <div className="bg-card border-border flex flex-col gap-3 rounded-xl border p-3 shadow-sm sm:flex-row sm:items-center max-sm:sticky max-sm:bottom-[calc(4.5rem+env(safe-area-inset-bottom))] max-sm:shadow-lg">
        <span className={`min-w-0 flex-1 text-sm ${range.start ? "tabular font-semibold" : "text-muted-foreground"}`}>
          {range.start
            ? formatRange(range.start, range.end)
            : t(me.is_super_admin ? "hintSuperAdmin" : "hint", { max: MAX_BOOKING_DAYS })}
        </span>
        {/* One department is the answer already; only ask when there is a choice. */}
        {me.departments.length > 1 ? (
          <Select value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger className="sm:w-56">
              <SelectValue placeholder={t("pickDepartment")} />
            </SelectTrigger>
            <SelectContent>
              {me.departments.map((d) => (
                <SelectItem key={d.id} value={String(d.id)}>
                  {departmentName(d)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
        <Button onClick={onBook} disabled={!range.start || !departmentId || book.isPending}>
          <CalendarPlus className="h-4 w-4" />
          {t("book")}
        </Button>
      </div>
    </div>
  );
}
