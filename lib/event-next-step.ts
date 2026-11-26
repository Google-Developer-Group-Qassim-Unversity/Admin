import type { Event } from "@/lib/api-types";
import type { Urgency } from "@/components/status-badge";
import { resolveEffectiveRegistration, resolveEventPhase } from "@/lib/event-lifecycle";
import { parseLocalDateTime } from "@/lib/utils";

export interface NextStep {
  /** Key under `events.nextStep` in the message catalogue. */
  key: "publish" | "openRegistration" | "review" | "prepareAttendance" | "attend" | "done" | "cancelled";
  urgency: Urgency | null;
  href: string;
}

const SOON_MS = 3 * 86_400_000;

/**
 * The single operational step an event is waiting on, if any.
 *
 * Derived from publication status, schedule phase, and registration status
 * already carried on the event payload so lists stay zero-N+1.
 */
export function nextStepFor(event: Event, now: Date = new Date()): NextStep {
  const nowMs = now.getTime();

  if (event.status === "draft") {
    const startMs = parseLocalDateTime(event.start_datetime).getTime();
    const startsSoon = startMs >= nowMs && startMs - nowMs <= SOON_MS;
    return {
      key: "publish",
      urgency: startsSoon ? "overdue" : "waiting",
      href: `/events/${event.id}/manage`,
    };
  }

  if (event.status === "cancelled") {
    return { key: "cancelled", urgency: null, href: `/events/${event.id}` };
  }

  // Published event — driven by phase + registration state.
  const phase = resolveEventPhase(event, nowMs);

  if (phase === "live") {
    return { key: "attend", urgency: "done", href: `/events/${event.id}/attendance` };
  }

  if (phase === "ended") {
    return { key: "done", urgency: null, href: `/events/${event.id}/attendance` };
  }

  // Upcoming published event.
  const reg = resolveEffectiveRegistration(event, nowMs);
  if (reg === "open") {
    const startMs = parseLocalDateTime(event.start_datetime).getTime();
    const startsSoon = startMs >= nowMs && startMs - nowMs <= SOON_MS;
    return {
      key: "review",
      urgency: startsSoon ? "waiting" : "info",
      href: `/events/${event.id}/responses`,
    };
  }

  if (reg === "not_open") {
    return {
      key: "openRegistration",
      urgency: "waiting",
      href: `/events/${event.id}/manage`,
    };
  }

  if (reg === "closed") {
    return {
      key: "prepareAttendance",
      urgency: "info",
      href: `/events/${event.id}/responses`,
    };
  }

  // No registration required — ready for event day.
  return { key: "done", urgency: null, href: `/events/${event.id}` };
}
