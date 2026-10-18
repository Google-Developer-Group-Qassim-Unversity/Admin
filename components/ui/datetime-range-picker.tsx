"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  format,
  setHours,
  setMinutes,
  isSameDay,
  addDays,
  startOfDay,
  addMinutes,
} from "date-fns";
import { ar, enGB } from "date-fns/locale";
import { CalendarIcon, ClockIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { cn, getEffectiveEndDate, getEventDayCount } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DateTimeRangePickerProps {
  value: {
    startDate: Date | undefined;
    endDate: Date | undefined;
  };
  onChange: (value: { startDate: Date | undefined; endDate: Date | undefined }) => void;
  disabled?: boolean;
  className?: string;
}

/** Time a freshly picked day starts at, before the user touches anything. */
const DEFAULT_START_TIME = "10:00";
/** An event that has no end yet runs for an hour. */
const DEFAULT_DURATION_MINUTES = 60;
/** Granularity of the time dropdown. */
const TIME_STEP_MINUTES = 15;
const MS_PER_MINUTE = 60_000;

/**
 * Every step of the day as "HH:mm", plus `current` when it falls between steps
 * so an event saved at 10:07 still shows its own time instead of snapping.
 */
function buildTimeOptions(current: string): string[] {
  const options: string[] = [];
  for (let minutes = 0; minutes < 24 * 60; minutes += TIME_STEP_MINUTES) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    options.push(
      `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`
    );
  }

  if (!options.includes(current)) {
    options.push(current);
    options.sort();
  }

  return options;
}

/** "10:00" + 60 -> "11:00", wrapping at midnight. */
function shiftTime(time: string, minutes: number): string {
  const [hours, mins] = time.split(":").map(Number);
  const shifted = addMinutes(
    setMinutes(setHours(startOfDay(new Date()), hours), mins),
    minutes
  );
  return format(shifted, "HH:mm");
}

/** date-fns locale for the reader's language: Arabic or English month and AM/PM words, Western digits. */
function useDateFnsLocale() {
  return useLocale() === "ar" ? ar : enGB;
}

/** "14:30" -> "2:30 PM" / "2:30 م", matching the format used in the trigger label. */
function formatTimeLabel(time: string, locale: typeof enGB): string {
  const [hours, mins] = time.split(":").map(Number);
  return format(setMinutes(setHours(new Date(), hours), mins), "h:mm a", { locale });
}

function TimeSelect({
  value,
  onChange,
  label,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  disabled?: boolean;
}) {
  const options = React.useMemo(() => buildTimeOptions(value), [value]);
  const dateLocale = useDateFnsLocale();

  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs font-normal text-ink-2">{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="w-full justify-between font-medium tabular-nums">
          <span className="flex items-center gap-2">
            <ClockIcon className="size-3.5 shrink-0 text-ink-2" />
            {/* The label is always Latin ("10:00 AM"), so keep it LTR in Arabic. */}
            <span dir="ltr">
              <SelectValue />
            </span>
          </span>
        </SelectTrigger>
        <SelectContent
          className="max-h-60"
          // Match the trigger instead of the wider default, so the list does
          // not hang off the side of the field it belongs to.
          style={{ minWidth: "var(--radix-select-trigger-width)" }}
        >
          {options.map((option) => (
            <SelectItem key={option} value={option} className="tabular-nums">
              <span dir="ltr">{formatTimeLabel(option, dateLocale)}</span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function DateTimeRangePicker({
  value,
  onChange,
  disabled = false,
  className,
}: DateTimeRangePickerProps) {
  const t = useTranslations("dateTimeRangePicker");
  const dateLocale = useDateFnsLocale();
  const [open, setOpen] = React.useState(false);

  // Extract time from dates
  const startTime = value.startDate
    ? format(value.startDate, "HH:mm")
    : DEFAULT_START_TIME;
  // Without an end yet, the picker offers the start plus the default duration.
  const endTime = value.endDate
    ? format(value.endDate, "HH:mm")
    : shiftTime(startTime, DEFAULT_DURATION_MINUTES);

  // Handle date range selection
  const handleDateRangeSelect = (range: DateRange | undefined) => {
    if (!range) {
      onChange({ startDate: undefined, endDate: undefined });
      return;
    }

    // Parse existing times
    const [startHours, startMins] = startTime.split(":").map(Number);
    const [endHours, endMins] = endTime.split(":").map(Number);

    // Apply times to new dates
    let newStartDate = range.from;
    let newEndDate = range.to;

    if (newStartDate) {
      newStartDate = setMinutes(setHours(newStartDate, startHours), startMins);
    }

    if (newEndDate) {
      newEndDate = setMinutes(setHours(newEndDate, endHours), endMins);
    } else if (newStartDate) {
      // If only start date is selected (single day), use same date for end
      newEndDate = setMinutes(setHours(new Date(newStartDate), endHours), endMins);
    }

    // A same-day end that lands before the start is an overnight event.
    if (
      newStartDate &&
      newEndDate &&
      isSameDay(newStartDate, newEndDate) &&
      newEndDate.getTime() <= newStartDate.getTime()
    ) {
      newEndDate = addDays(newEndDate, 1);
    }

    onChange({
      startDate: newStartDate,
      endDate: newEndDate,
    });
  };

  // Handle start time change
  const handleStartTimeChange = (time: string) => {
    if (!value.startDate) return;

    const [hours, mins] = time.split(":").map(Number);
    const newStartDate = setMinutes(setHours(value.startDate, hours), mins);

    // Drag the end along so the event keeps its length - a one-hour event that
    // moves from 10:00 to 14:00 ends at 15:00, not at the old 11:00.
    const currentDuration = value.endDate
      ? value.endDate.getTime() - value.startDate.getTime()
      : 0;
    const durationMs =
      currentDuration > 0
        ? currentDuration
        : DEFAULT_DURATION_MINUTES * MS_PER_MINUTE;

    onChange({
      startDate: newStartDate,
      endDate: new Date(newStartDate.getTime() + durationMs),
    });
  };

  // Handle end time change
  const handleEndTimeChange = (time: string) => {
    const [hours, mins] = time.split(":").map(Number);
    const dateToUse = value.endDate || value.startDate;

    if (!dateToUse || !value.startDate) return;

    let newEndDate = setMinutes(setHours(dateToUse, hours), mins);

    // Auto-adjust for overnight events: if same day and end time < start time,
    // move end date to next day
    if (isSameDay(value.startDate, newEndDate)) {
      const endMinutes = hours * 60 + mins;
      const startMinutes = value.startDate.getHours() * 60 + value.startDate.getMinutes();

      if (endMinutes < startMinutes) {
        newEndDate = addDays(newEndDate, 1);
      }
    }

    onChange({
      ...value,
      endDate: newEndDate,
    });
  };

  // Format display string
  const getDisplayText = () => {
    if (!value.startDate) return t("selectDateTime");

    const startDay = format(value.startDate, "d", { locale: dateLocale });
    const startMonth = format(value.startDate, "MMM", { locale: dateLocale });
    const startTimeStr = format(value.startDate, "h:mm a", { locale: dateLocale });

    if (!value.endDate) {
      return `${startDay} ${startMonth}, ${startTimeStr}`;
    }

    const dayCount = getEventDayCount(value.startDate, value.endDate);
    const effectiveEnd = getEffectiveEndDate(value.startDate, value.endDate);
    const endDay = format(effectiveEnd, "d", { locale: dateLocale });
    const endMonth = format(effectiveEnd, "MMM", { locale: dateLocale });
    const endTimeStr = format(value.endDate, "h:mm a", { locale: dateLocale });

    // Single day event (same day or overnight < 24 hours)
    if (dayCount === 1) {
      return `${startDay} ${startMonth}, ${startTimeStr} - ${endTimeStr}`;
    }

    // Multi-day event - use effective end date for display
    if (startMonth === endMonth) {
      return `${startDay} - ${endDay} ${startMonth}, ${startTimeStr} - ${endTimeStr}`;
    }

    return `${startDay} ${startMonth} - ${endDay} ${endMonth}, ${startTimeStr} - ${endTimeStr}`;
  };

  // Compute date range for calendar (use effective end date for highlighting)
  const dateRange: DateRange | undefined = value.startDate && value.endDate
    ? {
        from: value.startDate,
        to: getEffectiveEndDate(value.startDate, value.endDate),
      }
    : value.startDate
    ? {
        from: value.startDate,
        to: undefined,
      }
    : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-start font-normal",
            !value.startDate && "text-ink-2",
            className
          )}
        >
          <CalendarIcon className="me-2 h-4 w-4 shrink-0" />
          {/* The summary is in the reader's language ("10 Sep, 10:00 AM" / "10 سبتمبر، 10:00 ص"); dir="auto"
              keeps its parts in order inside the button. */}
          <span dir="auto" className="tabular min-w-0 truncate">
            {getDisplayText()}
          </span>
        </Button>
      </PopoverTrigger>
      {/* Phone: as wide as the field (never wider than the screen) with
          36px day cells for a thumb, and it scrolls rather than running off
          the screen when the field sits mid-page; sm+: the compact popover. */}
      <PopoverContent
        className="max-h-(--radix-popover-content-available-height) w-(--radix-popover-trigger-width) max-w-[calc(100vw-2rem)] overflow-y-auto overscroll-contain p-0 sm:w-auto sm:max-w-none"
        align="start"
        collisionPadding={16}
      >
        {/* The time row below is wider than a default calendar, so the calendar
            stretches to match instead of leaving a gap beside the grid. */}
        <Calendar
          mode="range"
          selected={dateRange}
          onSelect={handleDateRangeSelect}
          numberOfMonths={1}
          disabled={disabled}
          className="w-full p-3 max-sm:[--cell-size:--spacing(9)]"
          classNames={{ root: "w-full" }}
        />
        <div className="grid grid-cols-2 gap-3 border-t p-3">
          <TimeSelect
            label={t("startTime")}
            value={startTime}
            onChange={handleStartTimeChange}
            disabled={disabled || !value.startDate}
          />
          <TimeSelect
            label={t("endTime")}
            value={endTime}
            onChange={handleEndTimeChange}
            disabled={disabled || !value.startDate}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
