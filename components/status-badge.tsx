"use client";

import { useTranslations } from "next-intl";

import type { EventStatus } from "@/lib/api-types";

/**
 * The one status vocabulary. Colour is bound to state everywhere in the
 * console - blue means a member can still act, green means it is running,
 * yellow means it is waiting on an admin, red means overdue or failed - so
 * these classes are the only place an event status gets a colour.
 */
const STATUS_STYLES: Record<EventStatus, { dot: string; pill: string }> = {
  draft: {
    dot: "bg-muted-foreground/60",
    pill: "bg-muted text-muted-foreground",
  },
  open: {
    dot: "bg-brand-blue",
    pill: "bg-brand-blue-soft text-brand-blue-ink",
  },
  active: {
    dot: "bg-brand-green",
    pill: "bg-brand-green-soft text-brand-green-ink",
  },
  closed: {
    dot: "bg-border",
    pill: "bg-muted text-muted-foreground",
  },
};

export type Urgency = "waiting" | "overdue" | "info" | "done";

export const URGENCY_STYLES: Record<Urgency, { dot: string; pill: string }> = {
  waiting: { dot: "bg-brand-yellow", pill: "bg-brand-yellow-soft text-brand-yellow-ink" },
  overdue: { dot: "bg-brand-red", pill: "bg-brand-red-soft text-brand-red-ink" },
  info: { dot: "bg-brand-blue", pill: "bg-brand-blue-soft text-brand-blue-ink" },
  done: { dot: "bg-brand-green", pill: "bg-brand-green-soft text-brand-green-ink" },
};

export function StatusDot({ status, className }: { status: EventStatus; className?: string }) {
  return (
    <span
      className={`inline-block h-[7px] w-[7px] shrink-0 rounded-full ${STATUS_STYLES[status].dot} ${className ?? ""}`}
      aria-hidden="true"
    />
  );
}

export function StatusBadge({ status, className }: { status: EventStatus; className?: string }) {
  const t = useTranslations("events.status");

  return (
    <span
      className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11.5px] font-semibold capitalize ${STATUS_STYLES[status].pill} ${className ?? ""}`}
    >
      <StatusDot status={status} />
      {t(status)}
    </span>
  );
}

export function UrgencyDot({ urgency, className }: { urgency: Urgency; className?: string }) {
  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${URGENCY_STYLES[urgency].dot} ${className ?? ""}`}
      aria-hidden="true"
    />
  );
}
