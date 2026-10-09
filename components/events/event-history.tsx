"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight, History } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useEventHistory } from "@/hooks/use-event";
import type { EventHistory as EventHistoryData } from "@/lib/api-types";

type Item = EventHistoryData["items"][number];
type Person = { member_id: number; name: string };

const COLLAPSED = 6;
// Fields whose before/after reads as text; the rest just say they changed.
const SHOWN_VALUES = new Set(["name", "status", "location", "location_type", "start_datetime", "end_datetime"]);

/**
 * Who did what to the event from /events, newest first: created, edited (and
 * what changed), status and Meet link, attendance taken or removed,
 * registrations reviewed, the form. A pipeline event links to its request,
 * whose history has the steps before it was published.
 */
export function EventHistory({ eventId }: { eventId: number }) {
  const t = useTranslations("eventHistory");
  const locale = useLocale();
  const { data } = useEventHistory(eventId);
  const describe = useDescribe();
  const [expanded, setExpanded] = React.useState(false);
  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  if (!data || (!data.items.length && !data.pipeline_request_id)) return null;
  const items = [...data.items].reverse();
  const visible = expanded ? items : items.slice(0, COLLAPSED);

  return (
    <section className="bg-card border-border flex flex-col gap-4 rounded-xl border px-4 py-4 sm:px-5 sm:py-5">
      <div className="flex items-start gap-3">
        <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
          <History className="h-[18px] w-[18px]" />
        </span>
        <div className="flex flex-col gap-0.5">
          <h2 className="font-display text-base font-semibold tracking-tight">{t("title")}</h2>
          <p className="text-muted-foreground text-[13px]">{t("hint")}</p>
        </div>
      </div>
      {visible.length ? (
        <ol className="flex flex-col">
          {visible.map((item, index) => {
            const { text, note } = describe(item);
            return (
              <li key={`${item.at}-${index}`} className="flex gap-3 pb-4 last:pb-0">
                <span className="flex w-2.5 shrink-0 flex-col items-center pt-1.5">
                  <span className="bg-brand-blue h-2.5 w-2.5 rounded-full" />
                  {index < visible.length - 1 ? <span className="bg-border mt-1 w-px flex-1" /> : null}
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="text-sm">
                    <span className="font-semibold">{item.actor?.name ?? t("unknown")}</span> {text}
                  </p>
                  {note ? (
                    <p dir="auto" className="text-muted-foreground text-xs break-words whitespace-pre-wrap">
                      {note}
                    </p>
                  ) : null}
                  <time dateTime={item.at} className="text-muted-foreground tabular text-xs">
                    {formatter.format(new Date(item.at))}
                  </time>
                </div>
              </li>
            );
          })}
        </ol>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {items.length > visible.length ? (
          <Button variant="ghost" size="sm" onClick={() => setExpanded(true)}>
            {t("showAll", { count: items.length })}
          </Button>
        ) : null}
        {data.pipeline_request_id ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`/pipeline/requests/${data.pipeline_request_id}`}>
              {t("pipeline")}
              <ArrowRight className="h-4 w-4 rtl:-scale-x-100" />
            </Link>
          </Button>
        ) : null}
      </div>
    </section>
  );
}

function useDescribe() {
  const t = useTranslations("eventHistory");
  const locale = useLocale();
  const dateTime = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  const people = (value: unknown) =>
    (Array.isArray(value) ? (value as Person[]) : []).map((p) => p.name).join(locale === "ar" ? "، " : ", ");
  const shown = (field: string, value: unknown) => {
    if (value === null || value === undefined || value === "") return t("empty");
    if (field === "status") return t.has(`statuses.${value}`) ? t(`statuses.${value}`) : String(value);
    if (field.endsWith("_datetime")) return dateTime.format(new Date(String(value)));
    return String(value);
  };

  return (item: Item): { text: string; note?: string } => {
    const d = item.details ?? {};
    switch (item.action) {
      case "edited": {
        const fields = Object.keys(d);
        const note = fields
          .map((field) => {
            const label = t.has(`fields.${field}`) ? t(`fields.${field}`) : field;
            const [before, after] = d[field] as [unknown, unknown];
            return SHOWN_VALUES.has(field) ? `${label}: ${shown(field, before)} → ${shown(field, after)}` : label;
          })
          .join("\n");
        return { text: t("actions.edited", { count: fields.length }), note };
      }
      case "status_changed": {
        const [before, after] = d.status as [string, string];
        return { text: t("actions.statusChanged", { from: shown("status", before), to: shown("status", after) }) };
      }
      case "meeting_url_changed": {
        const [before, after] = d.meeting_url as [string | null, string | null];
        const key = !after ? "meetCleared" : before ? "meetChanged" : "meetSet";
        return { text: t(`actions.${key}`), note: after ?? undefined };
      }
      case "attendance_marked":
      case "attendance_backfilled":
      case "attendance_removed":
      case "attendance_scanned": {
        const members = Array.isArray(d.members) ? d.members : [];
        const key = {
          attendance_marked: "attendanceMarked",
          attendance_backfilled: "attendanceBackfilled",
          attendance_removed: "attendanceRemoved",
          attendance_scanned: "attendanceScanned",
        }[item.action];
        return { text: t(`actions.${key}`, { count: members.length }), note: people(d.members) };
      }
      case "submissions_reviewed": {
        const rows = (Array.isArray(d.submissions) ? d.submissions : []) as { is_accepted: boolean }[];
        const accepted = rows.filter((r) => r.is_accepted).length;
        return {
          text: t("actions.submissionsReviewed", { count: rows.length }),
          note: t("reviewNote", { accepted, rejected: rows.length - accepted }),
        };
      }
      case "form_attached":
        return {
          text: t("actions.formAttached"),
          note: typeof d.admin_google_email === "string" ? d.admin_google_email : undefined,
        };
      default:
        return { text: t(`actions.${item.action}`) };
    }
  };
}
