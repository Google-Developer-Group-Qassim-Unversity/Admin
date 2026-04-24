"use client";

import * as React from "react";
import { Mail, Loader2, Activity, CheckCircle, Send, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { API_BASE_URL, getCertificateEligibleCount, sendEventCertificates } from "@/lib/api";
import { parseSSEStream } from "@/lib/sse";

import type { CertificateEmailLog, CertificateEligibility, EligibleMember } from "./types";

type SubTab = "sent" | "not-sent";

interface CertificateTabProps {
  eventId: number;
  getToken: () => Promise<string | null>;
}

export function CertificateTab({ eventId, getToken }: CertificateTabProps) {
  const [subTab, setSubTab] = React.useState<SubTab>("sent");
  const [data, setData] = React.useState<CertificateEligibility | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSending, setIsSending] = React.useState(false);
  const [hasSent, setHasSent] = React.useState(false);
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [logs, setLogs] = React.useState<CertificateEmailLog[]>([]);
  const abortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      const result = await getCertificateEligibleCount(eventId, getToken);
      if (!cancelled && result.success) {
        setData(result.data);
      }
      setIsLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [eventId]);

  React.useEffect(() => {
    if (data && data.sent_count > 0) {
      startStream();
    }
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [data?.sent_count]);

  const startStream = React.useCallback(async () => {
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const token = await getToken();
    if (!token) return;

    const ac = new AbortController();
    abortRef.current = ac;
    setIsStreaming(true);

    try {
      const res = await fetch(
        `${API_BASE_URL}/emails/certificate-event/logs/stream/${eventId}`,
        {
          signal: ac.signal,
          headers: {
            Accept: "text/event-stream",
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!res.ok || !res.body) {
        setIsStreaming(false);
        return;
      }

      parseSSEStream(
        res.body.getReader(),
        (event, eventData) => {
          if (event === "log") {
            try {
              const log: CertificateEmailLog = JSON.parse(eventData);
              setLogs((prev) => [log, ...prev]);
            } catch {}
          }
        },
        () => {
          if (!ac.signal.aborted) {
            setIsStreaming(false);
          }
        },
        () => {
          if (!ac.signal.aborted) {
            setIsStreaming(false);
          }
        },
        ac.signal,
      );
    } catch {
      if (!ac.signal.aborted) {
        setIsStreaming(false);
      }
    }
  }, [eventId, getToken]);

  const handleSend = async () => {
    setIsSending(true);
    try {
      const result = await sendEventCertificates(eventId, getToken);
      if (!result.success) {
        throw new Error(result.error.message);
      }
      toast.success("Certificate generation initiated");
      setHasSent(true);
      setSubTab("sent");
      startStream();
    } catch (error) {
      toast.error("Failed to send certificates", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSending(false);
    }
  };

  const formatSentAt = (sentAt: string) => {
    try {
      return new Date(sentAt).toLocaleString();
    } catch {
      return sentAt;
    }
  };

  const eligibleMembers = data?.eligible_members ?? [];
  const eligibleCount = data?.eligible_count ?? 0;
  const sentCount = data?.sent_count ?? 0;

  const sentEmails = React.useMemo(
    () => new Set(logs.map((l) => l.member_email)),
    [logs],
  );
  const notSentMembers = React.useMemo(
    () => eligibleMembers.filter((m) => !sentEmails.has(m.email)),
    [eligibleMembers, sentEmails],
  );
  const notSentCount = notSentMembers.length;

  return (
    <div className="space-y-3 px-1 pb-1">
      <div className="flex gap-1 p-1 bg-muted rounded-lg">
        <button
          onClick={() => setSubTab("sent")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            subTab === "sent"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Send className="h-3.5 w-3.5" />
          Sent {logs.length > 0 ? `(${logs.length})` : sentCount > 0 ? `(${sentCount})` : ""}
        </button>
        <button
          onClick={() => setSubTab("not-sent")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            subTab === "not-sent"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          Not Sent ({notSentCount})
        </button>
      </div>

      {subTab === "sent" && (
        <div className="rounded-lg border bg-muted/30">
          <div className="flex items-center justify-between px-3 py-2 border-b">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {logs.length > 0
                  ? `${logs.length} certificate${logs.length !== 1 ? "s" : ""} sent`
                  : "No certificates sent yet"}
              </span>
              {isStreaming && (
                <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-500/30">
                  <Activity className="h-3 w-3 animate-pulse" />
                  Live
                </Badge>
              )}
            </div>
          </div>
          <ScrollArea className="h-[320px]">
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground gap-2">
                {isStreaming ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin opacity-50" />
                    Waiting for logs...
                  </>
                ) : (
                  "No certificate emails sent yet."
                )}
              </div>
            ) : (
              <div className="divide-y">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 px-3 py-2.5 animate-in fade-in slide-in-from-top-2 duration-300"
                  >
                    <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{log.member_name}</span>
                      <p className="text-xs text-muted-foreground truncate">{log.member_email}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-xs text-muted-foreground">{formatSentAt(log.sent_at)}</div>
                      <div className="text-[10px] text-muted-foreground/70">{log.from_address}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      {subTab === "not-sent" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {isLoading
                ? "Loading..."
                : `${notSentCount} eligible recipient${notSentCount !== 1 ? "s" : ""}`}
            </span>
            <Button
              onClick={handleSend}
              disabled={isSending || hasSent || eligibleCount === 0}
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : hasSent ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Certificates Sent
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Certificates ({notSentCount})
                </>
              )}
            </Button>
          </div>

          <div className="rounded-lg border bg-muted/30">
            <ScrollArea className="h-[310px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : notSentMembers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
                  All attendees have received certificates.
                </div>
              ) : (
                <div className="divide-y">
                  {notSentMembers.map((member) => (
                    <div key={member.id} className="flex items-start gap-3 px-3 py-2.5">
                      <Users className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="text-sm font-medium">{member.name}</span>
                        <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
}
