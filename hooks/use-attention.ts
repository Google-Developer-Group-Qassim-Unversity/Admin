import * as React from "react";
import { useQueries } from "@tanstack/react-query";

import { useApi } from "@/lib/api/client";
import { useEvents } from "@/hooks/use-event";
import type { Event } from "@/lib/api-types";
import { getEffectiveEndDate, parseLocalDateTime } from "@/lib/utils";
import type { Urgency } from "@/components/status-badge";

export type AttentionKind = "overdue" | "draft" | "closingSoon" | "certificates";

export interface AttentionItem {
  id: string;
  kind: AttentionKind;
  urgency: Urgency;
  event: Event;
  /** Days overdue, days old, or days remaining - whichever the kind is about. */
  days: number;
  /** Certificates still to send, for the "certificates" kind only. */
  count?: number;
  href: string;
}

const DAY_MS = 86_400_000;
const DRAFT_STALE_DAYS = 3;
const CLOSING_SOON_DAYS = 3;
/** Certificate counts cost one request each, so only the newest few are checked. */
const CERTIFICATE_LOOKBACK = 4;

function daysBetween(from: Date, to: Date) {
  return Math.floor((to.getTime() - from.getTime()) / DAY_MS);
}

/**
 * What is waiting on an admin right now, derived from the events list rather
 * than from a dedicated endpoint - there isn't one.
 *
 * Three of the four kinds are free: they fall out of `status` and the two
 * datetimes every event already carries. Only the certificate check costs
 * requests, and it is capped at the most recently closed few.
 */
export function useAttention() {
  const api = useApi();
  const { data: events, isPending, error } = useEvents(undefined);

  const now = React.useMemo(() => new Date(), []);

  const recentlyClosed = React.useMemo(
    () =>
      (events ?? [])
        .filter((e) => e.status === "closed" && e.location_type !== "none" && e.location_type !== "hidden")
        .sort(
          (a, b) =>
            parseLocalDateTime(b.start_datetime).getTime() -
            parseLocalDateTime(a.start_datetime).getTime(),
        )
        .slice(0, CERTIFICATE_LOOKBACK),
    [events],
  );

  const certificateQueries = useQueries({
    queries: recentlyClosed.map((event) => ({
      queryKey: ["certificates", "eligible", event.id] as const,
      queryFn: () => api.certificates.eligibleCount(event.id),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const items = React.useMemo<AttentionItem[]>(() => {
    if (!events) return [];
    const out: AttentionItem[] = [];

    for (const event of events) {
      const start = parseLocalDateTime(event.start_datetime);
      const end = getEffectiveEndDate(start, parseLocalDateTime(event.end_datetime));

      // Ran, ended, never closed - so nobody has been awarded their points.
      if (event.status === "active" && end.getTime() < now.getTime()) {
        out.push({
          id: `overdue-${event.id}`,
          kind: "overdue",
          urgency: "overdue",
          event,
          days: Math.max(1, daysBetween(end, now)),
          href: `/events/${event.id}/attendance`,
        });
        continue;
      }

      // Sitting in draft long enough that it was probably forgotten.
      if (event.status === "draft") {
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

      // Open, and starting soon - last call to review who registered.
      if (event.status === "open") {
        const until = daysBetween(now, start);
        if (until >= 0 && until <= CLOSING_SOON_DAYS) {
          out.push({
            id: `soon-${event.id}`,
            kind: "closingSoon",
            urgency: "waiting",
            event,
            days: until,
            href: `/events/${event.id}/responses`,
          });
        }
      }
    }

    recentlyClosed.forEach((event, i) => {
      const data = certificateQueries[i]?.data;
      if (!data) return;
      const outstanding = data.eligible_count - data.sent_count;
      if (outstanding > 0) {
        out.push({
          id: `certs-${event.id}`,
          kind: "certificates",
          urgency: "info",
          event,
          days: daysBetween(parseLocalDateTime(event.start_datetime), now),
          count: outstanding,
          href: `/events/${event.id}/attendance`,
        });
      }
    });

    // Overdue first, then whatever is waiting, then the merely informational.
    const rank: Record<Urgency, number> = { overdue: 0, waiting: 1, info: 2, done: 3 };
    return out.sort((a, b) => rank[a.urgency] - rank[b.urgency] || b.days - a.days);
  }, [events, now, recentlyClosed, certificateQueries]);

  return { items, isPending, error };
}
