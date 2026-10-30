"use client";

import { Award, AtSign, BadgeCheck, CalendarDays, FileBadge, Megaphone, Route, type LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { isSending } from "@/hooks/use-email-sends";
import { FILL } from "@/components/najdi";
import { SEND_TONE, StatePill } from "@/components/status-badge";
import type { Send, SendKind, SendKindFilter } from "@/lib/api-types";
import { isolate } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Message keys under `manageEmails.kind` for each kind of send. */
const KIND_KEY: Record<SendKind, string> = {
  campaign: "campaign",
  "event-certificate": "eventCertificate",
  "manual-certificate": "manualCertificate",
  acceptance: "acceptance",
  "event-message": "eventMessage",
  direct: "direct",
  "team-notification": "teamNotification",
};

export const KIND_ICON: Record<SendKind, LucideIcon> = {
  campaign: Megaphone,
  "event-certificate": Award,
  "manual-certificate": FileBadge,
  acceptance: BadgeCheck,
  "event-message": CalendarDays,
  direct: AtSign,
  "team-notification": Route,
};

/** The chips above the feed, in order. "All" (no kind) leaves team notifications out. */
export const KIND_FILTERS: SendKindFilter[] = [
  "campaign",
  "certificate",
  "acceptance",
  "event-message",
  "direct",
  "team-notification",
];

export const isCertificate = (send: Pick<Send, "kind">) =>
  send.kind === "event-certificate" || send.kind === "manual-certificate";

/** Finished jobs can include attendees skipped as already sent in their total. */
export const recipientCount = (send: Send) => isSending(send) ? send.total : send.succeeded + send.failed;

/** Display template subjects without a recipient name; keep stored templates intact for reuse. */
export function displaySubject(subject: string | null | undefined, event: Send["event"]) {
  return subject?.replaceAll("[Event Name]", event?.name ?? "")
    .replace(/\s*\[Name\]\s*[,،:;!?؟.\-–|·]*\s*/g, " ")
    .replace(/\s+/g, " ").trim().replace(/^[,،:;!?؟.\-–|·]\s*|\s*[,،:;\-–|·]$/g, "").trim() ?? "";
}

/** A campaign or direct email can be opened in the composer as the start of a new one. */
export const canReuse = (send: Send) => send.kind === "campaign" || send.kind === "direct";

/** "Campaign", "Attendance certificates"... what kind of send this is. */
export function useKindLabel() {
  const t = useTranslations("manageEmails.kind");
  return (kind: SendKind) => t(KIND_KEY[kind]);
}

/**
 * A send's title: its subject, or for certificates (which have none) the kind
 * and the event, "Attendance certificates · Intro to micro:bit".
 */
export function useSendTitle() {
  const t = useTranslations("manageEmails.kind");
  const kindLabel = useKindLabel();
  return (send: Send) => {
    if (isCertificate(send)) {
      return send.event ? t("withEvent", { kind: kindLabel(send.kind), event: isolate(send.event.name) }) : kindLabel(send.kind);
    }
    return displaySubject(send.subject, send.event) || kindLabel(send.kind);
  };
}

/** Sent (green), sending N of M (ochre), failed for K / failed (madder). Never "delivered": nobody can know that. */
export function SendStatusPill({ send, className }: { send: Send; className?: string }) {
  const t = useTranslations("manageEmails.status");
  const done = send.succeeded + send.failed;
  const label =
    send.status === "succeeded"
      ? t("sent")
      : send.status === "partial"
        ? t("failedFor", { count: send.failed })
        : send.status === "failed"
          ? t("failed")
          : t("sending", { done, total: send.total });
  return (
    <StatePill tone={SEND_TONE[send.status]} className={cn("tabular shrink-0 whitespace-nowrap", className)}>
      {label}
    </StatePill>
  );
}

/** Thin progress bar in the same state tone as the status pill. */
export function SendProgress({ send, className }: { send: Send; className?: string }) {
  const t = useTranslations("manageEmails.status");
  const done = send.succeeded + send.failed;
  const progress = send.total > 0 ? Math.min(100, (done / send.total) * 100) : 0;
  return (
    <span
      role="progressbar"
      aria-label={t("sending", { done, total: send.total })}
      aria-valuemin={0}
      aria-valuemax={send.total || 1}
      aria-valuenow={Math.min(done, send.total)}
      className={cn("bg-sunk block h-1 w-full max-w-40 overflow-hidden rounded-sm", className)}
    >
      <span className={cn("block h-full", FILL[SEND_TONE[send.status]])} style={{ width: `${progress}%` }} />
    </span>
  );
}
