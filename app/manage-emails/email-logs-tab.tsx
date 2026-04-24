"use client";

import * as React from "react";
import { Activity, Loader2, Radio } from "lucide-react";
import { useAuth } from "@clerk/nextjs";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { buildEnrichedStreamUrl, getEmailLogsEnriched } from "@/lib/api";
import { parseSSEStream } from "@/lib/sse";
import type { EnrichedEmailLog } from "@/lib/api-types";

import { EmailLogFiltersBar } from "./email-log-filters";
import { EmailLogRow } from "./email-log-row";
import { HtmlPreviewDialog } from "./html-preview-dialog";
import type { EmailLogFilters } from "./types";

interface EmailLogsTabProps {
  onLogsLoaded?: (logs: EnrichedEmailLog[]) => void;
}

export function EmailLogsTab({ onLogsLoaded }: EmailLogsTabProps) {
  const { getToken } = useAuth();
  const [logs, setLogs] = React.useState<EnrichedEmailLog[]>([]);
  const [filters, setFilters] = React.useState<EmailLogFilters>({});
  const [isLive, setIsLive] = React.useState(true);
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [htmlPreview, setHtmlPreview] = React.useState<{ open: boolean; html: string; subject: string }>({
    open: false,
    html: "",
    subject: "",
  });
  const abortRef = React.useRef<AbortController | null>(null);

  const handleFiltersChange = React.useCallback((newFilters: EmailLogFilters) => {
    setFilters(newFilters);
    setLogs([]);
  }, []);

  const handleLiveToggle = React.useCallback((live: boolean) => {
    setIsLive(live);
    if (live) {
      setFilters((prev) => ({ ...prev, start_date: undefined, end_date: undefined }));
      setLogs([]);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      setIsLoading(true);
      const result = await getEmailLogsEnriched(filters, 0, 200, getToken);
      if (!cancelled && result.success) {
        setLogs(result.data);
        onLogsLoaded?.(result.data);
      }
      setIsLoading(false);
    }

    async function startStream() {
      const token = await getToken();
      if (!token) return;

      const ac = new AbortController();
      abortRef.current = ac;
      setIsStreaming(true);

      try {
        const url = buildEnrichedStreamUrl(filters);
        const res = await fetch(url, {
          signal: ac.signal,
          headers: {
            Accept: "text/event-stream",
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok || !res.body) {
          setIsStreaming(false);
          return;
        }

        parseSSEStream(
          res.body.getReader(),
          (event, eventData) => {
            if (event === "log") {
              try {
                const log: EnrichedEmailLog = JSON.parse(eventData);
                setLogs((prev) => {
                  if (prev.some((l) => l.id === log.id)) return prev;
                  return [log, ...prev];
                });
              } catch {}
            }
          },
          () => {
            if (!ac.signal.aborted) setIsStreaming(false);
          },
          () => {
            if (!ac.signal.aborted) setIsStreaming(false);
          },
          ac.signal,
        );
      } catch {
        if (!ac.signal.aborted) setIsStreaming(false);
      }
    }

    if (isLive) {
      startStream();
    } else {
      loadInitial();
    }

    return () => {
      cancelled = true;
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [filters, isLive, getToken, onLogsLoaded]);

  const handleViewHtml = (html: string, subject: string) => {
    setHtmlPreview({ open: true, html, subject });
  };

  const hasActiveFilters = !!(filters.email_type || filters.event_id || filters.member_id);

  const clearAllFilters = () => {
    setFilters({});
    setIsLive(true);
  };

  return (
    <div className="space-y-3">
      <EmailLogFiltersBar
        filters={filters}
        onFiltersChange={handleFiltersChange}
        isLive={isLive}
        onLiveToggle={handleLiveToggle}
      />

      <div className="rounded-lg border bg-muted/30">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {logs.length > 0 ? `${logs.length} log${logs.length !== 1 ? "s" : ""}` : "No logs"}
            </span>
            {isStreaming && isLive && (
              <Badge variant="outline" className="gap-1 text-emerald-600 border-emerald-500/30 text-[10px]">
                <Activity className="h-3 w-3 animate-pulse" />
                Live
              </Badge>
            )}
          </div>
          <span className="text-[10px] text-muted-foreground">{isLive ? "Auto-updating" : "Static view"}</span>
        </div>
        <ScrollArea className="h-[520px]">
          {isLoading && !isLive ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground gap-3">
              {isLive && isStreaming ? (
                hasActiveFilters ? (
                  <>
                    <Radio className="h-4 w-4 animate-pulse text-emerald-500" />
                    <span>Listening for logs matching filters...</span>
                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={clearAllFilters}>
                      Clear filters
                    </Button>
                  </>
                ) : (
                  <>
                    <Radio className="h-4 w-4 animate-pulse text-emerald-500" />
                    <span>Listening for new logs...</span>
                  </>
                )
              ) : isLive && !isStreaming ? (
                <>
                  <Activity className="h-4 w-4 opacity-50" />
                  <span>Stream disconnected</span>
                </>
              ) : (
                <span>No email logs found for this period.</span>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {logs.map((log) => (
                <EmailLogRow key={log.id} log={log} onViewHtml={handleViewHtml} />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      <HtmlPreviewDialog
        open={htmlPreview.open}
        onOpenChange={(open) => setHtmlPreview((prev) => ({ ...prev, open }))}
        html={htmlPreview.html}
        subject={htmlPreview.subject}
      />
    </div>
  );
}
