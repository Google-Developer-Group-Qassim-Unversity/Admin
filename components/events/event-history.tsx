"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";

import { HistoryList, type HistoryEntry } from "@/components/history-list";
import { Button } from "@/components/ui/button";
import { useEventHistory } from "@/hooks/use-event";
import type { EventHistory as EventHistoryData } from "@/lib/api-types";
import { useFormatters } from "@/lib/format";

type Item = EventHistoryData["items"][number];
type Person = { member_id: number; name: string };

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
  const { data } = useEventHistory(eventId);
  const describe = useDescribe();

  if (!data || (!data.items.length && !data.pipeline_request_id)) return null;
  const entries: HistoryEntry[] = [...data.items].reverse().map((item) => ({
    at: item.at,
    actor: item.actor?.name ?? t("unknown"),
    ...describe(item),
  }));

  return (
    <HistoryList
      id="event-history"
      title={t("title")}
      hint={t("hint")}
      entries={entries}
      showAll={(count) => t("showAll", { count })}
      footer={
        data.pipeline_request_id ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`/pipeline/requests/${data.pipeline_request_id}`}>
              {t("pipeline")}
              <ArrowRight className="rtl:-scale-x-100" />
            </Link>
          </Button>
        ) : null
      }
    />
  );
}

function useDescribe() {
  const t = useTranslations("eventHistory");
  const locale = useLocale();
  const fmt = useFormatters();

  const people = (value: unknown) =>
    (Array.isArray(value) ? (value as Person[]) : []).map((p) => p.name).join(locale === "ar" ? "، " : ", ");
  const shown = (field: string, value: unknown) => {
    if (value === null || value === undefined || value === "") return t("empty");
    if (field === "status") return t.has(`statuses.${value}`) ? t(`statuses.${value}`) : String(value);
    if (field.endsWith("_datetime")) return fmt.dateTime(String(value));
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
