"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { addDays, format, parseISO } from "date-fns";
import { useLocale, useTranslations } from "next-intl";
import { Check, Copy, ExternalLink, Info } from "lucide-react";

import { Fact } from "@/components/najdi";
import { useDepartmentName, useFormatDateRange } from "@/components/pipeline/shared";
import { Button } from "@/components/ui/button";
import { useApi } from "@/lib/api/client";
import { intlLocale } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DesignBrief, EventRequestDetail, LogisticsBrief } from "@/lib/pipeline-types";

/**
 * A submitted request, read as what it is: a brief handed to a team. Once a
 * request is sent nobody can change it, so the teams get facts and text they
 * can copy, not a form with every control greyed out.
 */

const hhmm = (time: string | null | undefined) => time?.slice(0, 5) ?? "";

function daysOf(start: string | null, end: string | null): string[] {
  if (!start || !end || end < start) return [];
  const days = [];
  for (let d = parseISO(start); format(d, "yyyy-MM-dd") <= end && days.length < 14; d = addDays(d, 1)) {
    days.push(format(d, "yyyy-MM-dd"));
  }
  return days;
}

/** A term and its value; an unanswered one says so quietly instead of leaving a gap. */
function Row({ term, value }: { term: string; value: React.ReactNode }) {
  const t = useTranslations("pipeline.stations");
  const empty = value === null || value === undefined || value === "" || (Array.isArray(value) && !value.length);
  return (
    <Fact term={term} className="align-baseline">
      {empty ? <span className="text-ink-3 font-normal">{t("notAnswered")}</span> : value}
    </Fact>
  );
}

function Facts({ children, className }: { children: React.ReactNode; className?: string }) {
  return <dl className={cn("grid grid-cols-[fit-content(55%)_minmax(0,1fr)] gap-x-1", className)}>{children}</dl>;
}

/** A block of text someone typed for the team, kept as typed, with a copy button for whoever has to reuse it. */
export function TextBlock({ label, text, copy = false }: { label: string; text: string | null | undefined; copy?: boolean }) {
  const t = useTranslations("pipeline.stations");
  const [copied, setCopied] = React.useState(false);
  if (!text?.trim()) return null;

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // A browser that refuses the clipboard leaves the text selectable as it is.
    }
  };

  return (
    <section className="flex flex-col gap-1.5">
      <div className="flex min-h-8 items-end justify-between gap-2">
        <h4 className="text-ink-2 text-[13px] font-bold">{label}</h4>
        {copy ? (
          <Button variant="ghost" size="sm" className="text-ink-2 hover:text-foreground -me-2 h-8" onClick={onCopy}>
            {copied ? <Check className="text-door-green-ink" /> : <Copy />}
            {copied ? t("copied") : t("copy")}
          </Button>
        ) : null}
      </div>
      <p dir="auto" className="bg-sunk rounded-lg px-3.5 py-3 text-[15px] leading-relaxed whitespace-pre-wrap">
        {text}
      </p>
    </section>
  );
}

function Links({ label, links }: { label: string; links: string[] | undefined }) {
  if (!links?.length) return null;
  return (
    <section className="flex flex-col gap-1.5">
      <h4 className="text-ink-2 text-[13px] font-bold">{label}</h4>
      <ul className="flex flex-col">
        {links.map((link) => (
          <li key={link} className="border-rule border-b last:border-b-0">
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              dir="ltr"
              className="text-door-indigo-ink flex min-h-11 items-center gap-2 py-1.5 text-[13.5px] font-medium break-all underline-offset-3 hover:underline"
            >
              <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
              {link}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** "Sunday 27 Oct · On site", one line per booked day. */
function DayModes({ request }: { request: EventRequestDetail }) {
  const td = useTranslations("pipeline.details");
  const locale = useLocale();
  const label = new Intl.DateTimeFormat(intlLocale(locale), { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" });
  const days = daysOf(request.start_date, request.end_date);
  if (!days.length) return null;
  return (
    <span className="flex flex-col gap-0.5">
      {days.map((day) => {
        const mode = request.details.day_modes?.[day];
        return (
          <span key={day} className="tabular">
            {label.format(new Date(`${day}T00:00:00Z`))}
            <span className="text-ink-2"> · {mode ? td(`modes.${mode}`) : "-"}</span>
          </span>
        );
      })}
    </span>
  );
}

/**
 * The event, as the requesting department described it. `full` is the whole
 * record (the Event station once it is sent); without it, the few facts a
 * team needs beside its own brief.
 */
export function EventFacts({ request, full = false }: { request: EventRequestDetail; full?: boolean }) {
  const t = useTranslations("pipeline.details");
  const ts = useTranslations("pipeline.stations");
  const locale = useLocale();
  const formatRange = useFormatDateRange();
  const departmentName = useDepartmentName();
  const api = useApi();
  const d = request.details;
  // The points tier is only shown in full, and only then is the catalogue worth a request.
  const { data: actions } = useQuery({ queryKey: ["actions"], queryFn: () => api.actions.list(), enabled: full });
  const tier = (actions?.composite_actions ?? []).find(
    (pair) => pair.length === 2 && pair[0].id === d.department_action_id && pair[1].id === d.member_action_id,
  );
  const tierName = tier
    ? t("pointsTierOption", {
        name: locale === "ar" ? tier[0].ar_action_name || tier[0].action_name : tier[0].action_name,
        points: tier[1].points,
      })
    : null;

  const time = d.daily_start_time ? (
    <span className="tabular" dir="ltr">{`${hhmm(d.daily_start_time)}–${hhmm(d.daily_end_time)}`}</span>
  ) : null;

  return (
    <div className="flex flex-col gap-4">
      <Facts>
        {full ? <Row term={t("title")} value={d.title ? <bdi>{d.title}</bdi> : null} /> : null}
        <Row
          term={ts("perDay")}
          value={
            request.start_date ? (
              <span className="flex flex-col gap-1">
                <span className="tabular font-bold">{formatRange(request.start_date, request.end_date)}</span>
                <DayModes request={request} />
              </span>
            ) : null
          }
        />
        <Row term={t("startTime")} value={time} />
        <Row term={t("eventType")} value={d.event_type ? t(`eventTypes.${d.event_type}`) : null} />
        <Row term={t("presenterName")} value={d.presenter_name ? <bdi>{d.presenter_name}</bdi> : null} />
        {full || d.presenter_email ? (
          <Row term={t("presenterEmail")} value={d.presenter_email ? <span dir="ltr">{d.presenter_email}</span> : null} />
        ) : null}
        <Row term={t("audience")} value={d.audience ? t(`audiences.${d.audience}`) : null} />
        <Row
          term={t("registration")}
          value={
            d.registration
              ? `${t(`registrations.${d.registration}`)}${d.registration === "acceptance" && d.expected_accepted ? ` · ${d.expected_accepted}` : ""}`
              : null
          }
        />
        {full ? (
          <>
            <Row term={t("locationScope")} value={d.location_scope ? t(`locationScopes.${d.location_scope}`) : null} />
            <Row
              term={t("isOfficial")}
              value={d.is_official === null || d.is_official === undefined ? null : t(`official.${d.is_official ? "yes" : "no"}`)}
            />
            <Row term={t("pointsTier")} value={tierName} />
            <Row
              term={t("partners")}
              value={
                request.partners.length ? (
                  request.partners.map((p) => departmentName(p)).join(locale === "ar" ? "، " : ", ")
                ) : (
                  <span className="text-ink-3 font-normal">{ts("partnersNone")}</span>
                )
              }
            />
          </>
        ) : null}
      </Facts>
      {request.within_official_hours === false ? (
        <p className="bg-door-ochre-soft text-door-ochre-ink flex w-fit items-center gap-1.5 rounded-sm px-2.5 py-1 text-xs font-bold">
          <Info className="size-3.5" aria-hidden="true" />
          {t("officialHoursOutside")}
        </p>
      ) : null}
      <TextBlock label={t("description")} text={d.description} copy={full} />
      {full ? <TextBlock label={t("helpNeeded")} text={d.help_needed} /> : null}
    </div>
  );
}

/** Design's brief: what to make, and the words that go on it (copyable: they are what the designer types). */
export function DesignBriefSummary({ request }: { request: EventRequestDetail }) {
  const t = useTranslations("pipeline.briefs.design");
  const brief = (request.tasks.find((task) => task.team === "design")?.brief ?? {}) as DesignBrief;
  const other = (value: string | null | undefined, extra: string | null | undefined, label: (v: string) => string) =>
    value ? (value === "other" && extra ? <bdi>{extra}</bdi> : label(value)) : null;

  return (
    <div className="flex flex-col gap-5">
      <p className="bg-door-indigo-soft text-door-indigo-ink flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm font-bold">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {t("rule")}
      </p>
      <Facts>
        <Row term={t("designType")} value={other(brief.design_type, brief.design_type_other, (v) => t(`designTypes.${v}`))} />
        <Row term={t("size")} value={other(brief.size, brief.size_other, (v) => t(`sizes.${v}`))} />
        <Row term={t("fileType")} value={other(brief.file_type, brief.file_type_other, (v) => t(`fileTypes.${v}`))} />
        <Row term={t("contentStatus")} value={brief.content_status ? t(`contentStatuses.${brief.content_status}`) : null} />
      </Facts>
      <TextBlock label={t("idea")} text={brief.idea} />
      <TextBlock label={t("content")} text={brief.content} copy />
      <TextBlock label={t("instructions")} text={brief.instructions} />
      <Links label={t("imageLinks")} links={brief.image_links} />
      <Links label={t("referenceLinks")} links={brief.reference_links} />
    </div>
  );
}

/** Logistics' brief: where, what the venue needs, and what help was asked for. */
export function LogisticsBriefSummary({ request }: { request: EventRequestDetail }) {
  const t = useTranslations("pipeline.briefs.logistics");
  const tb = useTranslations("pipeline.briefs");
  const ts = useTranslations("pipeline.stations");
  const locale = useLocale();
  const brief = (request.tasks.find((task) => task.team === "logistics")?.brief ?? {}) as LogisticsBrief;
  const modes = new Set(Object.values(request.details.day_modes ?? {}));
  const includesFemale = request.details.audience === "female" || request.details.audience === "mixed";
  const join = (items: string[]) => items.join(locale === "ar" ? "، " : ", ");
  const yesNo = (value: boolean | null | undefined) => (value === null || value === undefined ? null : tb(value ? "yes" : "no"));

  return (
    <div className="flex flex-col gap-5">
      <Facts>
        {modes.has("on_site") ? (
          <>
            <Row term={t("venue")} value={brief.venue ? <bdi>{brief.venue}</bdi> : null} />
            <Row term={t("room")} value={brief.room ? <bdi>{brief.room}</bdi> : null} />
            <Row
              term={t("services")}
              value={brief.services?.length ? join(brief.services.map((s) => t(`serviceOptions.${s}`))) : <span className="text-ink-3 font-normal">{ts("none")}</span>}
            />
            <Row
              term={t("venueNeeds")}
              value={brief.venue_needs?.length ? join(brief.venue_needs.map((s) => t(`venueNeedOptions.${s}`))) : <span className="text-ink-3 font-normal">{ts("none")}</span>}
            />
            {includesFemale ? <Row term={t("buses")} value={yesNo(brief.buses_needed)} /> : null}
          </>
        ) : null}
        {modes.has("online") ? <Row term={t("meetLink")} value={yesNo(brief.meet_link_by_logistics)} /> : null}
      </Facts>
      <TextBlock label={t("notes")} text={brief.notes} />
    </div>
  );
}
