"use client";

import * as React from "react";
import { addDays, format, parseISO } from "date-fns";
import { useTranslations } from "next-intl";

import { useAutosavedDraft } from "@/components/pipeline/draft-autosave";
import { useDepartmentName } from "@/components/pipeline/shared";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useQuery } from "@tanstack/react-query";
import { useUpdateDetails } from "@/hooks/use-pipeline";
import { useApi } from "@/lib/api/client";
import {
  AUDIENCES,
  EVENT_TYPES,
  LOCATION_SCOPES,
  REGISTRATIONS,
  type DayMode,
  type EventDetails,
  type EventRequestDetail,
} from "@/lib/pipeline-types";

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {hint ? <p className="text-muted-foreground text-xs">{hint}</p> : null}
    </div>
  );
}

export function ChoiceSelect<T extends string>({
  value,
  options,
  label,
  onChange,
  disabled,
  placeholder,
}: {
  value: T | null | undefined;
  options: readonly T[];
  label: (option: T) => string;
  onChange: (value: T) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <Select value={value ?? ""} onValueChange={(v) => onChange(v as T)} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {label(option)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function bookedDays(request: EventRequestDetail): string[] {
  if (!request.start_date || !request.end_date) return [];
  const days = [];
  for (let d = parseISO(request.start_date); format(d, "yyyy-MM-dd") <= request.end_date; d = addDays(d, 1)) {
    days.push(format(d, "yyyy-MM-dd"));
  }
  return days;
}

type DetailsDraft = { details: EventDetails; partners: number[] };

/** The event itself, filled in once by the requesting team. Nothing is required until submit; it saves as you type. */
export function DetailsForm({ request }: { request: EventRequestDetail }) {
  const t = useTranslations("pipeline.details");
  const api = useApi();
  const departmentName = useDepartmentName();
  const update = useUpdateDetails(request.id);
  const disabled = !request.can_edit;
  const { data: departments } = useQuery({ queryKey: ["departments"], queryFn: () => api.departments.list() });
  const days = bookedDays(request);

  const draft = useAutosavedDraft<DetailsDraft>({
    key: "details",
    server: { details: request.details, partners: request.partners.map((p) => p.id) },
    enabled: !disabled,
    save: ({ details, partners }) => {
      const modes = details.day_modes
        ? Object.fromEntries(Object.entries(details.day_modes).filter(([day]) => days.includes(day)))
        : null;
      return update.mutateAsync({
        ...details,
        day_modes: modes && Object.keys(modes).length ? modes : null,
        title: details.title || null,
        presenter_name: details.presenter_name || null,
        presenter_email: details.presenter_email?.trim() || null,
        description: details.description || null,
        help_needed: details.help_needed || null,
        partner_department_ids: partners,
      });
    },
  });
  const form = draft.value.details;
  const partners = draft.value.partners;
  const set = <K extends keyof EventDetails>(key: K, value: EventDetails[K]) =>
    draft.update((d) => ({ ...d, details: { ...d.details, [key]: value } }));
  const setPartners = (next: (current: number[]) => number[]) =>
    draft.update((d) => ({ ...d, partners: next(d.partners) }));

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t("title")}>
          <Input value={form.title ?? ""} maxLength={150} disabled={disabled} onChange={(e) => set("title", e.target.value)} />
        </Field>
        <Field label={t("eventType")}>
          <ChoiceSelect
            value={form.event_type}
            options={EVENT_TYPES}
            label={(o) => t(`eventTypes.${o}`)}
            onChange={(v) => set("event_type", v)}
            disabled={disabled}
            placeholder={t("choose")}
          />
        </Field>
        <div className="md:col-span-2">
          <Field label={t("description")}>
            <Textarea
              rows={4}
              value={form.description ?? ""}
              disabled={disabled}
              onChange={(e) => set("description", e.target.value)}
            />
          </Field>
        </div>
        <Field label={t("presenterName")}>
          <Input
            value={form.presenter_name ?? ""}
            disabled={disabled}
            onChange={(e) => set("presenter_name", e.target.value)}
          />
        </Field>
        <Field label={t("presenterEmail")} hint={t("presenterEmailHint")}>
          <Input
            type="email"
            dir="ltr"
            value={form.presenter_email ?? ""}
            disabled={disabled}
            onChange={(e) => set("presenter_email", e.target.value)}
          />
        </Field>
      </div>

      <div className="flex flex-col gap-2">
        <Label className="text-sm font-medium">{t("dayModes")}</Label>
        {days.length === 0 ? <p className="text-muted-foreground text-sm">{t("noDaysYet")}</p> : null}
        <div className="grid gap-2 sm:grid-cols-2">
          {days.map((day) => (
            <div key={day} className="border-border flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
              <span className="tabular text-sm">{day}</span>
              <ChoiceSelect<DayMode>
                value={form.day_modes?.[day]}
                options={["on_site", "online"]}
                label={(o) => t(`modes.${o}`)}
                onChange={(v) => set("day_modes", { ...(form.day_modes ?? {}), [day]: v })}
                disabled={disabled}
                placeholder={t("choose")}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label={t("startTime")}>
          <Input
            type="time"
            value={form.daily_start_time?.slice(0, 5) ?? ""}
            disabled={disabled}
            onChange={(e) => set("daily_start_time", e.target.value || null)}
          />
        </Field>
        <Field label={t("endTime")}>
          <Input
            type="time"
            value={form.daily_end_time?.slice(0, 5) ?? ""}
            disabled={disabled}
            onChange={(e) => set("daily_end_time", e.target.value || null)}
          />
        </Field>
        <Field label={t("officialHours")}>
          <p className="text-muted-foreground pt-2 text-sm">
            {request.within_official_hours === null
              ? t("officialHoursUnknown")
              : request.within_official_hours
                ? t("officialHoursInside")
                : t("officialHoursOutside")}
          </p>
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label={t("locationScope")} hint={t("locationScopeHint")}>
          <ChoiceSelect
            value={form.location_scope}
            options={LOCATION_SCOPES}
            label={(o) => t(`locationScopes.${o}`)}
            onChange={(v) =>
              draft.update((d) => ({
                ...d,
                details: { ...d.details, location_scope: v, ...(v === "outside" ? { is_official: false } : {}) },
              }))
            }
            disabled={disabled}
            placeholder={t("choose")}
          />
        </Field>
        <Field label={t("audience")}>
          <ChoiceSelect
            value={form.audience}
            options={AUDIENCES}
            label={(o) => t(`audiences.${o}`)}
            onChange={(v) => set("audience", v)}
            disabled={disabled}
            placeholder={t("choose")}
          />
        </Field>
        <Field label={t("registration")}>
          <ChoiceSelect
            value={form.registration}
            options={REGISTRATIONS}
            label={(o) => t(`registrations.${o}`)}
            onChange={(v) => set("registration", v)}
            disabled={disabled}
            placeholder={t("choose")}
          />
        </Field>
        <Field label={t("isOfficial")}>
          <label className="flex items-center gap-2 pt-2 text-sm">
            <Checkbox
              checked={!!form.is_official}
              disabled={disabled || form.location_scope === "outside"}
              onCheckedChange={(v) => set("is_official", v === true)}
            />
            {t("isOfficialLabel")}
          </label>
        </Field>
        {form.registration === "acceptance" ? (
          <Field label={t("expectedAccepted")}>
            <Input
              type="number"
              min={1}
              value={form.expected_accepted ?? ""}
              disabled={disabled}
              onChange={(e) => set("expected_accepted", e.target.value ? Number(e.target.value) : null)}
            />
          </Field>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label={t("partners")}>
          <div className="border-border flex max-h-40 flex-col gap-1.5 overflow-y-auto rounded-lg border p-2">
            {(departments ?? [])
              .filter((d) => d.id !== request.department.id)
              .map((d) => (
                <label key={d.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={partners.includes(d.id)}
                    disabled={disabled}
                    onCheckedChange={(v) =>
                      setPartners((p) => (v === true ? [...p, d.id] : p.filter((id) => id !== d.id)))
                    }
                  />
                  {departmentName(d)}
                </label>
              ))}
          </div>
        </Field>
        <Field label={t("helpNeeded")}>
          <Textarea
            rows={4}
            value={form.help_needed ?? ""}
            disabled={disabled}
            onChange={(e) => set("help_needed", e.target.value)}
          />
        </Field>
      </div>

    </div>
  );
}
