"use client";

import * as React from "react";
import { format, setHours, setMinutes } from "date-fns";
import { CalendarIcon, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import {
  PointDetailRow,
  type PointDetailRowData,
} from "@/components/point-detail-row";
import type { ComboboxOption } from "@/components/ui/department-combobox";
import type { CustomEventDepartment } from "@/lib/api-types";
import { cn } from "@/lib/utils";
import { parseLocalDateTime } from "@/lib/utils";

interface CustomEventFormProps {
  mode: "create" | "edit";
  initialData?: CustomEventDepartment;
  eventNameOptions: string[];
  departmentOptions: ComboboxOption[];
  actionOptions: string[];
  onSubmit: (data: CustomEventFormData) => void;
  isSubmitting: boolean;
}

export interface CustomEventFormData {
  event_name: string;
  date: Date;
  start_time: string;
  end_time: string;
  point_details: PointDetailRowData[];
}

function createEmptyRow(): PointDetailRowData {
  return {
    departments_id: [],
    points: 0,
    action_id: null,
    action_name: null,
    visible: true,
  };
}

export function CustomEventForm({
  mode,
  initialData,
  eventNameOptions,
  departmentOptions,
  actionOptions,
  onSubmit,
  isSubmitting,
}: CustomEventFormProps) {
  // Section 1: Event Info
  const [eventName, setEventName] = React.useState(
    initialData?.event_name ?? ""
  );
  const [date, setDate] = React.useState<Date | undefined>(() => {
    if (initialData?.start_datetime) {
      return parseLocalDateTime(initialData.start_datetime);
    }
    return undefined;
  });
  const [startTime, setStartTime] = React.useState(() => {
    if (initialData?.start_datetime) {
      const d = parseLocalDateTime(initialData.start_datetime);
      return format(d, "HH:mm");
    }
    return "10:00";
  });
  const [endTime, setEndTime] = React.useState(() => {
    if (initialData?.end_datetime) {
      const d = parseLocalDateTime(initialData.end_datetime);
      return format(d, "HH:mm");
    }
    return "12:00";
  });

  // Section 2: Point Details
  const [rows, setRows] = React.useState<PointDetailRowData[]>(() => {
    if (initialData?.point_details && initialData.point_details.length > 0) {
      return initialData.point_details.map((pd) => ({
        log_id: pd.log_id,
        departments_id: pd.departments_id,
        points: pd.points,
        action_id: pd.action_id ?? null,
        action_name: pd.action_name ?? null,
        visible: true,
      }));
    }
    return [createEmptyRow()];
  });

  // Calendar popover state
  const [calendarOpen, setCalendarOpen] = React.useState(false);

  // Validation errors
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const handleRowChange = (index: number, data: PointDetailRowData) => {
    setRows((prev) => prev.map((r, i) => (i === index ? data : r)));
  };

  const handleRowRemove = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const addRow = () => {
    setRows((prev) => [...prev, createEmptyRow()]);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!eventName.trim()) {
      newErrors.eventName = "Event name is required";
    }

    if (!date) {
      newErrors.date = "Date is required";
    }

    if (rows.length === 0) {
      newErrors.rows = "At least one point detail is required";
    }

    // Validate each row
    rows.forEach((row, i) => {
      if (row.departments_id.length === 0) {
        newErrors[`row_${i}_dept`] = `Row ${i + 1}: Department is required`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate() || !date) return;

    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);

    const startDate = setMinutes(setHours(new Date(date), startH), startM);
    const endDate = setMinutes(setHours(new Date(date), endH), endM);

    onSubmit({
      event_name: eventName.trim(),
      date: startDate,
      start_time: startTime,
      end_time: endTime,
      point_details: rows,
    });
  };

  const displayDate = date ? format(date, "PPP") : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Section 1: Event Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Event Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Event Name */}
          <div className="space-y-1.5 md:col-span-2">
            <Label htmlFor="event-name">Event Name</Label>
            <CreatableCombobox
              options={eventNameOptions}
              value={eventName}
              onChange={setEventName}
              placeholder="Select or create event..."
              searchPlaceholder="Search events..."
              emptyMessage="No matching events."
            />
            {errors.eventName && (
              <p className="text-sm text-destructive">{errors.eventName}</p>
            )}
          </div>

          {/* Date Picker (single day) */}
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                  disabled={isSubmitting}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {displayDate ?? "Select date..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => {
                    setDate(d ?? undefined);
                    setCalendarOpen(false);
                  }}
                  disabled={isSubmitting}
                />
              </PopoverContent>
            </Popover>
            {errors.date && (
              <p className="text-sm text-destructive">{errors.date}</p>
            )}
          </div>

          {/* Time Inputs */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Start Time</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label>End Time</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t" />

      {/* Section 2: Point Details */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Point Details</h3>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addRow}
            disabled={isSubmitting}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Row
          </Button>
        </div>

        {errors.rows && (
          <p className="text-sm text-destructive">{errors.rows}</p>
        )}

        {/* Row-level validation errors */}
        {Object.entries(errors)
          .filter(([key]) => key.startsWith("row_"))
          .map(([key, msg]) => (
            <p key={key} className="text-sm text-destructive">
              {msg}
            </p>
          ))}

        <div className="space-y-3">
          {rows.map((row, index) => (
            <PointDetailRow
              key={index}
              data={row}
              index={index}
              departmentOptions={departmentOptions}
              actionOptions={actionOptions}
              onChange={handleRowChange}
              onRemove={handleRowRemove}
              canRemove={rows.length > 1}
            />
          ))}
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? mode === "create"
              ? "Creating..."
              : "Saving..."
            : mode === "create"
              ? "Create Custom Event"
              : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
