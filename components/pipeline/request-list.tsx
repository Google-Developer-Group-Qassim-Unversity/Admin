"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronRight, Hourglass } from "lucide-react";

import { Plate, Tarma, INK } from "@/components/najdi";
import { TurnLine, isMyTurn, whoseTurn, type PipelineRole } from "@/components/pipeline/roles";
import {
  STAGE_ICON,
  tarmaFor,
  useDepartmentName,
  useFormatDateRange,
  useStageWords,
} from "@/components/pipeline/shared";
import { STAGE_TONE, stageToneFor } from "@/components/status-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { EventRequestSummary } from "@/lib/pipeline-types";

/** "14h 32m" until an ISO time, from the browser's clock. Rows only; a door uses the server's clock. */
function useHoldLeft() {
  const t = useTranslations("pipeline.countdown");
  return (until: string) => {
    const left = new Date(until).getTime() - Date.now();
    if (left <= 0) return t("expired");
    const minutes = Math.floor(left / 60000);
    return t("left", { hours: Math.floor(minutes / 60), minutes: String(minutes % 60).padStart(2, "0") });
  };
}

/**
 * One request on the wall: a plate in its stage's colour, the title, who and
 * when, and the five tarma openings with the stage in words. A held draft also
 * shows how long its hold has left.
 *
 * Given the reader's `role`, the row also says whose turn it is, and a stage
 * that is someone else's move loses its "your move" ochre: a super admin's
 * list of every department must not read as a list of chores.
 */
export function RequestRow({
  request,
  role,
  showDepartment = true,
  extra,
  className,
}: {
  request: EventRequestSummary;
  role?: PipelineRole;
  showDepartment?: boolean;
  /** A trailing note on the progress line, e.g. how long it has waited. */
  extra?: React.ReactNode;
  className?: string;
}) {
  const t = useTranslations("pipeline");
  const departmentName = useDepartmentName();
  const formatRange = useFormatDateRange();
  const stageWords = useStageWords();
  const holdLeft = useHoldLeft();
  const mine = role ? isMyTurn(role, request) : true;
  // A team step's own line names each team and how far it has got, which says more than the stage's words.
  const teamsSay = Boolean(role) && !mine && whoseTurn(request)?.kind === "teams";
  const tone = role ? stageToneFor(request.stage, mine) : STAGE_TONE[request.stage];
  const held = request.stage === "draft" && request.hold_expires_at;

  return (
    <Link
      href={`/pipeline/requests/${request.id}`}
      className={cn(
        "border-rule group hover:bg-card focus-visible:bg-card active:bg-sunk flex min-h-16 items-center gap-3 border-b px-1 py-3 outline-none transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
        className,
      )}
    >
      <Plate tone={tone} icon={STAGE_ICON[request.stage]} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <b className="truncate text-[15px] leading-snug font-bold"><bdi>{request.title || t("requests.untitled")}</bdi></b>
        <span className="text-ink-2 truncate text-[13px]">
          {showDepartment ? <><bdi>{departmentName(request.department)}</bdi> · </> : null}
          <span className="tabular">{request.start_date ? formatRange(request.start_date, request.end_date) : t("requests.noDates")}</span>
        </span>
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] font-bold">
          <Tarma {...tarmaFor(request.stage)} size={11} label={stageWords(request.stage)} />
          {teamsSay ? null : <span className={INK[tone]}>{t(`stage.${request.stage}`)}</span>}
          {role ? (
            <>
              {teamsSay ? null : <span aria-hidden="true" className="text-ink-3">·</span>}
              <TurnLine request={request} role={role} showDepartment={showDepartment} />
            </>
          ) : null}
          {held ? (
            <span className={cn("ms-auto inline-flex items-center gap-1", mine ? INK.ochre : "text-ink-2")}>
              <Hourglass className="size-3.5" aria-hidden="true" />
              <span className="tabular">{holdLeft(request.hold_expires_at!)}</span>
            </span>
          ) : null}
          {extra ? <span className={cn("text-ink-2 font-medium", !held && "ms-auto")}>{extra}</span> : null}
        </span>
      </span>
      <ChevronRight className="text-ink-3 group-hover:text-foreground size-[18px] shrink-0 transition-colors rtl:-scale-x-100" />
    </Link>
  );
}

export function RequestRowsSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="flex flex-col">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="border-rule flex items-center gap-3 border-b px-1 py-3">
          <Skeleton className="h-11 w-10" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** A list of requests as rows, with its loading and empty states. */
export function RequestList({
  items,
  isPending,
  empty,
  role,
  showDepartment = true,
  extra,
}: {
  items: EventRequestSummary[] | undefined;
  isPending: boolean;
  empty: React.ReactNode;
  role?: PipelineRole;
  showDepartment?: boolean;
  extra?: (request: EventRequestSummary) => React.ReactNode;
}) {
  if (isPending) return <RequestRowsSkeleton />;
  if (!items?.length) return <p className="text-ink-2 py-5 text-sm text-pretty">{empty}</p>;

  return (
    <ul className="flex flex-col">
      {items.map((r) => (
        <li key={r.id}>
          <RequestRow request={r} role={role} showDepartment={showDepartment} extra={extra?.(r)} />
        </li>
      ))}
    </ul>
  );
}
