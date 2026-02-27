"use client";

import * as React from "react";
import { format, setHours, setMinutes, isSameDay, addDays } from "date-fns";
import { CalendarIcon } from "lucide-react";
import type { DateRange } from "react-day-picker";

import { cn, isOvernightEvent } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface DateTimeRangePickerProps {
  value: {
    startDate: Date | undefined;
    endDate: Date | undefined;
  };
  onChange: (value: { startDate: Date | undefined; endDate: Date | undefined }) => void;
  disabled?: boolean;
  className?: string;
}

function TimeInput({
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
  return (
    <div className="flex flex-col gap-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="w-full"
      />
    </div>
  );
}

export function DateTimeRangePicker({
  value,
  onChange,
  disabled = false,
  className,
}: DateTimeRangePickerProps) {
  const [open, setOpen] = React.useState(false);

  // Extract time from dates
  const startTime = value.startDate
    ? format(value.startDate, "HH:mm")
    : "10:00";
  const endTime = value.endDate ? format(value.endDate, "HH:mm") : "12:00";

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
    onChange({
      ...value,
      startDate: newStartDate,
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
    if (!value.startDate) return "Select date and time";

    const startDay = format(value.startDate, "d");
    const startMonth = format(value.startDate, "MMM");
    const startTimeStr = format(value.startDate, "h:mm a");

    if (!value.endDate) {
      return `${startDay} ${startMonth}, ${startTimeStr}`;
    }

    const endDay = format(value.endDate, "d");
    const endMonth = format(value.endDate, "MMM");
    const endTimeStr = format(value.endDate, "h:mm a");

    // Check if same day or overnight event (display as single day)
    if (isSameDay(value.startDate, value.endDate) || isOvernightEvent(value.startDate, value.endDate)) {
      return `${startDay} ${startMonth}, ${startTimeStr} - ${endTimeStr}`;
    }

    // Check if same month
    if (startMonth === endMonth) {
      return `${startDay} - ${endDay} ${startMonth}, ${startTimeStr} - ${endTimeStr}`;
    }

    return `${startDay} ${startMonth} - ${endDay} ${endMonth}, ${startTimeStr} - ${endTimeStr}`;
  };

  // Compute date range for calendar (hide end date for overnight events)
  const dateRange: DateRange | undefined = value.startDate
    ? {
        from: value.startDate,
        to: value.endDate && !isOvernightEvent(value.startDate, value.endDate)
          ? value.endDate
          : undefined,
      }
    : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !value.startDate && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {getDisplayText()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-4 space-y-4">
          <Calendar
            mode="range"
            selected={dateRange}
            onSelect={handleDateRangeSelect}
            numberOfMonths={1}
            disabled={disabled}
          />
          <div className="border-t pt-4">
            <div className="grid grid-cols-2 gap-4">
              <TimeInput
                label="Start Time"
                value={startTime}
                onChange={handleStartTimeChange}
                disabled={disabled || !value.startDate}
              />
              <TimeInput
                label="End Time"
                value={endTime}
                onChange={handleEndTimeChange}
                disabled={disabled || !value.startDate}
              />
            </div>
          </div>

        </div>
      </PopoverContent>
    </Popover>
  );
}
