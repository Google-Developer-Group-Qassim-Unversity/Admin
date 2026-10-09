"use client";

import { useTranslations } from "next-intl";
import { XCircle } from "lucide-react";

import { INK, SectionHead, type DoorTone } from "@/components/najdi";
import { STAGE_STEP, STAGE_TONE } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import type { EventRequestDetail, PipelineTeam, TaskStatus } from "@/lib/pipeline-types";

/** The path every request walks. "Returned" is a detour inside the review step. */
const STEPS = ["draft", "in_review", "media", "ready", "published"] as const;

const TEAMS_OF_STEP: Partial<Record<(typeof STEPS)[number], PipelineTeam[]>> = {
  in_review: ["design", "logistics"],
  media: ["media"],
};

const TASK_TONE: Record<TaskStatus, DoorTone> = {
  brief: "umber",
  open: "indigo",
  returned: "madder",
  done: "green",
};

const STROKE: Record<DoorTone, string> = {
  green: "stroke-door-green",
  ochre: "stroke-door-ochre",
  madder: "stroke-door-madder",
  indigo: "stroke-door-indigo-ink",
  umber: "stroke-door-umber",
};
const SOFT_FILL: Record<DoorTone, string> = {
  green: "fill-door-green-soft",
  ochre: "fill-door-ochre-soft",
  madder: "fill-door-madder-soft",
  indigo: "fill-door-indigo-soft",
  umber: "fill-door-umber-soft",
};

/**
 * Where the request is on its way to an event: five tarma openings, filled
 * green as each step is done, the current one outlined in whoever's colour it
 * is, and under each team step how that team is doing.
 */
export function RequestProgress({ request }: { request: EventRequestDetail }) {
  const t = useTranslations("pipeline");
  const current = STAGE_STEP[request.stage];

  if (current < 0) {
    return (
      <div className="bg-sunk text-ink-2 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-bold">
        <XCircle className="size-4" />
        {t("progress.cancelled")}
      </div>
    );
  }

  const returned = request.stage === "returned";
  const published = request.stage === "published";
  const tone = STAGE_TONE[request.stage];
  const tasks = new Map(request.tasks.map((task) => [task.team, task]));

  return (
    <section aria-labelledby="request-progress" className="flex flex-col gap-3">
      <SectionHead
        id="request-progress"
        title={t("progress.label")}
        action={<span className="text-ink-2 font-medium">{t("progress.step", { current: current + 1, total: STEPS.length })}</span>}
      />
      <ol className="grid grid-cols-5 gap-1">
        {STEPS.map((step, i) => {
          const done = published || i < current;
          const active = i === current && !done;
          const teams = (TEAMS_OF_STEP[step] ?? []).map((team) => tasks.get(team)).filter((task) => !!task);
          return (
            <li
              key={step}
              aria-current={active ? "step" : undefined}
              className={cn(
                "flex flex-col items-center gap-1.5 text-center text-[11.5px] leading-tight sm:text-[13px]",
                active ? "text-foreground font-bold" : "text-ink-2 font-medium",
              )}
            >
              <svg viewBox="-1 -1 24 21" width="26" height="23" aria-hidden="true" className="overflow-visible">
                <polygon
                  points="0,19 22,19 11,0.5"
                  strokeLinejoin="round"
                  strokeWidth={active ? 2.2 : 1.6}
                  className={cn(
                    done && "fill-door-green stroke-door-green",
                    active && (returned ? "fill-door-madder stroke-door-madder" : cn(SOFT_FILL[tone], STROKE[tone])),
                    !done && !active && "stroke-adobe fill-none",
                  )}
                />
              </svg>
              <span className={cn(active && returned && INK.madder)}>{t(`stage.${active && returned ? "returned" : step}`)}</span>
              {teams.length && i <= current ? (
                <span className="flex flex-col gap-0.5">
                  {teams.map((task) => (
                    <span key={task.team} className={cn("text-[11px] font-bold sm:text-xs", INK[TASK_TONE[task.status]])}>
                      {t(`teams.${task.team}`)} · {t(`review.status.${task.status}`)}
                    </span>
                  ))}
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
