"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, CalendarPlus, CheckCircle2, Hourglass, Timer } from "lucide-react";

import { Door, DoorPanel, Plate, Tarma } from "@/components/najdi";
import { Countdown } from "@/components/pipeline/countdown";
import { useTimeAgo } from "@/lib/format";
import { TEAM_ICON, tarmaFor, useDepartmentName, useFormatDateRange, useStageWords } from "@/components/pipeline/shared";
import { TeamActionButtons } from "@/components/pipeline/team-actions";
import { tabOf, useFieldLabel, type FormTab } from "@/components/pipeline/submit-bar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { usePipelineRequest } from "@/hooks/use-pipeline";
import { cn } from "@/lib/utils";
import type { EventRequestSummary, InboxItem } from "@/lib/pipeline-types";

type Why = "returned" | "hold" | "lost" | "ready";

/**
 * Which of the caller's own requests is waiting on them, most urgent first: a
 * returned request is on a fix clock, a held draft on a hold clock, a request
 * that lost its dates needs new ones, and a ready one needs publishing.
 */
export function waitingOnYou(requests: EventRequestSummary[]) {
  const now = new Date().toISOString();
  const out: { request: EventRequestSummary; why: Why }[] = [];
  for (const r of requests) {
    if (r.stage === "returned") out.push({ request: r, why: "returned" });
    else if (r.stage === "draft" && (r.undated_reason || !r.start_date || (r.hold_expires_at && r.hold_expires_at <= now)))
      out.push({ request: r, why: "lost" });
    else if (r.stage === "draft") out.push({ request: r, why: "hold" });
    else if (r.stage === "ready") out.push({ request: r, why: "ready" });
  }
  const rank: Record<Why, number> = { returned: 0, hold: 1, lost: 2, ready: 3 };
  return out.sort(
    (a, b) =>
      rank[a.why] - rank[b.why] ||
      (a.request.hold_expires_at ?? "9").localeCompare(b.request.hold_expires_at ?? "9") ||
      (a.request.start_date ?? "9").localeCompare(b.request.start_date ?? "9"),
  );
}

/**
 * The one painted door on the dashboard: the request that is waiting on the
 * reader, with its clock, how far it has come and the action that moves it.
 * Ochre while it is simply their turn, madder when it came back. `big` (the
 * desktop column) also lists what each form is still missing.
 */
export function YourTurn({
  waiting,
  teamTasks = [],
  isPending,
  big = false,
}: {
  waiting: ReturnType<typeof waitingOnYou>;
  /** What waits on the caller's teams, oldest first. Takes the door when their own department has nothing. */
  teamTasks?: InboxItem[];
  isPending: boolean;
  big?: boolean;
}) {
  const t = useTranslations("dashboard.yourTurn");
  const first = waiting[0];
  const { data: detail } = usePipelineRequest(first?.request.id ?? "", { enabled: !!first });

  if (isPending) return <Skeleton className="h-64 w-full rounded-xl" />;
  if (!first && teamTasks[0]) return <TeamTaskDoor item={teamTasks[0]} more={teamTasks.length - 1} big={big} />;
  if (!first) {
    return (
      <section className="bg-card ring-rule flex items-center gap-3 rounded-xl px-4 py-4 ring-1">
        <Plate tone="green" icon={CheckCircle2} />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="text-[15px] font-bold">{t("noneTitle")}</h2>
          <p className="text-ink-2 text-[13px]">{t("noneBody")}</p>
        </div>
        <Button asChild variant="ochre" size="sm" className="shrink-0 max-sm:hidden">
          <Link href="/pipeline?book=1">
            <CalendarPlus />
            {t("book")}
          </Link>
        </Button>
      </section>
    );
  }

  return <TurnDoor request={first.request} why={first.why} detail={detail} more={waiting.length - 1} big={big} />;
}

function TurnDoor({
  request,
  why,
  detail,
  more,
  big,
}: {
  request: EventRequestSummary;
  why: Why;
  detail: ReturnType<typeof usePipelineRequest>["data"];
  more: number;
  big: boolean;
}) {
  const t = useTranslations("dashboard.yourTurn");
  const tp = useTranslations("pipeline");
  const departmentName = useDepartmentName();
  const formatRange = useFormatDateRange();
  const stageWords = useStageWords();
  const fieldLabel = useFieldLabel();
  const returned = why === "returned";
  const href = `/pipeline/requests/${request.id}`;
  const missing = detail?.missing.filter((f) => f !== "dates") ?? [];

  // The first missing field of each form, for the desktop door.
  const firstMissing = (["details", "design", "logistics"] as FormTab[])
    .map((tab) => ({ tab, field: missing.find((f) => (tabOf(f) ?? "details") === tab) }))
    .filter((x): x is { tab: FormTab; field: string } => !!x.field);

  const clock =
    why === "hold" && request.hold_expires_at ? (
      <span className="inline-flex items-center gap-1.5 text-[13px] font-medium">
        <Hourglass className="size-4" aria-hidden="true" />
        {t("holdEnds")}
        {detail ? (
          <Countdown until={request.hold_expires_at} serverNow={detail.now} format="clock" plain className="text-[15px]" />
        ) : null}
      </span>
    ) : returned && detail?.return_due_at ? (
      <span className="inline-flex items-center gap-1.5 text-[13px] font-medium">
        <Timer className="size-4" aria-hidden="true" />
        {tp("review.fixWithin")}
        <Countdown until={detail.return_due_at} serverNow={detail.now} format="clock" plain className="text-[15px]" />
      </span>
    ) : null;

  const footNote =
    why === "hold" && detail
      ? missing.length
        ? tp("submit.stillMissing", { count: missing.length })
        : tp("submit.complete")
      : why === "lost"
        ? tp(request.undated_reason === "day_banned" ? "request.lostDatesBanned" : "request.lostDatesExpired")
        : why === "ready"
          ? t("readyNote")
          : returned
            ? t("returnedNote")
            : null;

  return (
    <Door tone={returned || why === "lost" ? "madder" : "ochre"} aria-labelledby="your-turn">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 id="your-turn" className="font-display text-[21px] leading-tight font-semibold">
          {t("title")}
        </h2>
        {clock}
      </div>
      <DoorPanel>
        <h3 className={cn("leading-snug font-bold", big ? "text-[21px]" : "text-[19px]")}>
          <bdi>{request.title || tp("requests.untitled")}</bdi>
        </h3>
        <p className="text-[13.5px] opacity-80">
          {departmentName(request.department)} ·{" "}
          <span className="tabular">{request.start_date ? formatRange(request.start_date, request.end_date) : tp("requests.noDates")}</span>
        </p>
        <div className="mt-1.5 flex items-center gap-2.5 text-[13px] font-bold">
          <Tarma {...tarmaFor(request.stage)} size={15} label={stageWords(request.stage)} />
          <span>{stageWords(request.stage)}</span>
        </div>
        {big && why === "hold" && firstMissing.length ? (
          <ul className="mt-2 flex flex-col gap-1.5 border-t border-[var(--door-panel-rule)] pt-2.5">
            {firstMissing.map(({ tab, field }) => (
              <li key={tab} className="flex justify-between gap-3 text-[13.5px]">
                <span>{tp(`request.tabs.${tab}`)}</span>
                <b className="text-door-ochre-ink font-bold">{fieldLabel(field)}</b>
              </li>
            ))}
          </ul>
        ) : null}
        {returned && detail?.return_notes ? (
          <p className="mt-1.5 line-clamp-3 border-t border-[var(--door-panel-rule)] pt-2 text-[13.5px] font-medium">
            {detail.return_notes}
          </p>
        ) : null}
      </DoorPanel>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <Button
          asChild
          size="lg"
          className={
            returned || why === "lost"
              ? "bg-card text-foreground hover:bg-card/90"
              : "bg-on-door-ochre text-white hover:bg-on-door-ochre/85"
          }
        >
          <Link href={href}>
            {t(`action.${why}`)}
            <ArrowLeft className="ltr:-scale-x-100" />
          </Link>
        </Button>
        {footNote ? <span className="text-[13.5px] font-bold">{footNote}</span> : null}
      </div>
      {more > 0 ? (
        <Link href="/pipeline" className="w-fit text-[13px] font-bold underline underline-offset-3">
          {t("more", { count: more })}
        </Link>
      ) : null}
    </Door>
  );
}

/**
 * A team's task in the dashboard's door: the oldest request waiting on one of
 * the caller's teams, with the buttons that finish it right here.
 */
function TeamTaskDoor({ item, more, big }: { item: InboxItem; more: number; big: boolean }) {
  const t = useTranslations("dashboard.yourTurn");
  const tp = useTranslations("pipeline");
  const departmentName = useDepartmentName();
  const formatRange = useFormatDateRange();
  const stageWords = useStageWords();
  const timeAgo = useTimeAgo();
  const request = item.request;
  const { data: detail } = usePipelineRequest(request.id);
  const TeamIcon = TEAM_ICON[item.team];

  return (
    <Door tone="ochre" aria-labelledby="team-task">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 id="team-task" className="font-display text-[21px] leading-tight font-semibold">
          {t("teamTitle")}
        </h2>
        <span className="bg-on-door-ochre inline-flex h-7 items-center gap-1.5 rounded-sm px-2.5 text-[13px] font-bold text-white">
          <TeamIcon className="size-4" aria-hidden="true" />
          {tp(`teams.${item.team}`)}
        </span>
      </div>
      <DoorPanel>
        <h3 className={cn("leading-snug font-bold", big ? "text-[21px]" : "text-[19px]")}>
          <bdi>{request.title || tp("requests.untitled")}</bdi>
        </h3>
        <p className="text-[13.5px] opacity-80">
          {departmentName(request.department)} ·{" "}
          <span className="tabular">{request.start_date ? formatRange(request.start_date, request.end_date) : tp("requests.noDates")}</span>
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] font-bold">
          <Tarma {...tarmaFor(request.stage)} size={15} label={stageWords(request.stage)} />
          <span>{stageWords(request.stage)}</span>
          {item.opened_at ? <span className="ms-auto font-medium opacity-80">{t("teamArrived", { ago: timeAgo(item.opened_at) })}</span> : null}
        </div>
      </DoorPanel>
      {detail ? <TeamActionButtons request={detail} /> : <Skeleton className="h-11 w-full rounded-lg bg-black/10" />}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <Link href={`/pipeline/requests/${request.id}`} className="inline-flex min-h-11 items-center gap-1.5 text-[14px] font-bold underline underline-offset-3">
          {t("teamOpen")}
          <ArrowLeft className="size-4 ltr:-scale-x-100" aria-hidden="true" />
        </Link>
        {more > 0 ? (
          <Link href="/pipeline" className="text-[13px] font-bold underline underline-offset-3">
            {t("teamMore", { count: more })}
          </Link>
        ) : null}
      </div>
    </Door>
  );
}
