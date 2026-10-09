"use client";

import * as React from "react";
import { format } from "date-fns";
import { formatDistanceToNow } from "date-fns";
import { Award, ChevronDown, Eye, Mail, MailCheck, Megaphone, PenLine, Search, Users, type LucideIcon } from "lucide-react";
import { Plate } from "@/components/najdi";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { EnrichedEmailLog } from "@/lib/api-types";
import { normalizeArabic } from "@/lib/search-utils";
import { MemberDetailsTrigger } from "@/components/member-details";
import { useFormatter, useNow, useTranslations } from "next-intl";

import type { AcceptanceData, BlastData, CertificateData } from "./types";

interface EmailLogRowProps {
  log: EnrichedEmailLog;
  onViewHtml: (html: string, subject: string) => void;
  isNew?: boolean;
}

function getSnapshotData(log: EnrichedEmailLog): CertificateData | null {
  if (!log.data) return null;
  if (log.email_type === "event-certificate" || log.email_type === "manual-certificate") {
    return log.data as unknown as CertificateData;
  }
  return null;
}

function getAcceptanceData(log: EnrichedEmailLog): AcceptanceData | null {
  if (!log.data || log.email_type !== "acceptance") return null;
  return log.data as unknown as AcceptanceData;
}

function getBlastData(log: EnrichedEmailLog): BlastData | null {
  if (!log.data || log.email_type !== "blast") return null;
  return log.data as unknown as BlastData;
}

// An email's type is a category, not a state, so it stays neutral: the icon
// tells the types apart and the brand colours are left to mean something.
const TYPE_ICON_CLASS = "text-ink-2";
const TYPE_BADGE_CLASS = "bg-sunk text-ink-2 border-transparent";

export const TYPE_CONFIG: Record<
  string,
  { icon: LucideIcon; color: string; badgeClass: string }
> = {
  "event-certificate": { icon: Award, color: TYPE_ICON_CLASS, badgeClass: TYPE_BADGE_CLASS },
  "manual-certificate": { icon: PenLine, color: TYPE_ICON_CLASS, badgeClass: TYPE_BADGE_CLASS },
  acceptance: { icon: MailCheck, color: TYPE_ICON_CLASS, badgeClass: TYPE_BADGE_CLASS },
  event_announcement: { icon: MailCheck, color: TYPE_ICON_CLASS, badgeClass: TYPE_BADGE_CLASS },
  blast: { icon: Megaphone, color: TYPE_ICON_CLASS, badgeClass: TYPE_BADGE_CLASS },
};

// A value that changed after the email went out - the admin may want to look.
const CHANGED_CLASS = "text-door-ochre-ink decoration-door-ochre";

// Maps a raw email_type to the key under manageEmails.logRow.types (and
// manageEmails.jobs.types, which shares the same taxonomy).
export const TYPE_LABEL_KEY: Record<string, string> = {
  "event-certificate": "eventCertificate",
  "manual-certificate": "manualCertificate",
  acceptance: "acceptance",
  event_announcement: "announcement",
  blast: "blast",
};

function RowIcon({ type }: { type: string }) {
  const cfg = TYPE_CONFIG[type];
  if (!cfg) return null;
  const Icon = cfg.icon;
  return (
    <Plate tone="umber" size="sm" icon={Icon} className="mt-0.5" />
  );
}

function TypeBadge({ type }: { type: string }) {
  const t = useTranslations("manageEmails.logRow.types");
  const cfg = TYPE_CONFIG[type] ?? { badgeClass: "" };
  const labelKey = TYPE_LABEL_KEY[type];
  return (
    <Badge variant="outline" className={`text-[11px] px-1.5 py-0 h-5 shrink-0 ${cfg.badgeClass}`}>
      {labelKey ? t(labelKey) : type}
    </Badge>
  );
}

function EventNameWithTooltip({
  eventName,
  eventOfficial,
  snapshotEvent,
}: {
  eventName: string | null | undefined;
  eventOfficial: boolean | undefined;
  snapshotEvent?: { name: string; date: string; official: boolean } | null;
}) {
  const t = useTranslations("manageEmails.logRow");
  if (!eventName) return null;

  const currentOfficial = eventOfficial ?? false;
  const snapOfficial = snapshotEvent?.official ?? currentOfficial;
  const snapName = snapshotEvent?.name ?? eventName;
  const snapDate = snapshotEvent?.date;

  const nameChanged = eventName !== snapName;
  const officialChanged = currentOfficial !== snapOfficial;
  const hasDiff = nameChanged || officialChanged;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          dir="auto"
          className={`text-xs cursor-default underline decoration-dotted underline-offset-2 ${
            hasDiff ? CHANGED_CLASS : "text-muted-foreground decoration-muted-foreground/30"
          }`}
        >
          {eventName}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1 text-xs text-start" dir="ltr">
          <p>
            <span className="text-muted-foreground">{t("event")}</span>{" "}
            <span className="font-medium" dir="auto">{eventName}</span>
          </p>
          <p>
            <span className="text-muted-foreground">{t("type")}</span>{" "}
            {currentOfficial ? t("official") : t("unofficial")}
          </p>
          {snapDate && (
            <p>
              <span className="text-muted-foreground">{t("date")}</span> {snapDate}
            </p>
          )}
          {hasDiff && (
            <div className="border-t pt-1 mt-1">
              <p className="text-door-ochre-ink font-medium mb-0.5">{t("valuesAtSendTime")}</p>
              {nameChanged && (
                <p>
                  <span className="text-muted-foreground">{t("name")}</span>{" "}
                  <span dir="auto">{snapName}</span>
                </p>
              )}
              {officialChanged && (
                <p>
                  <span className="text-muted-foreground">{t("type")}</span>{" "}
                  {snapOfficial ? t("official") : t("unofficial")}
                </p>
              )}
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function MetaColumn({ log }: { log: EnrichedEmailLog }) {
  const t = useTranslations("manageEmails.logRow");
  const sentAt = new Date(log.sent_at);
  return (
    <div className="text-end shrink-0 space-y-1 min-w-[140px]">
      <Tooltip>
        <TooltipTrigger asChild>
          <p className="tabular text-xs text-muted-foreground cursor-default">
            {formatDistanceToNow(sentAt, { addSuffix: true })}
          </p>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end">
          <p className="text-xs">{format(sentAt, "MMM d, yyyy HH:mm:ss")}</p>
        </TooltipContent>
      </Tooltip>
      <p className="text-xs text-ink-2" dir="auto">
        {t("sentBy", { name: log.sender_name ?? t("unknown") })}
      </p>
      <p className="text-xs text-ink-2 truncate max-w-[160px] ms-auto">
        {t("fromAddress", { address: log.from_address })}
      </p>
      <TypeBadge type={log.email_type} />
    </div>
  );
}

function MemberListDialog({
  open,
  onOpenChange,
  members,
  subject,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: Array<{ name: string | null; email: string }>;
  subject?: string;
}) {
  const t = useTranslations("manageEmails.logRow");
  const [query, setQuery] = React.useState("");

  React.useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const words = query.trim().split(/\s+/).map(normalizeArabic).filter(Boolean);
  const filtered = words.length
    ? members.filter((m) => {
        const haystack = `${normalizeArabic(m.name ?? "")} ${normalizeArabic(m.email)}`;
        return words.every((word) => haystack.includes(word));
      })
    : members;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[88dvh] flex-col gap-0 overflow-hidden p-0 sm:max-h-[80vh] sm:max-w-lg">
        <DialogHeader className="px-5 pt-7 pb-3 sm:px-6 sm:pt-6">
          <DialogTitle>{t("recipientsTitle", { count: members.length })}</DialogTitle>
          {subject && <DialogDescription dir="auto">{subject}</DialogDescription>}
        </DialogHeader>
        {members.length > 10 && (
          <div className="px-5 pb-3 sm:px-6">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                inputMode="search"
                enterKeyHint="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchByNameOrEmail")}
                className="ps-9"
              />
            </div>
          </div>
        )}
        <div className="bg-sunk text-muted-foreground hidden grid-cols-2 gap-4 border-t px-6 py-2 text-xs font-medium sm:grid">
          <span>{t("columnName")}</span>
          <span>{t("columnEmail")}</span>
        </div>
        <ul className="min-h-0 flex-1 divide-y overflow-y-auto overscroll-contain border-t sm:border-t-0">
          {filtered.map((m, i) => (
            <li key={i} className="grid gap-0.5 px-5 py-2.5 sm:grid-cols-2 sm:gap-4 sm:px-6 sm:py-1.5">
              <span dir="auto" className="truncate text-sm sm:text-xs">
                {m.name}
              </span>
              <span className="text-muted-foreground truncate text-[13px] sm:text-xs">{m.email}</span>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="text-muted-foreground py-6 text-center text-sm">{t("noMatches")}</li>
          )}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

function CertificateRow({ log }: EmailLogRowProps) {
  const t = useTranslations("manageEmails.logRow");
  const snapshot = getSnapshotData(log);
  const memberName = log.member_name ?? snapshot?.member.name ?? t("unknown");
  const memberEmail = log.member_email ?? snapshot?.member.email ?? "";
  const eventName = log.event_name ?? snapshot?.event.name;
  const eventOfficial = log.event_is_official != null ? !!log.event_is_official : snapshot?.event.official;
  const nameDiffers = memberName !== (snapshot?.member.name ?? memberName);

  return (
    <div className="flex items-start gap-3 px-3 py-3 transition-colors hover:bg-background">
      <RowIcon type={log.email_type} />
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-sm">
              <span className="text-ink-2 text-xs">{t("member")}</span>
              <span className="font-medium truncate" dir="auto">
                {nameDiffers ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className={`underline decoration-dotted underline-offset-2 cursor-help ${CHANGED_CLASS}`}>
                        {memberName}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">{t("nameAtSendTime", { name: snapshot?.member.name ?? "" })}</p>
                    </TooltipContent>
                  </Tooltip>
                ) : log.member_id ? (
                  <MemberDetailsTrigger member={{ id: log.member_id, name: memberName }} />
                ) : (
                  memberName
                )}
              </span>
            </div>
            {memberEmail && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="text-ink-2">{t("email")}</span>
                <span className="truncate">{memberEmail}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <span className="text-ink-2">{t("event")}</span>
          <EventNameWithTooltip eventName={eventName} eventOfficial={eventOfficial} snapshotEvent={snapshot?.event} />
        </div>
      </div>
      <MetaColumn log={log} />
    </div>
  );
}

function AcceptanceRow({ log, onViewHtml }: EmailLogRowProps) {
  const t = useTranslations("manageEmails.logRow");
  const data = getAcceptanceData(log);
  const eventName = log.event_name ?? data?.event.name;
  const eventOfficial = log.event_is_official != null ? !!log.event_is_official : data?.event.official;
  const subject = data?.subject;
  const members = data?.member ?? [];
  const [membersOpen, setMembersOpen] = React.useState(false);

  return (
    <>
      <div className="flex items-start gap-3 px-3 py-3 transition-colors hover:bg-background">
        <RowIcon type={log.email_type} />
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-1 text-xs">
          <span className="text-ink-2">{t("event")}</span>
          <EventNameWithTooltip eventName={eventName} eventOfficial={eventOfficial} snapshotEvent={data?.event} />
        </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
            {subject && (
              <span className="truncate max-w-[280px]">
                <span className="text-ink-2">{t("subjectLine")}</span>{" "}
                <bdi className="italic">&ldquo;{subject}&rdquo;</bdi>
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{t("recipientCount", { count: log.recipient_count })}</span>
            {members.length > 0 && (
              <button
                onClick={() => setMembersOpen(true)}
                className="underline decoration-dotted underline-offset-2 cursor-pointer hover:text-foreground transition-colors"
              >
                {t("members")}
              </button>
            )}
            {data?.html_content && (
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0"
                onClick={() => onViewHtml(data.html_content, data.subject ?? "")}
              >
                <Eye />
                {t("html")}
              </Button>
            )}
          </div>
        </div>
        <MetaColumn log={log} />
      </div>
      {members.length > 0 && (
        <MemberListDialog
          open={membersOpen}
          onOpenChange={setMembersOpen}
          members={members}
          subject={subject}
        />
      )}
    </>
  );
}

function BlastRow({ log, onViewHtml }: EmailLogRowProps) {
  const t = useTranslations("manageEmails.logRow");
  const data = getBlastData(log);
  const subject = data?.subject;
  const recipients = data?.recipients ?? [];
  const guaranteed = data?.guaranteed_recipients ?? [];
  const [recipientsOpen, setRecipientsOpen] = React.useState(false);
  const [guaranteedOpen, setGuaranteedOpen] = React.useState(false);

  return (
    <>
      <div className="flex items-start gap-3 px-3 py-3 transition-colors hover:bg-background">
        <RowIcon type={log.email_type} />
        <div className="flex-1 min-w-0 space-y-0.5">
          {subject && (
            <div className="text-xs text-muted-foreground truncate max-w-[320px]">
              <span className="text-ink-2">{t("subjectLine")}</span>{" "}
              <bdi className="italic">&ldquo;{subject}&rdquo;</bdi>
            </div>
          )}
          {data && (
            <div className="text-xs text-muted-foreground">
              <span className="text-ink-2">{t("orderedBy")}</span>{" "}
              {data.order_by === "activity" ? t("mostRecentlyActive") : t("alphabetical")}
            </div>
          )}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {recipients.length > 0 ? (
              <button
                onClick={() => setRecipientsOpen(true)}
                className="underline decoration-dotted underline-offset-2 cursor-pointer hover:text-foreground transition-colors"
              >
                {t("recipientCount", { count: log.recipient_count })}
              </button>
            ) : (
              <span>{t("recipientCount", { count: log.recipient_count })}</span>
            )}
            {guaranteed.length > 0 && (
              <button
                onClick={() => setGuaranteedOpen(true)}
                className="underline decoration-dotted underline-offset-2 cursor-pointer hover:text-foreground transition-colors"
              >
                {t("guaranteedCount", { count: guaranteed.length })}
              </button>
            )}
            {data?.html_content && (
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0"
                onClick={() => onViewHtml(data.html_content, data.subject ?? "")}
              >
                <Eye />
                {t("html")}
              </Button>
            )}
          </div>
        </div>
        <MetaColumn log={log} />
      </div>
      {recipients.length > 0 && (
        <MemberListDialog open={recipientsOpen} onOpenChange={setRecipientsOpen} members={recipients} subject={subject} />
      )}
      {guaranteed.length > 0 && (
        <MemberListDialog
          open={guaranteedOpen}
          onOpenChange={setGuaranteedOpen}
          members={guaranteed}
          subject={subject}
        />
      )}
    </>
  );
}

function ManualCertificateRow({ log }: EmailLogRowProps) {
  const t = useTranslations("manageEmails.logRow");
  const snapshot = getSnapshotData(log);
  const memberName = log.member_name ?? snapshot?.member.name;
  const memberEmail = log.member_email ?? snapshot?.member.email;
  const eventName = log.event_name ?? snapshot?.event.name;
  const eventOfficial = log.event_is_official != null ? !!log.event_is_official : snapshot?.event.official;
  const hasNoJoins = !log.member_name && !log.event_name;
  const nameDiffers = memberName !== (snapshot?.member.name ?? memberName);

  return (
    <div className="flex items-start gap-3 px-3 py-3 transition-colors hover:bg-background">
      <RowIcon type={log.email_type} />
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="min-w-0">
          {memberName ? (
            <div className="flex items-center gap-1 text-sm">
              <span className="text-ink-2 text-xs">{t("member")}</span>
              <span className="font-medium truncate" dir="auto">
                {nameDiffers ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className={`underline decoration-dotted underline-offset-2 cursor-help ${CHANGED_CLASS}`}>
                        {memberName}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">{t("nameAtSendTime", { name: snapshot?.member.name ?? "" })}</p>
                    </TooltipContent>
                  </Tooltip>
                ) : log.member_id ? (
                  <MemberDetailsTrigger member={{ id: log.member_id, name: memberName }} />
                ) : (
                  memberName
                )}
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">{t("noMemberLinked")}</p>
          )}
          {memberEmail && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="text-ink-2">{t("email")}</span>
              <span className="truncate">{memberEmail}</span>
            </div>
          )}
        </div>
        {eventName ? (
          <div className="flex items-center gap-1 text-xs">
            <span className="text-ink-2">{t("event")}</span>
            <EventNameWithTooltip eventName={eventName} eventOfficial={eventOfficial} snapshotEvent={snapshot?.event} />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">{t("noEventLinked")}</p>
        )}
        {hasNoJoins && snapshot && (
          <p className="text-xs text-ink-2">{t("fromSnapshot")}</p>
        )}
      </div>
      <MetaColumn log={log} />
    </div>
  );
}

function DefaultRow({ log }: EmailLogRowProps) {
  const t = useTranslations("manageEmails.logRow");
  const eventName = log.event_name;
  const eventOfficial = log.event_is_official != null ? !!log.event_is_official : undefined;
  return (
    <div className="flex items-start gap-3 px-3 py-3 transition-colors hover:bg-background">
      <RowIcon type={log.email_type} />
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-sm font-medium">{t("emailNumber", { id: log.id })}</p>
        {log.member_name && (
          <div className="flex items-center gap-1 text-xs">
            <span className="text-ink-2">{t("member")}</span>
            <span className="truncate" dir="auto">
              {log.member_id ? (
                <MemberDetailsTrigger member={{ id: log.member_id, name: log.member_name }} />
              ) : (
                log.member_name
              )}
            </span>
          </div>
        )}
        {log.member_email && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="text-ink-2">{t("email")}</span>
            <span className="truncate">{log.member_email}</span>
          </div>
        )}
        {eventName && (
          <div className="flex items-center gap-1 text-xs">
            <span className="text-ink-2">{t("event")}</span>
            <EventNameWithTooltip eventName={eventName} eventOfficial={eventOfficial} />
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {t("recipientCount", { count: log.recipient_count })}
        </p>
      </div>
      <MetaColumn log={log} />
    </div>
  );
}

/** What a log row says at a glance - shared by the phone row's two lines and its details. */
function useLogSummary(log: EnrichedEmailLog) {
  const t = useTranslations("manageEmails.logRow");
  const snapshot = getSnapshotData(log);
  const acceptance = getAcceptanceData(log);
  const blast = getBlastData(log);

  const memberName = log.member_name ?? snapshot?.member.name ?? null;
  const memberEmail = log.member_email ?? snapshot?.member.email ?? null;
  const snapEvent = snapshot?.event ?? acceptance?.event ?? null;
  const eventName = log.event_name ?? snapEvent?.name ?? null;
  const eventOfficial = log.event_is_official != null ? !!log.event_is_official : snapEvent?.official;
  const subject = acceptance?.subject ?? blast?.subject ?? null;
  const html = acceptance?.html_content ?? blast?.html_content ?? null;
  const recipients = acceptance?.member ?? blast?.recipients ?? [];
  const guaranteed = blast?.guaranteed_recipients ?? [];
  const recipientsLabel = t("recipientCount", { count: log.recipient_count });

  const nameChanged = !!snapshot && !!memberName && memberName !== snapshot.member.name;
  const eventChanged =
    !!snapEvent &&
    !!eventName &&
    (eventName !== snapEvent.name || (eventOfficial ?? false) !== snapEvent.official);

  let primary: string;
  let secondary: string | null;
  switch (log.email_type) {
    case "event-certificate":
    case "manual-certificate":
      primary = memberName ?? t("noMemberLinked");
      secondary = eventName;
      break;
    case "acceptance":
      primary = subject ?? eventName ?? t("emailNumber", { id: log.id });
      secondary = subject && eventName ? `${eventName} · ${recipientsLabel}` : recipientsLabel;
      break;
    case "blast":
      primary = subject ?? t("emailNumber", { id: log.id });
      secondary = guaranteed.length
        ? `${recipientsLabel} · ${t("guaranteedCount", { count: guaranteed.length })}`
        : recipientsLabel;
      break;
    default:
      primary = log.member_name ?? t("emailNumber", { id: log.id });
      secondary = eventName ?? recipientsLabel;
  }

  return {
    primary,
    secondary,
    memberName,
    memberEmail,
    eventName,
    eventOfficial,
    snapEvent,
    snapshotMemberName: snapshot?.member.name ?? null,
    subject,
    html,
    recipients,
    guaranteed,
    orderBy: blast?.order_by ?? null,
    nameChanged,
    eventChanged,
  };
}

function DetailLine({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 gap-1.5">
      <dt className="text-ink-2 shrink-0">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

/**
 * The phone row: two lines - who or what, then type and context - with the
 * time at the end. Tapping it opens the details the desktop row spreads
 * across three columns, including the send-time values a tooltip shows on
 * desktop (touch has no hover).
 */
function CompactLogRow({ log, onViewHtml }: EmailLogRowProps) {
  const t = useTranslations("manageEmails.logRow");
  const tt = useTranslations("manageEmails.logRow.types");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const [open, setOpen] = React.useState(false);
  const [list, setList] = React.useState<"recipients" | "guaranteed" | null>(null);
  const detailsId = React.useId();
  const s = useLogSummary(log);

  const Icon = TYPE_CONFIG[log.email_type]?.icon ?? Mail;
  const labelKey = TYPE_LABEL_KEY[log.email_type];
  const sentAt = new Date(log.sent_at);

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={detailsId}
        onClick={() => setOpen((v) => !v)}
        className="active:bg-sunk focus-visible:ring-ring/50 flex min-h-14 w-full items-center gap-3 px-3 py-2.5 text-start outline-none focus-visible:ring-[3px] focus-visible:ring-inset"
      >
        <Plate tone="umber" size="sm" icon={Icon} />
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2">
            <span dir="auto" className={`truncate text-sm font-bold ${s.nameChanged ? CHANGED_CLASS : ""}`}>
              {s.primary}
            </span>
            <time
              dateTime={log.sent_at}
              className="tabular text-muted-foreground ms-auto shrink-0 text-xs"
            >
              {format.relativeTime(sentAt, now)}
            </time>
          </span>
          <span className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-[13px]">
            <span className="shrink-0">{labelKey ? tt(labelKey) : log.email_type}</span>
            {s.secondary && (
              <>
                <span aria-hidden="true">·</span>
                <span dir="auto" className="truncate">
                  {s.secondary}
                </span>
              </>
            )}
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`text-muted-foreground size-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
        <span className="sr-only">{open ? t("hideDetails") : t("showDetails")}</span>
      </button>

      {open && (
        <div id={detailsId} className="space-y-3 px-3 pb-3 ps-14">
          <dl className="space-y-1 text-[13px]">
            {s.memberName && (
              <DetailLine label={t("member")}>
                <span dir="auto">
                  {log.member_id ? (
                    <MemberDetailsTrigger member={{ id: log.member_id, name: s.memberName }} />
                  ) : (
                    s.memberName
                  )}
                </span>
              </DetailLine>
            )}
            {s.memberEmail && <DetailLine label={t("email")}>{s.memberEmail}</DetailLine>}
            {s.eventName && (
              <DetailLine label={t("event")}>
                <span dir="auto">{s.eventName}</span>
                <span className="text-muted-foreground">
                  {" · "}
                  {s.eventOfficial ? t("official") : t("unofficial")}
                </span>
              </DetailLine>
            )}
            {s.subject && (
              <DetailLine label={t("subjectLine")}>
                <span dir="auto" className="italic">
                  &ldquo;{s.subject}&rdquo;
                </span>
              </DetailLine>
            )}
            {s.orderBy && (
              <DetailLine label={t("orderedBy")}>
                {s.orderBy === "activity" ? t("mostRecentlyActive") : t("alphabetical")}
              </DetailLine>
            )}
            <DetailLine label={t("sentByLabel")}>
              <span dir="auto">{log.sender_name ?? t("unknown")}</span>
            </DetailLine>
            <DetailLine label={t("fromLabel")}>
              <span className="break-all">{log.from_address}</span>
            </DetailLine>
            <DetailLine label={t("date")}>
              <span className="tabular">
                {format.dateTime(sentAt, { dateStyle: "medium", timeStyle: "short" })}
              </span>
            </DetailLine>
          </dl>

          {(s.nameChanged || s.eventChanged) && (
            <div className="bg-door-ochre-soft text-door-ochre-ink space-y-0.5 rounded-lg px-3 py-2 text-[13px]">
              <p className="font-bold">{t("valuesAtSendTime")}</p>
              {s.nameChanged && s.snapshotMemberName && (
                <p dir="auto">{t("nameAtSendTime", { name: s.snapshotMemberName })}</p>
              )}
              {s.eventChanged && s.snapEvent && (
                <p>
                  {t("name")} <span dir="auto">{s.snapEvent.name}</span>
                  {" · "}
                  {s.snapEvent.official ? t("official") : t("unofficial")}
                </p>
              )}
            </div>
          )}

          {(s.recipients.length > 0 || s.guaranteed.length > 0 || s.html) && (
            <div className="flex flex-wrap gap-2">
              {s.recipients.length > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={() => setList("recipients")}>
                  <Users className="size-4" />
                  {log.email_type === "acceptance" ? t("members") : t("recipientCount", { count: log.recipient_count })}
                </Button>
              )}
              {s.guaranteed.length > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={() => setList("guaranteed")}>
                  {t("guaranteedCount", { count: s.guaranteed.length })}
                </Button>
              )}
              {s.html && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onViewHtml(s.html ?? "", s.subject ?? "")}
                >
                  <Eye className="size-4" />
                  {t("html")}
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {s.recipients.length > 0 && (
        <MemberListDialog
          open={list === "recipients"}
          onOpenChange={(o) => setList(o ? "recipients" : null)}
          members={s.recipients}
          subject={s.subject ?? undefined}
        />
      )}
      {s.guaranteed.length > 0 && (
        <MemberListDialog
          open={list === "guaranteed"}
          onOpenChange={(o) => setList(o ? "guaranteed" : null)}
          members={s.guaranteed}
          subject={s.subject ?? undefined}
        />
      )}
    </>
  );
}

export function EmailLogRow({ log, onViewHtml, isNew }: EmailLogRowProps) {
  const inner = (() => {
    switch (log.email_type) {
      case "event-certificate":
        return <CertificateRow log={log} onViewHtml={onViewHtml} />;
      case "acceptance":
        return <AcceptanceRow log={log} onViewHtml={onViewHtml} />;
      case "blast":
        return <BlastRow log={log} onViewHtml={onViewHtml} />;
      case "manual-certificate":
        return <ManualCertificateRow log={log} onViewHtml={onViewHtml} />;
      default:
        return <DefaultRow log={log} onViewHtml={onViewHtml} />;
    }
  })();

  return (
    <div
      className={`transition-colors duration-700 ${
        isNew ? "animate-in slide-in-from-top-2 fade-in duration-500 bg-door-green-soft" : ""
      }`}
    >
      <div className="md:hidden">
        <CompactLogRow log={log} onViewHtml={onViewHtml} />
      </div>
      <div className="hidden md:block">{inner}</div>
    </div>
  );
}
