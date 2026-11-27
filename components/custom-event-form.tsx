"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { setHours, setMinutes } from "date-fns";
import { CalendarIcon, Eye, EyeOff, Plus, Trash2 } from "lucide-react";

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
import {
  PointDetailRow,
  type PointDetailRowData,
  type MemberOption,
} from "@/components/point-detail-row";
import type { ComboboxOption } from "@/components/ui/department-combobox";
import type { BonusDetail, BonusGrant, EventBonusDetail, GroupedActions, Member, PointRowType } from "@/lib/api-types";
import { cn, parseLocalDateTime } from "@/lib/utils";
import { useFormDirty } from "@/lib/use-form-dirty";
import { useAccess } from "@/hooks/use-access";
import { FormActions } from "@/components/form-actions";
import { SectionHead } from "@/components/najdi";
import { intlLocale } from "@/lib/format";

export interface CustomEventFormProps {
  mode: "create" | "edit";
  initialBonus?: BonusDetail;
  initialEventBonus?: EventBonusDetail;
  departmentOptions: ComboboxOption[];
  memberOptions: MemberOption[];
  actionOptions: GroupedActions;
  onSubmit: (data: CustomEventFormData) => void;
  onDelete?: () => void;
  isDeleting?: boolean;
  isSubmitting: boolean;
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
    label_ar: null,
  };
}

function grantToRow(grant: BonusGrant): PointDetailRowData {
  return {
    grant_id: grant.id,
    row_type: grant.recipient_type,
    departments_id: grant.department_ids,
    member_ids: grant.member_ids,
    points: grant.points,
    action_id: grant.source_action_id ?? null,
    action_name: grant.label_en ?? grant.label_ar ?? null,
    label_ar: grant.label_ar ?? null,
  };
}

export function CustomEventForm({
  mode,
  initialBonus,
  initialEventBonus,
  departmentOptions,
  memberOptions,
  actionOptions,
  onSubmit,
  onDelete,
  isDeleting = false,
  isSubmitting,
  isFullEvent = false,
  onMemberCreated,
}: CustomEventFormProps) {
  const t = useTranslations("customEventForm");
  const locale = useLocale();
  const tc = useTranslations("common.states");
  const { isSuperAdmin } = useAccess();
  // Only super admins give points outside the point actions.
  const isRestrictedMode = !isSuperAdmin;

  const initialTitle = initialBonus?.title ?? initialEventBonus?.event_name ?? "";
  const initialDateStr = initialBonus?.given_at ?? initialEventBonus?.start_datetime ?? null;
  const initialGrants = initialBonus?.grants ?? initialEventBonus?.grants ?? [];
  const initialIsPublic = initialBonus ? initialBonus.is_public : true;

  const [eventName, setEventName] = React.useState(initialTitle);
  const [date, setDate] = React.useState<Date | undefined>(() => {
    if (mode === "create") {
      return new Date();
    }
    if (initialDateStr) {
      return parseLocalDateTime(initialDateStr);
    }
    return undefined;
  });
  const [isVisible, setIsVisible] = React.useState(initialIsPublic);

  const [rows, setRows] = React.useState<PointDetailRowData[]>(() => {
    const mapped = initialGrants.map(grantToRow);
    if (mapped.length > 0) return mapped;
    return isFullEvent ? [] : [createEmptyRow("department")];
  });

  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const initialSnapshot = React.useMemo(() => {
    if (mode === "create") return null;
    const mapped = initialGrants.map((g) => ({
      grant_id: g.id,
      row_type: g.recipient_type,
      departments_id: [...g.department_ids].sort((a, b) => a - b),
      member_ids: [...g.member_ids].sort((a, b) => a - b),
      points: g.points,
      action_id: g.source_action_id ?? null,
      action_name: g.label_en ?? g.label_ar ?? null,
    }));
    return {
      eventName: initialTitle,
      date: initialDateStr ? parseLocalDateTime(initialDateStr).getTime() : null,
      isVisible: initialIsPublic,
      rows: mapped,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentSnapshot = React.useMemo(
    () => ({
      eventName,
      date: date?.getTime() ?? null,
      isVisible,
      rows: rows.map((r) => ({
        grant_id: r.grant_id,
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

    if (!isFullEvent && !eventName.trim()) {
      newErrors.eventName = t("eventNameRequired");
    }

    if (!isFullEvent && !date) {
      newErrors.date = t("dateRequired");
    }

    if (!isFullEvent && rows.length === 0) {
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

    if (!validate()) return;
    const effectiveDate = date ?? new Date();
    const startDate = setMinutes(setHours(new Date(effectiveDate), 10), 0);

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
      <section className="panel flex min-w-0 flex-col gap-4">
        <SectionHead title={t("eventInformation")} />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="event-name">{t("eventName")}</Label>
            <Input
              id="event-name"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder={t("eventNamePlaceholder")}
              disabled={isSubmitting || isFullEvent}
              dir="auto"
              autoComplete="off"
              enterKeyHint="next"
            />
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

          {!isFullEvent && (
            <div className="space-y-1.5">
              <Label htmlFor="is_visible">{t("eventVisibility")}</Label>
              <label
                htmlFor="is_visible"
                className="bg-sunk ring-rule has-[:focus-visible]:ring-ring flex min-h-14 cursor-pointer items-center gap-3 rounded-lg p-3 ring-1 transition-colors hover:ring-adobe"
              >
                <Switch
                  id="is_visible"
                  checked={isVisible}
                  onCheckedChange={setIsVisible}
                  disabled={isSubmitting}
                />
                <div className="flex-1">
                  <p className={cn("flex items-center gap-1.5 text-sm font-bold", isVisible ? "text-door-indigo-ink" : "text-door-umber-ink")}>
                    {isVisible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                    {isVisible ? t("visible") : t("hidden")}
                  </p>
                  <p className="text-ink-2 text-[13px]">
                    {isVisible ? t("visibleHint") : t("hiddenHint")}
                  </p>
                </div>
              </label>
            </div>
          )}
        </div>
      </section>

      <section className="flex min-w-0 flex-col gap-4">
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
              key={row.grant_id ?? `new-${index}`}
              data={row}
              index={index}
              departmentOptions={departmentOptions}
              memberOptions={memberOptions}
              actionOptions={actionOptions}
              onChange={handleRowChange}
              onRemove={handleRowRemove}
              canRemove={isFullEvent || rows.length > 1}
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
        {onDelete && !isFullEvent ? (
          <Button
            type="button"
            variant="ghost"
            className="text-door-madder-ink hover:bg-door-madder-soft me-auto"
            onClick={onDelete}
            disabled={isSubmitting || isDeleting}
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? tc("deleting") : tc("delete")}
          </Button>
        ) : null}
        <Button type="submit" disabled={isSubmitting || isDeleting || (mode === "edit" && !isDirty)}>
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
