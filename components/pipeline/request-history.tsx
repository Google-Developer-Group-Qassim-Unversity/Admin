"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { History } from "lucide-react";

import { useFormatDateRange } from "@/components/pipeline/shared";
import { Button } from "@/components/ui/button";
import type { EventRequestDetail, HistoryItem, PipelineTeam } from "@/lib/pipeline-types";

const COLLAPSED = 6;

/**
 * Who did what to the request, newest first: every step, edit and automatic
 * change, each with the person and the time. When something goes wrong, this
 * says who to talk to.
 */
export function RequestHistory({ request }: { request: EventRequestDetail }) {
  const t = useTranslations("pipeline.history");
  const locale = useLocale();
  const describe = useDescribe();
  const [expanded, setExpanded] = React.useState(false);
  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const items = [...request.history].reverse();
  const visible = expanded ? items : items.slice(0, COLLAPSED);

  if (!items.length) return null;

  return (
    <section className="bg-card border-border flex flex-col gap-4 rounded-xl border p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="bg-muted text-muted-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
          <History className="h-[18px] w-[18px]" />
        </span>
        <div className="flex flex-col gap-0.5">
          <h2 className="font-display text-base font-semibold tracking-tight">{t("title")}</h2>
          <p className="text-muted-foreground text-[13px]">{t("hint")}</p>
        </div>
      </div>
      <ol className="flex flex-col">
        {visible.map((item, index) => {
          const { text, note } = describe(item);
          return (
            <li key={`${item.at}-${index}`} className="relative flex gap-3 pb-4 last:pb-0">
              <span className="flex w-2.5 shrink-0 flex-col items-center pt-1.5">
                <span className="bg-brand-blue h-2.5 w-2.5 rounded-full" />
                {index < visible.length - 1 ? <span className="bg-border mt-1 w-px flex-1" /> : null}
              </span>
              <div className="flex min-w-0 flex-col gap-0.5">
                <p className="text-sm">
                  <span className="font-semibold">{item.actor?.name ?? t("automatic")}</span> {text}
                </p>
                {note ? (
                  <p className="text-muted-foreground text-xs break-words whitespace-pre-wrap">{note}</p>
                ) : null}
                <time dateTime={item.at} className="text-muted-foreground tabular text-xs">
                  {formatter.format(new Date(item.at))}
                </time>
              </div>
            </li>
          );
        })}
      </ol>
      {items.length > visible.length ? (
        <div>
          <Button variant="ghost" size="sm" onClick={() => setExpanded(true)}>
            {t("showAll", { count: items.length })}
          </Button>
        </div>
      ) : null}
    </section>
  );
}

/** One history row in words: what was done, and any detail worth a second line. */
function useDescribe() {
  const t = useTranslations("pipeline.history.actions");
  const tt = useTranslations("pipeline.teams");
  const formatRange = useFormatDateRange();
  const range = (pair: unknown) => {
    const [start, end] = (Array.isArray(pair) ? pair : []) as (string | null)[];
    return start ? formatRange(start, end) : "-";
  };

  return (item: HistoryItem): { text: string; note?: string } => {
    const d = item.details ?? {};
    const team = typeof d.team === "string" ? tt(d.team as PipelineTeam) : "";
    switch (item.action) {
      case "booked":
        return { text: t("booked", { dates: range([d.start_date, d.end_date]) }) };
      case "redated":
        return { text: t("redated", { dates: range(d.to) }) };
      case "details_edited":
        return { text: t(d.after_submit ? "detailsEditedAfterSubmit" : "detailsEdited") };
      case "brief_edited":
        return { text: t(d.after_submit ? "briefEditedAfterSubmit" : "briefEdited", { team }) };
      case "returned":
        return { text: t("returned"), note: typeof d.notes === "string" ? d.notes : undefined };
      case "resubmitted":
        return {
          text: t("resubmitted"),
          note: d.late_days ? t("late", { days: Number(d.late_days), points: Number(d.points) }) : undefined,
        };
      case "dates_moved":
        return { text: t("datesMoved", { from: range(d.from), to: range(d.to) }) };
      case "poster_uploaded":
        return { text: t(d.replaced ? "posterReplaced" : "posterUploaded") };
      case "task_done":
        return { text: t("taskDone", { team }) };
      case "published":
        return { text: t("published", { id: Number(d.event_id) }) };
      case "hold_expired":
        return { text: t("holdExpired") };
      case "dates_banned":
        return {
          text: t("datesBanned", { dates: range([d.start_date, d.end_date]) }),
          note: typeof d.reason === "string" ? d.reason : undefined,
        };
      case "penalty_grown":
        return { text: t("penaltyGrown", { days: Number(d.late_days), points: Number(d.points) }) };
      case "event_deleted":
        return { text: t("eventDeleted", { id: Number(d.event_id) }) };
      default:
        return { text: t(item.action) };
    }
  };
}
