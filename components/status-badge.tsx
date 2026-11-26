"use client";

import { useTranslations } from "next-intl";

import { FILL, SOFT, type DoorTone, type Tone } from "@/components/najdi";
import type {
  EffectiveRegistrationStatus,
  EmailJobStatus,
  Event,
  EventPhase,
  EventStatus,
  FormType,
  RegistrationStatus,
} from "@/lib/api-types";
import {
  resolveEffectiveRegistration,
  resolveLifecycleState,
  type EventLifecycleState,
} from "@/lib/event-lifecycle";

/**
 * The one status vocabulary. Colour is bound to state everywhere in the
 * console (DESIGN.md §1), so these maps are the only place a status gets a
 * colour: indigo upcoming/informational, green live or done, ochre waiting on
 * someone, madder cancelled/returned/failed, umber draft or ended.
 */
export const EVENT_LIFECYCLE_TONE: Record<EventLifecycleState, DoorTone> = {
  draft: "umber",
  upcoming: "indigo",
  live: "green",
  ended: "umber",
  cancelled: "madder",
};

/** Raw publication status tones (use `EVENT_LIFECYCLE_TONE` when phase is available). */
export const EVENT_TONE: Record<EventStatus, DoorTone> = {
  draft: "umber",
  published: "green",
  cancelled: "madder",
};

/** Registration state tones (rendered as a secondary pill/label beside lifecycle status). */
export const REGISTRATION_TONE: Record<EffectiveRegistrationStatus, Tone> = {
  open: "green",
  not_open: "ochre",
  closed: "neutral",
  none: "neutral",
};

export type Urgency = "waiting" | "overdue" | "info" | "done";

export const URGENCY_TONE: Record<Urgency, DoorTone> = {
  waiting: "ochre",
  overdue: "madder",
  info: "indigo",
  done: "green",
};


/** A send on the Mail page: going out (ochre), sent with nothing failed (green), some or all failed (madder). */
export const SEND_TONE: Record<EmailJobStatus, DoorTone> = {
  queued: "ochre",
  running: "ochre",
  succeeded: "green",
  partial: "madder",
  failed: "madder",
};

/** A content link on the event page: live for members (green) or hidden (umber). */
export const CONTENT_LINK_TONE: Record<"published" | "unpublished", DoorTone> = {
  published: "green",
  unpublished: "umber",
};

/** Club Google Forms OAuth connection status on Settings. */
export const GOOGLE_AUTH_TONE: Record<"connected" | "unreachable" | "expired", DoorTone> = {
  connected: "green",
  unreachable: "ochre",
  expired: "madder",
};

const PILL = "inline-flex w-fit items-center gap-1.5 rounded-sm px-2 py-1 text-[12px] leading-none font-bold";
const SQUARE = "inline-block size-2 shrink-0 rounded-[1px]";

type StatusBadgeEvent = Pick<Event, "status" | "start_datetime" | "end_datetime"> & {
  phase?: EventPhase | null;
};

type StatusDotProps =
  | { event: StatusBadgeEvent; now?: number; status?: never; phase?: never; state?: never; className?: string }
  | { state: EventLifecycleState; event?: never; now?: never; status?: never; phase?: never; className?: string }
  | { status: EventStatus; phase?: EventPhase | null; event?: never; now?: never; state?: never; className?: string };

function resolveBadgeState(props: StatusDotProps): EventLifecycleState {
  if ("state" in props && props.state) return props.state;
  if ("event" in props && props.event) return resolveLifecycleState(props.event, props.now);
  if (props.status === "draft") return "draft";
  if (props.status === "cancelled") return "cancelled";
  return props.phase ?? "upcoming";
}

export function StatusDot(props: StatusDotProps) {
  const state = resolveBadgeState(props);
  return (
    <span
      className={`${SQUARE} ${state === "ended" ? "bg-adobe" : FILL[EVENT_LIFECYCLE_TONE[state]]} ${props.className ?? ""}`}
      aria-hidden="true"
    />
  );
}

export function StatusBadge(props: StatusDotProps) {
  const t = useTranslations("events.lifecycle");
  const state = resolveBadgeState(props);

  return (
    <span className={`${PILL} ${state === "ended" ? "bg-sunk text-ink-2" : SOFT[EVENT_LIFECYCLE_TONE[state]]} ${props.className ?? ""}`}>
      <StatusDot state={state} />
      {t(state)}
    </span>
  );
}

type RegistrationBadgeEvent = StatusBadgeEvent & {
  form_type?: FormType | null;
  registration_status?: RegistrationStatus | null;
  effective_registration_status?: EffectiveRegistrationStatus;
  is_registration_open?: boolean;
};

/**
 * Secondary registration indicator, orthogonal to lifecycle status.
 * Use `variant="quiet"` (default) beside a `StatusBadge` in list rows/tables,
 * and `variant="pill"` on detail headers and registration controls.
 */
export function RegistrationBadge({
  event,
  status,
  now,
  variant = "quiet",
  className,
}: {
  event?: RegistrationBadgeEvent;
  status?: EffectiveRegistrationStatus;
  now?: number;
  variant?: "quiet" | "pill";
  className?: string;
}) {
  const t = useTranslations("events.registration");
  const effective = status ?? (event ? resolveEffectiveRegistration(event, now) : "none");
  const label = t(effective);
  const tone = REGISTRATION_TONE[effective];

  if (variant === "pill") {
    return (
      <span className={`${PILL} ${SOFT[tone]} ${className ?? ""}`}>
        <span className={`${SQUARE} ${FILL[tone]}`} aria-hidden="true" />
        {label}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 text-[12px] leading-none font-medium ${
        effective === "open"
          ? "text-door-green-ink font-bold"
          : effective === "not_open"
            ? "text-door-ochre-ink font-bold"
            : "text-ink-2"
      } ${className ?? ""}`}
    >
      <span className={`${SQUARE} ${FILL[tone]}`} aria-hidden="true" />
      {label}
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

/**
 * A stage's tone for a reader it may not be waiting on. Ochre means "your
 * move", so on a request that is someone else's move (a super admin looking at
 * another department's draft) it goes quiet, and the row's "with ..." line says
 * whose move it is instead.
 */
export function stageToneFor(stage: RequestStage, mine: boolean): Tone {
  const tone = STAGE_TONE[stage];
  return tone === "ochre" && !mine ? "neutral" : tone;
}

/**
 * Who someone is in the console. A super admin wears madder: not a rank but a
 * caution, since those powers skip every rule. Staff have no state of their
 * own (neutral), and someone outside this semester's roster is inactive.
 */
export const ROLE_TONE = {
  superAdmin: "madder",
  staff: "neutral",
  regular: "umber",
} as const satisfies Record<string, Tone>;

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

/**
 * A pill for any state: a square mark and a label in the state's tone. Add a
 * new kind of status by mapping it to a tone in this file (like `STAGE_TONE`)
 * and rendering it with this, never with a page's own colours.
 */
export function StatePill({ tone, children, className }: { tone: Tone; children: React.ReactNode; className?: string }) {
  return (
    <span className={`${PILL} ${SOFT[tone]} ${className ?? ""}`}>
      <span className={`${SQUARE} ${FILL[tone]}`} aria-hidden="true" />
      {children}
    </span>
  );
}
