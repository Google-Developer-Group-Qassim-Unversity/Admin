"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { setHours, setMinutes } from "date-fns";
import { CalendarIcon, Eye, EyeOff, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
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
import type { CustomEventDepartment, CustomEventMember, GroupedActions, LocationType, Member, PointRowType } from "@/lib/api-types";
import { cn, parseLocalDateTime } from "@/lib/utils";
import { useFormDirty } from "@/lib/use-form-dirty";
import { useAccess } from "@/hooks/use-access";
import { FormActions } from "@/components/form-actions";
import { SectionHead } from "@/components/najdi";
import { intlLocale } from "@/lib/format";

export interface CustomEventFormProps {
  mode: "create" | "edit";
  initialData?: CustomEventDepartment;
  initialMemberData?: CustomEventMember;
  eventNameOptions?: string[];
  allEvents?: Array<{ name: string; start_datetime: string; location_type: LocationType }>;
  departmentOptions: ComboboxOption[];
  memberOptions: MemberOption[];
  actionOptions: GroupedActions;
  onSubmit: (data: CustomEventFormData) => void;
  isSubmitting: boolean;
  useSimpleInput?: boolean;
  isFullEvent?: boolean;
  onMemberCreated?: (member: Member) => void;
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
  eventNameOptions = [],
  allEvents = [],
  departmentOptions,
  memberOptions,
  actionOptions,
  onSubmit,
  isSubmitting,
  useSimpleInput = false,
  isFullEvent = false,
  onMemberCreated,
}: CustomEventFormProps) {
  const t = useTranslations("customEventForm");
  const locale = useLocale();
  const tc = useTranslations("common.states");
  const { isSuperAdmin } = useAccess();
  // Only super admins give points outside the point actions.
  const isRestrictedMode = !isSuperAdmin;

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
    
    if (!useSimpleInput && newName && allEvents.length > 0) {
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
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!eventName.trim()) {
      newErrors.eventName = t("eventNameRequired");
    }

    if (!date) {
      newErrors.date = t("dateRequired");
    }

    if (rows.length === 0) {
      newErrors.rows = t("rowsRequired");
    }

    rows.forEach((row, i) => {
      if (row.row_type === "department" && row.departments_id.length === 0) {
        newErrors[`row_${i}_entity`] = t("rowDepartmentRequired", { number: i + 1 });
      }
      if (row.row_type === "member" && row.member_ids.length === 0) {
        newErrors[`row_${i}_entity`] = t("rowMemberRequired", { number: i + 1 });
      }
      if (isRestrictedMode && row.action_id === null) {
        newErrors[`row_${i}_action`] = t("rowActionRequired", { number: i + 1 });
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate() || !date) return;

    const startDate = setMinutes(setHours(new Date(date), 10), 0);

    onSubmit({
      event_name: eventName.trim(),
      date: startDate,
      is_visible: isVisible,
      point_details: rows,
    });
  };

  // The date in the reader's language (date-fns' "PPP" was always English).
  const displayDate = date
    ? date.toLocaleDateString(intlLocale(locale), { weekday: "short", day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-8">
      <section className="flex flex-col gap-4">
        <SectionHead title={t("eventInformation")} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="event-name">{t("eventName")}</Label>
            {useSimpleInput ? (
              <Input
                id="event-name"
                value={eventName}
                onChange={(e) => handleEventNameChange(e.target.value)}
                placeholder={t("eventNamePlaceholder")}
                disabled={isSubmitting || isFullEvent}
                dir="auto"
                autoComplete="off"
                enterKeyHint="next"
              />
            ) : (
              <CreatableCombobox
                options={eventNameOptions}
                value={eventName}
                onChange={handleEventNameChange}
                placeholder={t("selectOrCreateEvent")}
                searchPlaceholder={t("searchEvents")}
                emptyMessage={t("noMatchingEvents")}
                disabled={isFullEvent}
              />
            )}
            {errors.eventName && (
              <p className="text-door-madder-ink text-sm font-medium">{errors.eventName}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>{t("date")}</Label>
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "bg-card w-full justify-start text-start font-medium shadow-[inset_0_0_0_1px_var(--input)]",
                    !date && "text-ink-3"
                  )}
                  disabled={isSubmitting || isFullEvent}
                >
                  <CalendarIcon className="text-ink-2" />
                  {displayDate ?? t("selectDate")}
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
                  disabled={isSubmitting || isFullEvent}
                />
              </PopoverContent>
            </Popover>
            {errors.date && (
              <p className="text-door-madder-ink text-sm font-medium">{errors.date}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="is_visible">{t("eventVisibility")}</Label>
            <label
              htmlFor="is_visible"
              className="bg-card ring-rule has-[:focus-visible]:ring-ring flex min-h-14 cursor-pointer items-center gap-3 rounded-lg p-3 ring-1 transition-colors hover:ring-adobe"
            >
              <Switch
                id="is_visible"
                checked={isVisible}
                onCheckedChange={setIsVisible}
                disabled={isSubmitting || isFullEvent}
              />
              <div className="flex-1">
                <p className={cn("flex items-center gap-1.5 text-sm font-bold", isVisible ? "text-door-indigo-ink" : "text-door-umber-ink")}>
                  {isVisible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                  {isVisible ? t("visible") : t("hidden")}
                </p>
                <p className="text-ink-2 text-[13px]">
                  {isVisible
                    ? t("visibleHint")
                    : t("hiddenHint")}
                </p>
              </div>
            </label>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <SectionHead title={t("pointDetails")} count={rows.length} />

        {errors.rows && (
          <p className="text-door-madder-ink text-sm font-medium">{errors.rows}</p>
        )}

        {Object.entries(errors)
          .filter(([key]) => key.startsWith("row_"))
          .map(([key, msg]) => (
            <p key={key} className="text-door-madder-ink text-sm font-medium">
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
              onMemberCreated={onMemberCreated}
            />
          ))}
        </div>

        {/* Adding a row sits under the rows, where the thumb already is. */}
        <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            className="border-adobe border-dashed"
            onClick={() => addRow("department")}
            disabled={isSubmitting}
          >
            <Plus className="h-4 w-4" />
            <span className="truncate">{t("departmentRow")}</span>
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="border-adobe border-dashed"
            onClick={() => addRow("member")}
            disabled={isSubmitting}
          >
            <Plus className="h-4 w-4" />
            <span className="truncate">{t("memberRow")}</span>
          </Button>
        </div>
      </section>

      <FormActions>
        <Button type="submit" disabled={isSubmitting || (mode === "edit" && !isDirty)}>
          {isSubmitting
            ? mode === "create"
              ? tc("creating")
              : tc("saving")
            : mode === "create"
              ? t("createCustomEvent")
              : t("saveChanges")}
        </Button>
      </FormActions>
    </form>
  );
}
