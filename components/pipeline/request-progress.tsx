"use client";

import { useTranslations } from "next-intl";
import { Check, CornerUpLeft, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import type { EventRequestDetail, EventRequestStage, PipelineTeam, TaskStatus } from "@/lib/pipeline-types";

/** The path every request walks. "Returned" is a detour inside the review step. */
const STEPS = ["draft", "in_review", "media", "ready", "published"] as const;

const STEP_OF: Record<EventRequestStage, number> = {
  draft: 0,
  in_review: 1,
  returned: 1,
  media: 2,
  ready: 3,
  published: 4,
  cancelled: -1,
};

const TEAMS_OF_STEP: Partial<Record<(typeof STEPS)[number], PipelineTeam[]>> = {
  in_review: ["design", "logistics"],
  media: ["media"],
};

const TASK_TONE: Record<TaskStatus, string> = {
  brief: "text-muted-foreground",
  open: "text-brand-yellow-ink",
  returned: "text-brand-red-ink",
  done: "text-brand-green-ink",
};

/** Where the request is on its way to an event, and how each team is doing. */
export function RequestProgress({ request }: { request: EventRequestDetail }) {
  const t = useTranslations("pipeline");
  const current = STEP_OF[request.stage];

  if (current < 0) {
    return (
      <div className="bg-muted/60 text-muted-foreground flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium">
        <XCircle className="h-4 w-4" />
        {t("progress.cancelled")}
      </div>
    );
  }

  const returned = request.stage === "returned";
  const tasks = new Map(request.tasks.map((task) => [task.team, task]));

  const teamLines = (step: (typeof STEPS)[number]) =>
    (TEAMS_OF_STEP[step] ?? [])
      .map((team) => tasks.get(team))
      .filter((task) => !!task)
      .map((task) => (
        <span key={task.team} className={cn("text-xs", TASK_TONE[task.status])}>
          {t(`teams.${task.team}`)} · {t(`review.status.${task.status}`)}
        </span>
      ));

  return (
    <section aria-label={t("progress.label")} className="bg-card border-border rounded-xl border p-4 sm:p-5">
      {/* Phone: one bar and the current step in words. */}
      <div className="flex flex-col gap-2.5 md:hidden">
        <div className="flex gap-1" aria-hidden="true">
          {STEPS.map((step, i) => (
            <span
              key={step}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                i < current || request.stage === "published"
                  ? "bg-brand-green"
                  : i === current
                    ? returned
                      ? "bg-brand-red"
                      : "bg-brand-blue"
                    : "bg-muted",
              )}
            />
          ))}
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-muted-foreground text-xs">
            {t("progress.step", { current: current + 1, total: STEPS.length })}
          </span>
          <span className={cn("text-sm font-semibold", returned && "text-brand-red-ink")}>{t(`stage.${request.stage}`)}</span>
          <div className="flex flex-wrap gap-x-3">{teamLines(STEPS[current])}</div>
        </div>
      </div>

      {/* Wider: the whole path. */}
      <ol className="hidden md:flex md:items-start">
        {STEPS.map((step, i) => {
          const done = i < current || request.stage === "published";
          const active = i === current && !done;
          const isReturned = active && returned;
          return (
            <li key={step} className="relative flex flex-1 flex-col items-center gap-2 text-center">
              {i > 0 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-4 h-0.5 w-[calc(100%-2.5rem)] -translate-y-1/2 end-[calc(50%+1.25rem)]",
                    i <= current ? "bg-brand-green" : "bg-border",
                  )}
                />
              ) : null}
              <span
                className={cn(
                  "relative flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold",
                  done && "bg-brand-green text-white",
                  active && !isReturned && "bg-brand-blue-soft text-brand-blue-ink ring-brand-blue ring-2",
                  isReturned && "bg-brand-red-soft text-brand-red-ink ring-brand-red ring-2",
                  !done && !active && "bg-muted text-muted-foreground",
                )}
              >
                {done ? <Check className="h-4 w-4" /> : isReturned ? <CornerUpLeft className="h-4 w-4" /> : i + 1}
              </span>
              <div className="flex flex-col gap-0.5 px-1">
                <span
                  className={cn(
                    "text-[13px] leading-tight",
                    active ? "font-semibold" : "text-muted-foreground font-medium",
                    isReturned && "text-brand-red-ink",
                  )}
                >
                  {t(`stage.${isReturned ? "returned" : step}`)}
                </span>
                {i <= current ? <div className="flex flex-col">{teamLines(step)}</div> : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
