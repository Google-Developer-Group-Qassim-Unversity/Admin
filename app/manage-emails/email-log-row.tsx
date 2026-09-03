"use client";

import * as React from "react";
import { format } from "date-fns";
import { formatDistanceToNow } from "date-fns";
import { Award, Eye, MailCheck, Megaphone, PenLine, Search } from "lucide-react";

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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { EnrichedEmailLog } from "@/lib/api-types";
import { useTranslations } from "next-intl";

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

export const TYPE_CONFIG: Record<
  string,
  { icon: React.ElementType; color: string; badgeClass: string }
> = {
  "event-certificate": { icon: Award, color: "text-blue-500", badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  "manual-certificate": { icon: PenLine, color: "text-purple-500", badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20" },
  acceptance: { icon: MailCheck, color: "text-emerald-500", badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  event_announcement: { icon: MailCheck, color: "text-orange-500", badgeClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20" },
  blast: { icon: Megaphone, color: "text-pink-500", badgeClass: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20" },
};

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
    <div className={`mt-0.5 shrink-0 ${cfg.color}`}>
      <Icon className="h-4 w-4" />
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const t = useTranslations("manageEmails.logRow.types");
  const cfg = TYPE_CONFIG[type] ?? { badgeClass: "" };
  const labelKey = TYPE_LABEL_KEY[type];
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 shrink-0 ${cfg.badgeClass}`}>
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
            hasDiff
              ? "text-amber-600 dark:text-amber-400 decoration-amber-500/60"
              : "text-muted-foreground decoration-muted-foreground/30"
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
              <p className="text-amber-500 font-medium mb-0.5">{t("valuesAtSendTime")}</p>
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
          <p className="text-[10px] text-muted-foreground cursor-default">
            {formatDistanceToNow(sentAt, { addSuffix: true })}
          </p>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end">
          <p className="text-xs">{format(sentAt, "MMM d, yyyy HH:mm:ss")}</p>
        </TooltipContent>
      </Tooltip>
      <p className="text-[10px] text-muted-foreground/70" dir="auto">
        {t("sentBy", { name: log.sender_name ?? t("unknown") })}
      </p>
      <p className="text-[10px] text-muted-foreground/70 truncate max-w-[160px] ms-auto">
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

  const q = query.trim().toLowerCase();
  const filtered = q
    ? members.filter((m) => (m.name ?? "").toLowerCase().includes(q) || m.email.toLowerCase().includes(q))
    : members;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg! max-h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>{t("recipientsTitle", { count: members.length })}</DialogTitle>
          {subject && <DialogDescription>{subject}</DialogDescription>}
        </DialogHeader>
        {members.length > 10 && (
          <div className="px-6 pb-2">
            <div className="relative">
              <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchByNameOrEmail")}
                className="h-8 ps-8 text-xs"
              />
            </div>
          </div>
        )}
        <ScrollArea className="flex-1 border-t">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0 z-10">
              <tr>
                <th className="text-start py-2 px-4 font-medium text-xs text-muted-foreground">{t("columnName")}</th>
                <th className="text-start py-2 px-4 font-medium text-xs text-muted-foreground">{t("columnEmail")}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m, i) => (
                <tr key={i} className="border-t">
                  <td className="py-1.5 px-4 text-xs">{m.name}</td>
                  <td className="py-1.5 px-4 text-xs text-muted-foreground">{m.email}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={2} className="py-6 text-center text-xs text-muted-foreground">
                    {t("noMatches")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </ScrollArea>
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
    <div className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-muted/30 transition-colors">
      <RowIcon type={log.email_type} />
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-sm">
              <span className="text-muted-foreground/60 text-xs">{t("member")}</span>
              <span className="font-medium truncate">
                {nameDiffers ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="underline decoration-amber-500 decoration-dotted underline-offset-2 cursor-help text-amber-600 dark:text-amber-400">
                        {memberName}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">{t("nameAtSendTime", { name: snapshot?.member.name ?? "" })}</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  memberName
                )}
              </span>
            </div>
            {memberEmail && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="text-muted-foreground/60">{t("email")}</span>
                <span className="truncate">{memberEmail}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <span className="text-muted-foreground/60">{t("event")}</span>
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
      <div className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-muted/30 transition-colors">
        <RowIcon type={log.email_type} />
        <div className="flex-1 min-w-0 space-y-0.5">
          <div className="flex items-center gap-1 text-xs">
          <span className="text-muted-foreground/60">{t("event")}</span>
          <EventNameWithTooltip eventName={eventName} eventOfficial={eventOfficial} snapshotEvent={data?.event} />
        </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
            {subject && (
              <span className="truncate max-w-[280px]">
                <span className="text-muted-foreground/60">{t("subjectLine")}</span>{" "}
                <span className="italic">&ldquo;{subject}&rdquo;</span>
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
                className="h-5 px-1.5 text-[10px] shrink-0"
                onClick={() => onViewHtml(data.html_content, data.subject ?? "")}
              >
                <Eye className="h-3 w-3 me-0.5" />
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
      <div className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-muted/30 transition-colors">
        <RowIcon type={log.email_type} />
        <div className="flex-1 min-w-0 space-y-0.5">
          {subject && (
            <div className="text-xs text-muted-foreground truncate max-w-[320px]">
              <span className="text-muted-foreground/60">{t("subjectLine")}</span>{" "}
              <span className="italic">&ldquo;{subject}&rdquo;</span>
            </div>
          )}
          {data && (
            <div className="text-xs text-muted-foreground">
              <span className="text-muted-foreground/60">{t("orderedBy")}</span>{" "}
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
                className="h-5 px-1.5 text-[10px] shrink-0"
                onClick={() => onViewHtml(data.html_content, data.subject ?? "")}
              >
                <Eye className="h-3 w-3 me-0.5" />
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
    <div className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-muted/30 transition-colors">
      <RowIcon type={log.email_type} />
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="min-w-0">
          {memberName ? (
            <div className="flex items-center gap-1 text-sm">
              <span className="text-muted-foreground/60 text-xs">{t("member")}</span>
              <span className="font-medium truncate">
                {nameDiffers ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="underline decoration-amber-500 decoration-dotted underline-offset-2 cursor-help text-amber-600 dark:text-amber-400">
                        {memberName}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">{t("nameAtSendTime", { name: snapshot?.member.name ?? "" })}</p>
                    </TooltipContent>
                  </Tooltip>
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
              <span className="text-muted-foreground/60">{t("email")}</span>
              <span className="truncate">{memberEmail}</span>
            </div>
          )}
        </div>
        {eventName ? (
          <div className="flex items-center gap-1 text-xs">
            <span className="text-muted-foreground/60">{t("event")}</span>
            <EventNameWithTooltip eventName={eventName} eventOfficial={eventOfficial} snapshotEvent={snapshot?.event} />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">{t("noEventLinked")}</p>
        )}
        {hasNoJoins && snapshot && (
          <p className="text-[10px] text-muted-foreground/60">{t("fromSnapshot")}</p>
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
    <div className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-muted/30 transition-colors">
      <RowIcon type={log.email_type} />
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-sm font-medium">{t("emailNumber", { id: log.id })}</p>
        {log.member_name && (
          <div className="flex items-center gap-1 text-xs">
            <span className="text-muted-foreground/60">{t("member")}</span>
            <span className="truncate">{log.member_name}</span>
          </div>
        )}
        {log.member_email && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="text-muted-foreground/60">{t("email")}</span>
            <span className="truncate">{log.member_email}</span>
          </div>
        )}
        {eventName && (
          <div className="flex items-center gap-1 text-xs">
            <span className="text-muted-foreground/60">{t("event")}</span>
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
        isNew ? "animate-in slide-in-from-top-2 fade-in duration-500 bg-emerald-500/8" : ""
      }`}
    >
      {inner}
    </div>
  );
}
