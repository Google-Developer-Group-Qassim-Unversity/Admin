import type {
  EffectiveRegistrationStatus,
  Event,
  EventPhase,
  EventStatus,
  FormType,
  RegistrationStatus,
} from "@/lib/api-types";
import { parseLocalDateTime } from "@/lib/utils";

/**
 * The combined event lifecycle state shown to admins:
 *   - draft: unpublished draft
 *   - upcoming: published, hasn't started yet
 *   - live: published, currently running
 *   - ended: published, past its end time
 *   - cancelled: explicitly cancelled
 */
export type EventLifecycleState = "draft" | "upcoming" | "live" | "ended" | "cancelled";

type PhaseLikeEvent = Pick<Event, "start_datetime" | "end_datetime"> & {
  phase?: EventPhase | null;
};

type LifecycleLikeEvent = PhaseLikeEvent & {
  status: EventStatus;
};

type RegistrationLikeEvent = LifecycleLikeEvent & {
  form_type?: FormType | null;
  registration_status?: RegistrationStatus | null;
  effective_registration_status?: EffectiveRegistrationStatus;
  is_registration_open?: boolean;
};

/**
 * Derive an event's schedule phase. Prefers the server-computed `phase`
 * (anchored to Riyadh wall-clock time) and falls back to local wall-clock
 * comparison when a payload omits it.
 */
export function resolveEventPhase(event: PhaseLikeEvent, now: number = Date.now()): EventPhase {
  if (event.phase === "upcoming" || event.phase === "live" || event.phase === "ended") {
    return event.phase;
  }
  const start = parseLocalDateTime(event.start_datetime).getTime();
  const end = parseLocalDateTime(event.end_datetime).getTime();
  if (now < start) return "upcoming";
  if (now <= end) return "live";
  return "ended";
}

/** Combine publication status and schedule phase into one display state. */
export function resolveLifecycleState(event: LifecycleLikeEvent, now: number = Date.now()): EventLifecycleState {
  if (event.status === "draft") return "draft";
  if (event.status === "cancelled") return "cancelled";
  return resolveEventPhase(event, now);
}

/**
 * Derive the effective registration state for an event. Prefers the server's
 * `effective_registration_status` and falls back to mirroring
 * `Backend/app/services/event_lifecycle.py` when absent.
 */
export function resolveEffectiveRegistration(
  event: RegistrationLikeEvent,
  now: number = Date.now(),
): EffectiveRegistrationStatus {
  if (
    event.effective_registration_status === "none" ||
    event.effective_registration_status === "not_open" ||
    event.effective_registration_status === "open" ||
    event.effective_registration_status === "closed"
  ) {
    return event.effective_registration_status;
  }

  if (!event.form_type || event.form_type === "none") {
    return "none";
  }

  const end = parseLocalDateTime(event.end_datetime).getTime();
  const regStatus = event.registration_status ?? "not_open";

  if (event.status === "cancelled") {
    return "closed";
  }

  if (event.status === "draft") {
    return "not_open";
  }

  if (now > end || regStatus === "closed") {
    return "closed";
  }

  if (regStatus === "not_open") {
    return "not_open";
  }

  return "open";
}

export function isEventRegistrationOpen(event: RegistrationLikeEvent, now: number = Date.now()): boolean {
  if (typeof event.is_registration_open === "boolean") {
    return event.is_registration_open;
  }
  return resolveEffectiveRegistration(event, now) === "open";
}

export function isEventLive(event: LifecycleLikeEvent, now: number = Date.now()): boolean {
  return event.status === "published" && resolveEventPhase(event, now) === "live";
}

export function isEventUpcoming(event: LifecycleLikeEvent, now: number = Date.now()): boolean {
  return event.status === "published" && resolveEventPhase(event, now) === "upcoming";
}

export function isEventEnded(event: LifecycleLikeEvent, now: number = Date.now()): boolean {
  return event.status === "published" && resolveEventPhase(event, now) === "ended";
}

export function isCustomEvent(event: Pick<Event, "location_type">): boolean {
  return event.location_type === "none" || event.location_type === "hidden";
}
