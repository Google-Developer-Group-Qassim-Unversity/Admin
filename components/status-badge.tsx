"use client";

import { useTranslations } from "next-intl";

import { FILL, SOFT, type DoorTone } from "@/components/najdi";
import type { EventStatus } from "@/lib/api-types";

/**
 * The one status vocabulary. Colour is bound to state everywhere in the
 * console (DESIGN.md §1), so these maps are the only place a status gets a
 * colour: indigo open, green running or done, ochre waiting on someone, madder
 * overdue or failed, umber draft or finished.
 */
const EVENT_TONE: Record<EventStatus, DoorTone> = {
  draft: "umber",
  open: "indigo",
  active: "green",
  closed: "umber",
};

export type Urgency = "waiting" | "overdue" | "info" | "done";

export const URGENCY_TONE: Record<Urgency, DoorTone> = {
  waiting: "ochre",
  overdue: "madder",
  info: "indigo",
  done: "green",
};


const PILL = "inline-flex w-fit items-center gap-1.5 rounded-sm px-2 py-1 text-[12px] leading-none font-bold";
const SQUARE = "inline-block size-2 shrink-0 rounded-[1px]";

export function StatusDot({ status, className }: { status: EventStatus; className?: string }) {
  return (
    <span
      className={`${SQUARE} ${status === "closed" ? "bg-adobe" : FILL[EVENT_TONE[status]]} ${className ?? ""}`}
      aria-hidden="true"
    />
  );
}

export function StatusBadge({ status, className }: { status: EventStatus; className?: string }) {
  const t = useTranslations("events.status");

  return (
    <span className={`${PILL} capitalize ${status === "closed" ? "bg-sunk text-ink-2" : SOFT[EVENT_TONE[status]]} ${className ?? ""}`}>
      <StatusDot status={status} />
      {t(status)}
    </span>
  );
}

export function UrgencyDot({ urgency, className }: { urgency: Urgency; className?: string }) {
  return <span className={`${SQUARE} size-2.5 ${FILL[URGENCY_TONE[urgency]]} ${className ?? ""}`} aria-hidden="true" />;
}

/**
 * Events pipeline calendar days, laid as bricks: a day nobody can book is sunk
 * into the wall, a closed day is madder, a day held by a draft waits in ochre,
 * a booked day is an indigo plate, a published event a green one.
 */
export type PipelineDayStatus = "locked" | "banned" | "open" | "held" | "booked" | "published";

export const PIPELINE_DAY_STYLES: Record<PipelineDayStatus, { dot: string; cell: string }> = {
  locked: { dot: "bg-sunk shadow-[inset_0_0_0_1px_var(--rule)]", cell: "bg-sunk text-ink-3" },
  banned: { dot: "bg-door-madder-soft shadow-[inset_0_0_0_1px_var(--door-madder-ink)]", cell: "bg-door-madder-soft text-door-madder-ink" },
  open: { dot: "bg-card shadow-[inset_0_0_0_1px_var(--rule)]", cell: "bg-card text-foreground" },
  held: { dot: "bg-door-ochre-soft shadow-[inset_0_0_0_1.5px_var(--door-ochre)]", cell: "bg-door-ochre-soft text-door-ochre-ink shadow-[inset_0_0_0_1.5px_var(--door-ochre)]" },
  booked: { dot: "bg-door-indigo", cell: "bg-door-indigo text-on-door" },
  published: { dot: "bg-door-green", cell: "bg-door-green text-on-door" },
};

/** Where an event request is. */
export type RequestStage = "draft" | "in_review" | "returned" | "media" | "ready" | "published" | "cancelled";

/**
 * Whose turn a stage is: ochre when it is the requesting department's move
 * (fill in the draft, publish when ready), indigo while a team has it, madder
 * when it came back, green when it is out.
 */
export const STAGE_TONE: Record<RequestStage, DoorTone> = {
  draft: "ochre",
  in_review: "indigo",
  returned: "madder",
  media: "indigo",
  ready: "ochre",
  published: "green",
  cancelled: "umber",
};

/** The step a stage sits on in the five-step path; -1 for a cancelled request. */
export const STAGE_STEP: Record<RequestStage, number> = {
  draft: 0,
  in_review: 1,
  returned: 1,
  media: 2,
  ready: 3,
  published: 4,
  cancelled: -1,
};

export function StageBadge({ stage, className }: { stage: RequestStage; className?: string }) {
  const t = useTranslations("pipeline.stage");
  const tone = STAGE_TONE[stage];
  return (
    <span className={`${PILL} ${stage === "cancelled" ? "bg-sunk text-ink-2" : SOFT[tone]} ${className ?? ""}`}>
      <span className={`${SQUARE} ${FILL[tone]}`} aria-hidden="true" />
      {t(stage)}
    </span>
  );
}
