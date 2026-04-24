"use client";

import * as React from "react";
import { format } from "date-fns";
import { formatDistanceToNow } from "date-fns";
import { Award, Eye, MailCheck, PenLine } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

import type { AcceptanceData, CertificateData } from "./types";

interface EmailLogRowProps {
  log: EnrichedEmailLog;
  onViewHtml: (html: string, subject: string) => void;
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

export const TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string; badgeClass: string }
> = {
  "event-certificate": {
    label: "Event Certificate",
    icon: Award,
    color: "text-blue-500",
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  "manual-certificate": {
    label: "Manual Certificate",
    icon: PenLine,
    color: "text-purple-500",
    badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
  acceptance: {
    label: "Acceptance",
    icon: MailCheck,
    color: "text-emerald-500",
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  event_announcement: {
    label: "Announcement",
    icon: MailCheck,
    color: "text-orange-500",
    badgeClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  },
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
  const cfg = TYPE_CONFIG[type] ?? { label: type, badgeClass: "" };
  return (
    <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 shrink-0 ${cfg.badgeClass}`}>
      {cfg.label}
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
        <div className="space-y-1 text-xs text-left" dir="ltr">
          <p>
            <span className="text-muted-foreground">Event:</span>{" "}
            <span className="font-medium" dir="auto">{eventName}</span>
          </p>
          <p>
            <span className="text-muted-foreground">Type:</span>{" "}
            {currentOfficial ? "Official" : "Unofficial"}
          </p>
          {snapDate && (
            <p>
              <span className="text-muted-foreground">Date:</span> {snapDate}
            </p>
          )}
          {hasDiff && (
            <div className="border-t pt-1 mt-1">
              <p className="text-amber-500 font-medium mb-0.5">Values at send time:</p>
              {nameChanged && (
                <p>
                  <span className="text-muted-foreground">Name:</span>{" "}
                  <span dir="auto">{snapName}</span>
                </p>
              )}
              {officialChanged && (
                <p>
                  <span className="text-muted-foreground">Type:</span>{" "}
                  {snapOfficial ? "Official" : "Unofficial"}
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
  const sentAt = new Date(log.sent_at);
  return (
    <div className="text-right shrink-0 space-y-1 min-w-[140px]">
      <Tooltip>
        <TooltipTrigger asChild>
          <p className="text-[10px] text-muted-foreground cursor-default">
            {formatDistanceToNow(sentAt, { addSuffix: true })}
          </p>
        </TooltipTrigger>
        <TooltipContent side="left">
          <p className="text-xs">{format(sentAt, "MMM d, yyyy HH:mm:ss")}</p>
        </TooltipContent>
      </Tooltip>
      <p className="text-[10px] text-muted-foreground/70" dir="auto">
        sent by: {log.sender_name}
      </p>
      <p className="text-[10px] text-muted-foreground/70 truncate max-w-[160px] ml-auto">
        from: {log.from_address}
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
  members: Array<{ name: string; email: string }>;
  subject?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg! max-h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>Recipients ({members.length})</DialogTitle>
          {subject && <DialogDescription>{subject}</DialogDescription>}
        </DialogHeader>
        <ScrollArea className="flex-1 border-t">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 sticky top-0 z-10">
              <tr>
                <th className="text-left py-2 px-4 font-medium text-xs text-muted-foreground">Name</th>
                <th className="text-left py-2 px-4 font-medium text-xs text-muted-foreground">Email</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => (
                <tr key={i} className="border-t">
                  <td className="py-1.5 px-4 text-xs">{m.name}</td>
                  <td className="py-1.5 px-4 text-xs text-muted-foreground">{m.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function CertificateRow({ log }: EmailLogRowProps) {
  const snapshot = getSnapshotData(log);
  const memberName = log.member_name ?? snapshot?.member.name ?? "Unknown";
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
              <span className="text-muted-foreground/60 text-xs">Member:</span>
              <span className="font-medium truncate">
                {nameDiffers ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="underline decoration-amber-500 decoration-dotted underline-offset-2 cursor-help text-amber-600 dark:text-amber-400">
                        {memberName}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">Name at send time: {snapshot?.member.name}</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  memberName
                )}
              </span>
            </div>
            {memberEmail && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="text-muted-foreground/60">Email:</span>
                <span className="truncate">{memberEmail}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <span className="text-muted-foreground/60">Event:</span>
          <EventNameWithTooltip eventName={eventName} eventOfficial={eventOfficial} snapshotEvent={snapshot?.event} />
        </div>
      </div>
      <MetaColumn log={log} />
    </div>
  );
}

function AcceptanceRow({ log, onViewHtml }: EmailLogRowProps) {
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
          <span className="text-muted-foreground/60">Event:</span>
          <EventNameWithTooltip eventName={eventName} eventOfficial={eventOfficial} snapshotEvent={data?.event} />
        </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
            {subject && (
              <span className="truncate max-w-[280px]">
                <span className="text-muted-foreground/60">Subject line:</span>{" "}
                <span className="italic">&ldquo;{subject}&rdquo;</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>{log.recipient_count} recipient{log.recipient_count !== 1 ? "s" : ""}</span>
            {members.length > 0 && (
              <button
                onClick={() => setMembersOpen(true)}
                className="underline decoration-dotted underline-offset-2 cursor-pointer hover:text-foreground transition-colors"
              >
                Members
              </button>
            )}
            {data?.html_content && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-[10px] shrink-0"
                onClick={() => onViewHtml(data.html_content, data.subject ?? "")}
              >
                <Eye className="h-3 w-3 mr-0.5" />
                HTML
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

function ManualCertificateRow({ log }: EmailLogRowProps) {
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
              <span className="text-muted-foreground/60 text-xs">Member:</span>
              <span className="font-medium truncate">
                {nameDiffers ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="underline decoration-amber-500 decoration-dotted underline-offset-2 cursor-help text-amber-600 dark:text-amber-400">
                        {memberName}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">Name at send time: {snapshot?.member.name}</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  memberName
                )}
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No member linked</p>
          )}
          {memberEmail && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="text-muted-foreground/60">Email:</span>
              <span className="truncate">{memberEmail}</span>
            </div>
          )}
        </div>
        {eventName ? (
          <div className="flex items-center gap-1 text-xs">
            <span className="text-muted-foreground/60">Event:</span>
            <EventNameWithTooltip eventName={eventName} eventOfficial={eventOfficial} snapshotEvent={snapshot?.event} />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">No event linked</p>
        )}
        {hasNoJoins && snapshot && (
          <p className="text-[10px] text-muted-foreground/60">(from snapshot data)</p>
        )}
      </div>
      <MetaColumn log={log} />
    </div>
  );
}

function DefaultRow({ log }: EmailLogRowProps) {
  const eventName = log.event_name;
  const eventOfficial = log.event_is_official != null ? !!log.event_is_official : undefined;
  return (
    <div className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-muted/30 transition-colors">
      <RowIcon type={log.email_type} />
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="text-sm font-medium">Email #{log.id}</p>
        {log.member_name && (
          <div className="flex items-center gap-1 text-xs">
            <span className="text-muted-foreground/60">Member:</span>
            <span className="truncate">{log.member_name}</span>
          </div>
        )}
        {log.member_email && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="text-muted-foreground/60">Email:</span>
            <span className="truncate">{log.member_email}</span>
          </div>
        )}
        {eventName && (
          <div className="flex items-center gap-1 text-xs">
            <span className="text-muted-foreground/60">Event:</span>
            <EventNameWithTooltip eventName={eventName} eventOfficial={eventOfficial} />
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          {log.recipient_count} recipient{log.recipient_count !== 1 ? "s" : ""}
        </p>
      </div>
      <MetaColumn log={log} />
    </div>
  );
}

export function EmailLogRow({ log, onViewHtml }: EmailLogRowProps) {
  switch (log.email_type) {
    case "event-certificate":
      return <CertificateRow log={log} onViewHtml={onViewHtml} />;
    case "acceptance":
      return <AcceptanceRow log={log} onViewHtml={onViewHtml} />;
    case "manual-certificate":
      return <ManualCertificateRow log={log} onViewHtml={onViewHtml} />;
    default:
      return <DefaultRow log={log} onViewHtml={onViewHtml} />;
  }
}
