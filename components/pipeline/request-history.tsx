"use client";

import { useTranslations } from "next-intl";

import { HistoryList, type HistoryEntry } from "@/components/history-list";
import type { Tone } from "@/components/najdi";
import { useFormatDateRange } from "@/components/pipeline/shared";
import type { EventRequestDetail, HistoryItem, PipelineTeam } from "@/lib/pipeline-types";

/**
 * Who did what to the request, newest first: every step, edit and automatic
 * change, each with the person and the time. When something goes wrong, this
 * says who to talk to.
 */
export function RequestHistory({ request }: { request: EventRequestDetail }) {
  const t = useTranslations("pipeline.history");
  const describe = useDescribe();

  if (!request.history.length) return null;
  const entries: HistoryEntry[] = [...request.history].reverse().map((item) => ({
    at: item.at,
    actor: item.actor?.name ?? t("automatic"),
    tone: TONE[item.action],
    ...describe(item),
  }));

  return (
    <HistoryList
      id="request-history"
      title={t("title")}
      hint={t("hint")}
      entries={entries}
      showAll={(count) => t("showAll", { count })}
    />
  );
}

/** The steps that changed the request's state get its colour; the rest are neutral. */
const TONE: Partial<Record<HistoryItem["action"], Tone>> = {
  returned: "madder",
  dates_banned: "madder",
  hold_expired: "madder",
  penalty_grown: "madder",
  event_deleted: "madder",
  task_done: "green",
  published: "green",
};

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
