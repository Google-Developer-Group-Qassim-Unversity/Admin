import type { Event } from "@/lib/api-types";
import { getEffectiveEndDate, parseLocalDateTime } from "@/lib/utils";
import type { Urgency } from "@/components/status-badge";

export interface NextStep {
  /** Key under `events.nextStep` in the message catalogue. */
  key: "publish" | "review" | "attend" | "close" | "done";
  urgency: Urgency | null;
  href: string;
}

/**
 * The single thing this event is waiting for, if anything.
 *
 * Derived purely from `status` and the two datetimes, so a whole table of these
 * costs no extra requests. It is the same reading of the lifecycle that
 * `useAttention` uses for the dashboard queue, minus the certificate check.
 */
export function nextStepFor(event: Event, now: Date = new Date()): NextStep {
  const start = parseLocalDateTime(event.start_datetime);
  const end = getEffectiveEndDate(start, parseLocalDateTime(event.end_datetime));

  switch (event.status) {
    case "draft":
      return { key: "publish", urgency: null, href: `/events/${event.id}/manage` };

    case "open":
      return { key: "review", urgency: "waiting", href: `/events/${event.id}/responses` };

    case "active":
      return end.getTime() < now.getTime()
        ? { key: "close", urgency: "overdue", href: `/events/${event.id}/attendance` }
        : { key: "attend", urgency: "done", href: `/events/${event.id}/attendance` };

    case "closed":
    default:
      return { key: "done", urgency: null, href: `/events/${event.id}` };
  }
}
