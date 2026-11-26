import * as React from "react";
import { useQueries } from "@tanstack/react-query";

import { useApi } from "@/lib/api/client";
import { useEvents } from "@/hooks/use-event";
import type { Event } from "@/lib/api-types";
import {
  isCustomEvent,
  isEventEnded,
  isEventLive,
  isEventRegistrationOpen,
  isEventUpcoming,
} from "@/lib/event-lifecycle";
import { parseLocalDateTime } from "@/lib/utils";
import type { Urgency } from "@/components/status-badge";
import { useAccess } from "@/hooks/use-access";

export type AttentionKind = "liveNow" | "draftSoon" | "draft" | "registrationSoon" | "certificates";

export interface AttentionItem {
  id: string;
  kind: AttentionKind;
  urgency: Urgency;
  event: Event;
  /** Days since ended, days old, or days remaining — whichever the kind is about. */
  days: number;
  /** Certificates still to send, for the "certificates" kind only. */
  count?: number;
  href: string;
}

const DAY_MS = 86_400_000;
const DRAFT_STALE_DAYS = 3;
const STARTING_SOON_DAYS = 3;
/** Certificate counts cost one request each, so only the newest few ended events are checked. */
const CERTIFICATE_LOOKBACK = 4;

function daysBetween(from: Date, to: Date) {
  return Math.floor((to.getTime() - from.getTime()) / DAY_MS);
}

/**
 * Operational work waiting on an admin right now, derived from the events list:
 *   1. Live now (published + live) → take attendance
 *   2. Draft starting soon (draft starting within 3 days) → publish now
 *   3. Registration open & starting soon (published + upcoming + registration open) → review responses
 *   4. Stale drafts (draft older than 3 days) → finish setup & publish
 *   5. Certificates ready to send (published + ended, picked up automatically once phase === "ended")
 */
export function useAttention() {
  const api = useApi();
  const { can } = useAccess();
  const { data: events, isPending, error } = useEvents(undefined);

  const now = React.useMemo(() => new Date(), []);
  const nowMs = now.getTime();

  const recentlyEnded = React.useMemo(
    () =>
      (events ?? [])
        .filter((e) => !isCustomEvent(e) && isEventEnded(e, nowMs))
        .sort(
          (a, b) =>
            parseLocalDateTime(b.end_datetime).getTime() -
            parseLocalDateTime(a.end_datetime).getTime(),
        )
        .slice(0, CERTIFICATE_LOOKBACK),
    [events, nowMs],
  );

  const certificateQueries = useQueries({
    queries: recentlyEnded.map((event) => ({
      queryKey: ["certificates", "eligible", event.id] as const,
      queryFn: () => api.certificates.eligibleCount(event.id),
      staleTime: 5 * 60 * 1000,
      // Only for people who send event certificates; the backend refuses events of other departments.
      enabled: can("emails.event"),
    })),
  });

  const items = React.useMemo<AttentionItem[]>(() => {
    if (!events) return [];
    const out: AttentionItem[] = [];

    for (const event of events) {
      if (isCustomEvent(event) || event.status === "cancelled") continue;

      const start = parseLocalDateTime(event.start_datetime);

      // Running right now — jump straight to check-in at the door.
      if (isEventLive(event, nowMs)) {
        out.push({
          id: `live-${event.id}`,
          kind: "liveNow",
          urgency: "done",
          event,
          days: 0,
          href: `/events/${event.id}/attendance`,
        });
        continue;
      }

      // Still a draft: flag urgently if it starts soon, otherwise once stale.
      if (event.status === "draft") {
        const until = daysBetween(now, start);
        if (until >= 0 && until <= STARTING_SOON_DAYS) {
          out.push({
            id: `draft-soon-${event.id}`,
            kind: "draftSoon",
            urgency: "overdue",
            event,
            days: until,
            href: `/events/${event.id}/manage`,
          });
          continue;
        }
        const age = daysBetween(parseLocalDateTime(event.created_at), now);
        if (age >= DRAFT_STALE_DAYS) {
          out.push({
            id: `draft-${event.id}`,
            kind: "draft",
            urgency: "waiting",
            event,
            days: age,
            href: `/events/${event.id}/manage`,
          });
        }
        continue;
      }

      // Published + upcoming + registration open & starting soon — review or close registration.
      if (isEventUpcoming(event, nowMs) && isEventRegistrationOpen(event, nowMs)) {
        const until = daysBetween(now, start);
        if (until >= 0 && until <= STARTING_SOON_DAYS) {
          out.push({
            id: `reg-soon-${event.id}`,
            kind: "registrationSoon",
            urgency: "waiting",
            event,
            days: until,
            href: `/events/${event.id}/responses`,
          });
        }
      }
    }

    recentlyEnded.forEach((event, i) => {
      const data = certificateQueries[i]?.data;
      if (!data) return;
      const outstanding = data.eligible_count - data.sent_count;
      if (outstanding > 0) {
        out.push({
          id: `certs-${event.id}`,
          kind: "certificates",
          urgency: "info",
          event,
          days: Math.max(0, daysBetween(parseLocalDateTime(event.end_datetime), now)),
          count: outstanding,
          href: `/events/${event.id}/attendance`,
        });
      }
    });

    const rank: Record<AttentionKind, number> = {
      liveNow: 0,
      draftSoon: 1,
      registrationSoon: 2,
      draft: 3,
      certificates: 4,
    };
    return out.sort((a, b) => rank[a.kind] - rank[b.kind] || a.days - b.days);
  }, [events, now, nowMs, recentlyEnded, certificateQueries]);

  return { items, isPending, error };
}
