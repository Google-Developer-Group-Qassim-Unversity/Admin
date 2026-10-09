"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { addDays, format, parseISO } from "date-fns";
import { useLocale, useTranslations } from "next-intl";
import { CalendarCheck2, CircleCheck, ExternalLink, Info } from "lucide-react";
import { toast } from "sonner";

import { DraftSaveStatus, useAutosavedDraft, useDraftSave } from "@/components/pipeline/draft-autosave";
import { Choice, ChoiceSelect, Field, FormSection, MissingProvider, focusField } from "@/components/pipeline/form-kit";
import { useFormatDateRange } from "@/components/pipeline/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { pipelineKeys, useCompleteTask, useSaveDeliverable } from "@/hooks/use-pipeline";
import {
  EVENT_TYPES,
  VENUES,
  type DayMode,
  type EventRequestDetail,
  type LogisticsConfirmation as Confirmation,
} from "@/lib/pipeline-types";

// A typo in a date field must not render a year of day rows.
const MAX_DAY_ROWS = 14;

function daysBetween(start: string | null, end: string | null): string[] {
  if (!start || !end || end < start) return [];
  const days = [];
  for (let d = parseISO(start); format(d, "yyyy-MM-dd") <= end && days.length < MAX_DAY_ROWS; d = addDays(d, 1)) {
    days.push(format(d, "yyyy-MM-dd"));
  }
  return days;
}

const hhmm = (time: string | null | undefined) => time?.slice(0, 5) ?? "";

/**
 * Logistics' deliverable: the event as it was actually booked.
 *
 * The request holds what the department asked for; the university may give
 * another day, time or room. Logistics gets this form prefilled from the
 * request and its brief, changes what differs, and confirms. Publish reads the
 * confirmed version, so nothing is typed twice. Confirming other dates moves
 * the request on the calendar and emails the requesting department.
 */
export function LogisticsConfirmation({ request }: { request: EventRequestDetail }) {
  const task = request.tasks.find((t) => t.team === "logistics");
  if (!task || task.status === "brief" || !task.deliverable) return null;
  if (request.actions.complete.includes("logistics")) return <ConfirmationForm request={request} />;
  if (task.status === "done") return <ConfirmationSummary request={request} />;
  return null;
}

function ConfirmationForm({ request }: { request: EventRequestDetail }) {
  const t = useTranslations("pipeline.confirm");
  const td = useTranslations("pipeline.details");
  const tb = useTranslations("pipeline.briefs");
  const locale = useLocale();
  const queryClient = useQueryClient();
  const formatRange = useFormatDateRange();
  const task = request.tasks.find((x) => x.team === "logistics")!;
  const save = useSaveDeliverable(request.id, "logistics");
  const complete = useCompleteTask(request.id);
  const { flushAll, state } = useDraftSave();
  // Missing fields turn red only after someone tries to confirm.
  const [shown, setShown] = React.useState(false);

  const draft = useAutosavedDraft<Confirmation>({
    key: "confirm",
    server: task.deliverable as unknown as Confirmation,
    enabled: true,
    save: (value) => {
      const days = daysBetween(value.start_date, value.end_date);
      const modes = Object.fromEntries(Object.entries(value.day_modes ?? {}).filter(([day]) => days.includes(day)));
      return save.mutateAsync({
        ...value,
        day_modes: Object.keys(modes).length ? modes : null,
        venue: value.venue || null,
        room: value.room || null,
        meet_link: value.meet_link?.trim() || null,
        description: value.description || null,
      });
    },
  });
  const form = draft.value;
  const set = <K extends keyof Confirmation>(key: K, value: Confirmation[K]) =>
    draft.update((d) => ({ ...d, [key]: value }));

  const days = daysBetween(form.start_date, form.end_date);
  const modes = new Set(days.map((day) => form.day_modes?.[day]).filter(Boolean));
  const venueIsListed = !form.venue || VENUES.includes(form.venue);
  const [otherVenue, setOtherVenue] = React.useState(!venueIsListed);
  const dayLabel = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" });
  const datesMoved =
    !!form.start_date &&
    !!form.end_date &&
    (form.start_date !== request.start_date || form.end_date !== request.end_date);
  const requestedTime = `${hhmm(request.details.daily_start_time)}–${hhmm(request.details.daily_end_time)}`;
  const timeChanged =
    hhmm(form.daily_start_time) !== hhmm(request.details.daily_start_time) ||
    hhmm(form.daily_end_time) !== hhmm(request.details.daily_end_time);
  const busy = state === "saving" || complete.isPending;

  const onConfirm = async () => {
    if (!(await flushAll())) return;
    // The saves just refreshed the request; this render's copy may be older.
    const fresh = queryClient.getQueryData<EventRequestDetail>(pipelineKeys.request(request.id)) ?? request;
    const missing = fresh.tasks.find((x) => x.team === "logistics")?.deliverable_missing ?? [];
    if (missing.length) {
      setShown(true);
      focusField(missing[0]);
      toast.error(t("incomplete", { count: missing.length }));
      return;
    }
    try {
      await complete.mutateAsync("logistics");
      toast.success(t("confirmed"));
    } catch (error) {
      setShown(true);
      toast.error(error instanceof Error ? error.message : t("failed"));
    }
  };

  return (
    <MissingProvider missing={task.deliverable_missing} shown={shown}>
      <section className="bg-card border-brand-blue/30 flex flex-col gap-5 rounded-xl border p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="bg-brand-blue-soft text-brand-blue-ink flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
            <CalendarCheck2 className="h-[18px] w-[18px]" />
          </span>
          <div className="flex flex-col gap-0.5">
            <h2 className="font-display text-base font-semibold tracking-tight">{t("title")}</h2>
            <p className="text-muted-foreground text-[13px]">{t("hint")}</p>
          </div>
        </div>

        <FormSection title={t("sections.when")}>
          <div className="grid grid-cols-2 gap-4 md:max-w-md">
            <Field label={t("startDate")} name="confirm.start_date">
              <Input
                type="date"
                value={form.start_date ?? ""}
                onChange={(e) => set("start_date", e.target.value || null)}
              />
            </Field>
            <Field label={t("endDate")} name="confirm.end_date">
              <Input type="date" value={form.end_date ?? ""} onChange={(e) => set("end_date", e.target.value || null)} />
            </Field>
          </div>
          {datesMoved && request.start_date ? (
            <p className="bg-brand-yellow-soft text-brand-yellow-ink flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              {t("datesMoved", { requested: formatRange(request.start_date, request.end_date) })}
            </p>
          ) : null}
          <Field label={td("dayModes")} name="confirm.day_modes">
            <div className="flex flex-col gap-2">
              {days.map((day) => (
                <div key={day} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <span className="text-sm font-medium sm:w-44">{dayLabel.format(new Date(`${day}T00:00:00Z`))}</span>
                  <div className="sm:w-72">
                    <Choice<DayMode>
                      ariaLabel={dayLabel.format(new Date(`${day}T00:00:00Z`))}
                      value={form.day_modes?.[day]}
                      options={["on_site", "online"]}
                      label={(o) => td(`modes.${o}`)}
                      onChange={(v) => set("day_modes", { ...(form.day_modes ?? {}), [day]: v })}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-4 md:max-w-md">
            <Field label={td("startTime")} name="confirm.daily_start_time">
              <Input
                type="time"
                value={hhmm(form.daily_start_time)}
                onChange={(e) => set("daily_start_time", e.target.value || null)}
              />
            </Field>
            <Field label={td("endTime")} name="confirm.daily_end_time">
              <Input
                type="time"
                value={hhmm(form.daily_end_time)}
                onChange={(e) => set("daily_end_time", e.target.value || null)}
              />
            </Field>
          </div>
          {timeChanged && request.details.daily_start_time ? (
            <p className="text-muted-foreground text-xs">{t("requestedTime", { time: requestedTime })}</p>
          ) : null}
        </FormSection>

        <FormSection title={t("sections.where")}>
          {modes.has("on_site") ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={tb("logistics.venue")} name="confirm.venue">
                <ChoiceSelect
                  value={otherVenue ? "__other" : (form.venue ?? null)}
                  options={[...VENUES, "__other"]}
                  label={(o) => (o === "__other" ? tb("other") : o)}
                  onChange={(v) => {
                    setOtherVenue(v === "__other");
                    set("venue", v === "__other" ? "" : v);
                  }}
                  placeholder={tb("choose")}
                />
                {otherVenue ? (
                  <Input
                    value={form.venue ?? ""}
                    placeholder={tb("otherPlaceholder")}
                    onChange={(e) => set("venue", e.target.value)}
                  />
                ) : null}
              </Field>
              <Field label={tb("logistics.room")} optional>
                <Input value={form.room ?? ""} maxLength={100} onChange={(e) => set("room", e.target.value)} />
              </Field>
            </div>
          ) : null}
          {modes.has("online") ? (
            <Field label={t("meetLink")} name="confirm.meet_link" hint={t("meetLinkHint")} className="md:max-w-md">
              <Input
                type="url"
                dir="ltr"
                value={form.meet_link ?? ""}
                placeholder="https://meet.google.com/…"
                onChange={(e) => set("meet_link", e.target.value)}
              />
            </Field>
          ) : null}
          {!modes.size ? <p className="text-muted-foreground text-sm">{t("pickModes")}</p> : null}
        </FormSection>

        <FormSection title={t("sections.what")}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label={td("eventType")} name="confirm.event_type">
              <ChoiceSelect
                value={form.event_type}
                options={EVENT_TYPES}
                label={(o) => td(`eventTypes.${o}`)}
                onChange={(v) => set("event_type", v)}
                placeholder={td("choose")}
              />
            </Field>
            <Field label={td("description")} name="confirm.description" className="md:col-span-2">
              <Textarea rows={4} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} />
            </Field>
          </div>
        </FormSection>

        <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:gap-3">
          <div className="min-w-0 flex-1">
            <DraftSaveStatus />
          </div>
          <Button onClick={onConfirm} disabled={busy}>
            <CircleCheck className="h-4 w-4" />
            {t("button")}
          </Button>
        </div>
      </section>
    </MissingProvider>
  );
}

/** What Logistics confirmed, for everyone who can see the request. */
function ConfirmationSummary({ request }: { request: EventRequestDetail }) {
  const t = useTranslations("pipeline.confirm");
  const td = useTranslations("pipeline.details");
  const formatRange = useFormatDateRange();
  const task = request.tasks.find((x) => x.team === "logistics")!;
  const confirmed = task.deliverable as unknown as Confirmation;
  const modes = new Set(Object.values(confirmed.day_modes ?? {}));
  const place = [confirmed.venue, confirmed.room].filter(Boolean).join(" · ");

  const rows: [string, React.ReactNode][] = [
    [t("summary.dates"), confirmed.start_date ? formatRange(confirmed.start_date, confirmed.end_date) : "-"],
    [t("summary.time"), `${hhmm(confirmed.daily_start_time)}–${hhmm(confirmed.daily_end_time)}`],
    [t("summary.mode"), [...modes].map((m) => td(`modes.${m}`)).join(" + ") || "-"],
  ];
  if (modes.has("on_site")) rows.push([t("summary.place"), place || "-"]);
  if (modes.has("online") && confirmed.meet_link) {
    rows.push([
      t("summary.meet"),
      <a
        key="meet"
        href={confirmed.meet_link}
        target="_blank"
        rel="noreferrer"
        dir="ltr"
        className="text-brand-blue-ink inline-flex items-center gap-1 break-all underline-offset-2 hover:underline"
      >
        {confirmed.meet_link}
        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
      </a>,
    ]);
  }
  rows.push([t("summary.type"), confirmed.event_type ? td(`eventTypes.${confirmed.event_type}`) : "-"]);

  return (
    <section className="bg-card border-border flex flex-col gap-4 rounded-xl border p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="bg-brand-green-soft text-brand-green-ink flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
          <CalendarCheck2 className="h-[18px] w-[18px]" />
        </span>
        <div className="flex flex-col gap-0.5">
          <h2 className="font-display text-base font-semibold tracking-tight">{t("summary.title")}</h2>
          {task.done_by ? (
            <p className="text-muted-foreground text-[13px]">{t("summary.by", { name: task.done_by.name })}</p>
          ) : null}
        </div>
      </div>
      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-[max-content_1fr]">
        {rows.map(([label, value]) => (
          <React.Fragment key={label}>
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="min-w-0 font-medium">{value}</dd>
          </React.Fragment>
        ))}
      </dl>
      {confirmed.description ? (
        <p className="bg-muted/40 rounded-lg px-4 py-3 text-sm whitespace-pre-wrap">{confirmed.description}</p>
      ) : null}
    </section>
  );
}
