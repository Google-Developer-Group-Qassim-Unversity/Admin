"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { addDays, format, parseISO } from "date-fns";
import { useLocale, useTranslations } from "next-intl";
import { CircleCheck, TriangleAlert } from "lucide-react";

import { useAutosavedDraft } from "@/components/pipeline/draft-autosave";
import { Chips, Choice, ChoiceSelect, Field, FormSection } from "@/components/pipeline/form-kit";
import { useDepartmentName } from "@/components/pipeline/shared";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useDepartments } from "@/hooks/use-event";
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
import { intlLocale } from "@/lib/format";

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
  const locale = useLocale();
  const departmentName = useDepartmentName();
  const update = useUpdateDetails(request.id);
  const disabled = !request.can_edit;
  // Partners come from this semester's departments, the same list an event's departments are picked from.
  const [today] = React.useState(() => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date()));
  const { data: departments } = useDepartments(today);
  const days = bookedDays(request);
  const api = useApi();
  // The points tiers are the composite action pairs, the same list the admin event form offers.
  const { data: actions } = useQuery({ queryKey: ["actions"], queryFn: () => api.actions.list() });
  const tiers = (actions?.composite_actions ?? []).filter((pair) => pair.length === 2);

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
        // A partner from an older semester can't be saved again; until the list loads, leave partners alone.
        partner_department_ids: departments ? partners.filter((id) => departments.some((d) => d.id === id)) : undefined,
      });
    },
  });
  const form = draft.value.details;
  const partners = draft.value.partners;
  const set = <K extends keyof EventDetails>(key: K, value: EventDetails[K]) =>
    draft.update((d) => ({ ...d, details: { ...d.details, [key]: value } }));
  const setPartners = (next: (current: number[]) => number[]) =>
    draft.update((d) => ({ ...d, partners: next(d.partners) }));

  const dayLabel = new Intl.DateTimeFormat(intlLocale(locale), { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" });
  const otherDepartments = (departments ?? []).filter((d) => d.id !== request.department.id);
  const official = request.within_official_hours;

  return (
    <div className="flex flex-col gap-8">
      <FormSection title={t("sections.basics")}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t("title")} name="details.title">
            <Input
              value={form.title ?? ""}
              maxLength={150}
              disabled={disabled}
              placeholder={t("titlePlaceholder")}
              onChange={(e) => set("title", e.target.value)}
            />
          </Field>
          <Field label={t("eventType")} name="details.event_type">
            <ChoiceSelect
              value={form.event_type}
              options={EVENT_TYPES}
              label={(o) => t(`eventTypes.${o}`)}
              onChange={(v) => set("event_type", v)}
              disabled={disabled}
              placeholder={t("choose")}
            />
          </Field>
          <Field label={t("pointsTier")} name="details.points_tier" hint={t("pointsTierHint")} className="md:col-span-2">
            <ChoiceSelect
              value={
                form.department_action_id && form.member_action_id
                  ? `${form.department_action_id}:${form.member_action_id}`
                  : null
              }
              options={tiers.map(([dept, member]) => `${dept.id}:${member.id}`)}
              label={(value) => {
                const [dept, member] = tiers.find(([d, m]) => `${d.id}:${m.id}` === value) ?? [];
                if (!dept || !member) return value;
                const name = locale === "ar" ? dept.ar_action_name || dept.action_name : dept.action_name;
                return t("pointsTierOption", { name, points: member.points });
              }}
              onChange={(value) => {
                const [departmentActionId, memberActionId] = value.split(":").map(Number);
                draft.update((d) => ({
                  ...d,
                  details: { ...d.details, department_action_id: departmentActionId, member_action_id: memberActionId },
                }));
              }}
              disabled={disabled}
              placeholder={t("choose")}
            />
          </Field>
          <Field label={t("description")} name="details.description" className="md:col-span-2">
            <Textarea
              rows={4}
              value={form.description ?? ""}
              disabled={disabled}
              placeholder={t("descriptionPlaceholder")}
              onChange={(e) => set("description", e.target.value)}
            />
          </Field>
          <Field label={t("presenterName")} name="details.presenter_name">
            <Input
              value={form.presenter_name ?? ""}
              disabled={disabled}
              onChange={(e) => set("presenter_name", e.target.value)}
            />
          </Field>
          <Field
            label={t("presenterEmail")}
            name="details.presenter_email"
            hint={t("presenterEmailHint")}
            optional={!Object.values(form.day_modes ?? {}).includes("online")}
          >
            <Input
              type="email"
              dir="ltr"
              value={form.presenter_email ?? ""}
              disabled={disabled}
              placeholder="name@example.com"
              onChange={(e) => set("presenter_email", e.target.value)}
            />
          </Field>
        </div>
      </FormSection>

      <FormSection title={t("sections.schedule")}>
        <Field label={t("dayModes")} name="details.day_modes">
          {days.length === 0 ? <p className="text-ink-2 text-sm">{t("noDaysYet")}</p> : null}
          <div className="flex flex-col gap-2">
            {days.map((day) => (
              <div key={day} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                <span className="text-sm font-bold sm:w-44">{dayLabel.format(new Date(`${day}T00:00:00Z`))}</span>
                <div className="sm:w-72">
                  <Choice<DayMode>
                    ariaLabel={dayLabel.format(new Date(`${day}T00:00:00Z`))}
                    value={form.day_modes?.[day]}
                    options={["on_site", "online"]}
                    label={(o) => t(`modes.${o}`)}
                    onChange={(v) => set("day_modes", { ...(form.day_modes ?? {}), [day]: v })}
                    disabled={disabled}
                  />
                </div>
              </div>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-4 md:max-w-md">
          <Field label={t("startTime")} name="details.daily_start_time">
            <Input
              type="time"
              value={form.daily_start_time?.slice(0, 5) ?? ""}
              disabled={disabled}
              onChange={(e) => set("daily_start_time", e.target.value || null)}
            />
          </Field>
          <Field label={t("endTime")} name="details.daily_end_time">
            <Input
              type="time"
              value={form.daily_end_time?.slice(0, 5) ?? ""}
              disabled={disabled}
              onChange={(e) => set("daily_end_time", e.target.value || null)}
            />
          </Field>
        </div>
        {official === null ? null : (
          <p
            className={`flex w-fit items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-bold ${
              official ? "bg-door-green-soft text-door-green-ink" : "bg-door-ochre-soft text-door-ochre-ink"
            }`}
          >
            {official ? <CircleCheck className="h-3.5 w-3.5" /> : <TriangleAlert className="h-3.5 w-3.5" />}
            {official ? t("officialHoursInside") : t("officialHoursOutside")}
          </p>
        )}
      </FormSection>

      <FormSection title={t("sections.audience")}>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label={t("locationScope")} name="details.location_scope" hint={t("locationScopeHint")}>
            <Choice
              ariaLabel={t("locationScope")}
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
            />
          </Field>
          <Field label={t("isOfficial")} name="details.is_official">
            <Choice
              ariaLabel={t("isOfficial")}
              value={form.is_official === null || form.is_official === undefined ? null : form.is_official ? "yes" : "no"}
              options={["yes", "no"] as const}
              label={(o) => t(`official.${o}`)}
              onChange={(v) => set("is_official", v === "yes")}
              disabled={disabled || form.location_scope === "outside"}
            />
          </Field>
          <Field label={t("audience")} name="details.audience">
            <ChoiceSelect
              value={form.audience}
              options={AUDIENCES}
              label={(o) => t(`audiences.${o}`)}
              onChange={(v) => set("audience", v)}
              disabled={disabled}
              placeholder={t("choose")}
            />
          </Field>
          <Field label={t("registration")} name="details.registration">
            <ChoiceSelect
              value={form.registration}
              options={REGISTRATIONS}
              label={(o) => t(`registrations.${o}`)}
              onChange={(v) => set("registration", v)}
              disabled={disabled}
              placeholder={t("choose")}
            />
          </Field>
          {form.registration === "acceptance" ? (
            <Field label={t("expectedAccepted")} name="details.expected_accepted">
              <Input
                type="number"
                inputMode="numeric"
                min={1}
                value={form.expected_accepted ?? ""}
                disabled={disabled}
                onChange={(e) => set("expected_accepted", e.target.value ? Number(e.target.value) : null)}
              />
            </Field>
          ) : null}
        </div>
      </FormSection>

      <FormSection title={t("sections.collaboration")}>
        <Field label={t("partners")} optional>
          {otherDepartments.length ? (
            <Chips
              values={partners}
              options={otherDepartments.map((d) => d.id)}
              label={(id) => departmentName(otherDepartments.find((d) => d.id === id))}
              onChange={(next) => setPartners(() => next)}
              disabled={disabled}
            />
          ) : null}
        </Field>
        <Field label={t("helpNeeded")} optional>
          <Textarea
            rows={3}
            value={form.help_needed ?? ""}
            disabled={disabled}
            onChange={(e) => set("help_needed", e.target.value)}
          />
        </Field>
      </FormSection>
    </div>
  );
}
