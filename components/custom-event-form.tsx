"use client";

import * as React from "react";
import { format, setHours, setMinutes } from "date-fns";
import { CalendarIcon, Plus, Building2, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import {
  PointDetailRow,
  type PointDetailRowData,
  type MemberOption,
} from "@/components/point-detail-row";
import type { ComboboxOption } from "@/components/ui/department-combobox";
import type { CustomEventDepartment, CustomEventMember, GroupedActions, LocationType, PointRowType } from "@/lib/api-types";
import { cn, parseLocalDateTime } from "@/lib/utils";
import { useFormDirty } from "@/lib/use-form-dirty";

export interface CustomEventFormProps {
  mode: "create" | "edit";
  initialData?: CustomEventDepartment;
  initialMemberData?: CustomEventMember;
  eventNameOptions: string[];
  allEvents?: Array<{ name: string; start_datetime: string; location_type: LocationType }>;
  departmentOptions: ComboboxOption[];
  memberOptions: MemberOption[];
  actionOptions: GroupedActions;
  onSubmit: (data: CustomEventFormData) => void;
  isSubmitting: boolean;
}

export interface CustomEventFormData {
  event_name: string;
  date: Date;
  is_visible: boolean;
  point_details: PointDetailRowData[];
}

function createEmptyRow(type: PointRowType = "department"): PointDetailRowData {
  return {
    row_type: type,
    departments_id: [],
    member_ids: [],
    points: 0,
    action_id: null,
    action_name: null,
  };
}

export function CustomEventForm({
  mode,
  initialData,
  initialMemberData,
  eventNameOptions,
  allEvents = [],
  departmentOptions,
  memberOptions,
  actionOptions,
  onSubmit,
  isSubmitting,
}: CustomEventFormProps) {
  const [eventName, setEventName] = React.useState(initialData?.event_name ?? initialMemberData?.event_name ?? "");
  const [date, setDate] = React.useState<Date | undefined>(() => {
    if (mode === "create") {
      return new Date();
    }
    const initialDt = initialData?.start_datetime ?? initialMemberData?.start_datetime;
    if (initialDt) {
      return parseLocalDateTime(initialDt);
    }
    return undefined;
  });
  const [isVisible, setIsVisible] = React.useState(() => {
    if (mode === "edit" && (initialData?.event_name || initialMemberData?.event_name) && allEvents.length > 0) {
      const matchingEvent = allEvents.find((e) => e.name === (initialData?.event_name ?? initialMemberData?.event_name));
      if (matchingEvent) {
        return matchingEvent.location_type !== "hidden";
      }
    }
    return true;
  });

  const [rows, setRows] = React.useState<PointDetailRowData[]>(() => {
    const deptRows = initialData?.point_details?.map((pd) => ({
      log_id: pd.log_id,
      row_type: "department" as PointRowType,
      departments_id: pd.departments_id,
      member_ids: [],
      points: pd.points,
      action_id: pd.action_id ?? null,
      action_name: pd.action_name ?? null,
    })) ?? [];
    const memRows = initialMemberData?.point_details?.map((pd) => ({
      log_id: pd.log_id,
      row_type: "member" as PointRowType,
      departments_id: [],
      member_ids: pd.member_ids,
      points: pd.points,
      action_id: pd.action_id ?? null,
      action_name: pd.action_name ?? null,
    })) ?? [];
    const allRows = [...deptRows, ...memRows];
    return allRows.length > 0 ? allRows : [createEmptyRow("department")];
  });

  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [showTypeSelector, setShowTypeSelector] = React.useState(false);

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const initialSnapshot = React.useMemo(() => {
    if (mode === "create") return null;

    const matchingEvent = allEvents.find((e) => e.name === (initialData?.event_name ?? initialMemberData?.event_name));
    const initialVisibility = matchingEvent
      ? matchingEvent.location_type !== "hidden"
      : true;

    const deptRows = initialData?.point_details?.map((pd) => ({
      log_id: pd.log_id,
      row_type: "department" as PointRowType,
      departments_id: [...pd.departments_id].sort((a, b) => a - b),
      member_ids: [],
      points: pd.points,
      action_id: pd.action_id ?? null,
      action_name: pd.action_name ?? null,
    })) ?? [];
    const memRows = initialMemberData?.point_details?.map((pd) => ({
      log_id: pd.log_id,
      row_type: "member" as PointRowType,
      departments_id: [],
      member_ids: [...pd.member_ids].sort((a, b) => a - b),
      points: pd.points,
      action_id: pd.action_id ?? null,
      action_name: pd.action_name ?? null,
    })) ?? [];

    return {
      eventName: initialData?.event_name ?? initialMemberData?.event_name ?? "",
      date: (initialData?.start_datetime ?? initialMemberData?.start_datetime)
        ? parseLocalDateTime(initialData?.start_datetime ?? initialMemberData!.start_datetime).getTime()
        : null,
      isVisible: initialVisibility,
      rows: [...deptRows, ...memRows],
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentSnapshot = React.useMemo(
    () => ({
      eventName,
      date: date?.getTime() ?? null,
      isVisible,
      rows: rows.map((r) => ({
        log_id: r.log_id,
        row_type: r.row_type,
        departments_id: [...r.departments_id].sort((a, b) => a - b),
        member_ids: [...r.member_ids].sort((a, b) => a - b),
        points: r.points,
        action_id: r.action_id,
        action_name: r.action_name,
      })),
    }),
    [eventName, date, isVisible, rows]
  );

  const isDirty = useFormDirty(initialSnapshot, currentSnapshot);

  const handleEventNameChange = (newName: string) => {
    setEventName(newName);
    
    if (newName && allEvents.length > 0) {
      const matchingEvent = allEvents.find((e) => e.name === newName);
      if (matchingEvent) {
        if (matchingEvent.start_datetime) {
          const eventDate = parseLocalDateTime(matchingEvent.start_datetime);
          setDate(eventDate);
        }
        
        const shouldBeVisible = matchingEvent.location_type !== "hidden";
        setIsVisible(shouldBeVisible);
      }
    }
  };

  const handleRowChange = (index: number, data: PointDetailRowData) => {
    setRows((prev) => prev.map((r, i) => (i === index ? data : r)));
  };

  const handleRowRemove = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const addRow = (type: PointRowType) => {
    setRows((prev) => [...prev, createEmptyRow(type)]);
    setShowTypeSelector(false);
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

    rows.forEach((row, i) => {
      if (row.row_type === "department" && row.departments_id.length === 0) {
        newErrors[`row_${i}_entity`] = `Row ${i + 1}: Department is required`;
      }
      if (row.row_type === "member" && row.member_ids.length === 0) {
        newErrors[`row_${i}_entity`] = `Row ${i + 1}: Member is required`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate() || !date) return;

    const startDate = setMinutes(setHours(new Date(date), 10), 0);
    const endDate = setMinutes(setHours(new Date(date), 12), 0);

    onSubmit({
      event_name: eventName.trim(),
      date: startDate,
      is_visible: isVisible,
      point_details: rows,
    });
  };

  const displayDate = date ? format(date, "PPP") : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Event Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="event-name">Event Name</Label>
            <CreatableCombobox
              options={eventNameOptions}
              value={eventName}
              onChange={handleEventNameChange}
              placeholder="Select or create event..."
              searchPlaceholder="Search events..."
              emptyMessage="No matching events."
            />
            {errors.eventName && (
              <p className="text-sm text-destructive">{errors.eventName}</p>
            )}
          </div>

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

          <div className="space-y-1.5">
            <Label htmlFor="is_visible">Event Visibility</Label>
            <div className="flex items-center gap-4 rounded-lg border p-4">
              <Switch
                id="is_visible"
                checked={isVisible}
                onCheckedChange={setIsVisible}
                disabled={isSubmitting}
              />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {isVisible ? "Visible" : "Hidden"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isVisible 
                    ? "This custom event will be visible in reports" 
                    : "This custom event will be hidden from reports"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t" />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Point Details</h3>
          <div className="relative">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowTypeSelector(!showTypeSelector)}
              disabled={isSubmitting}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Row
            </Button>
            {showTypeSelector && (
              <div className="absolute right-0 mt-2 w-48 rounded-md border bg-popover shadow-lg z-10">
                <div className="p-1">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent"
                    onClick={() => addRow("department")}
                  >
                    <Building2 className="h-4 w-4" />
                    Department Row
                  </button>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent"
                    onClick={() => addRow("member")}
                  >
                    <User className="h-4 w-4" />
                    Member Row
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {errors.rows && (
          <p className="text-sm text-destructive">{errors.rows}</p>
        )}

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
              memberOptions={memberOptions}
              actionOptions={actionOptions}
              onChange={handleRowChange}
              onRemove={handleRowRemove}
              canRemove={rows.length > 1}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button type="submit" disabled={isSubmitting || !isDirty}>
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
