"use client";

import * as React from "react";
import { Activity, ChevronLeft, ChevronRight, Loader2, Radio } from "lucide-react";
import { useAuth } from "@clerk/nextjs";

import { Mark } from "@/components/najdi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { buildEnrichedStreamUrl, getEmailLogsEnriched } from "@/lib/api";
import { parseSSEStream } from "@/lib/sse";
import type { EnrichedEmailLog } from "@/lib/api-types";
import { useTranslations } from "next-intl";

import { EmailLogFiltersBar } from "./email-log-filters";
import { EmailLogRow } from "./email-log-row";
import { HtmlPreviewDialog } from "./html-preview-dialog";
import type { EmailLogFilters } from "./types";

interface EmailLogsTabProps {
  onLogsLoaded?: (logs: EnrichedEmailLog[]) => void;
}

const LOGS_PAGE_SIZE = 100;

export function EmailLogsTab({ onLogsLoaded }: EmailLogsTabProps) {
  const t = useTranslations("manageEmails.logsTab");
  const tp = useTranslations("manageEmails.pagination");
  const { getToken } = useAuth();
  const [logs, setLogs] = React.useState<EnrichedEmailLog[]>([]);
  const [page, setPage] = React.useState(1);
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
  const animateReadyRef = React.useRef(false);
  const [newIds, setNewIds] = React.useState<Set<number>>(new Set());

  const markNew = React.useCallback((id: number) => {
    if (!animateReadyRef.current) return;
    setNewIds((prev) => new Set(prev).add(id));
    setTimeout(() => {
      setNewIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 1500);
  }, []);

  const handleFiltersChange = React.useCallback((newFilters: EmailLogFilters) => {
    setFilters(newFilters);
    setLogs([]);
    setPage(1);
  }, []);

  const handleLiveToggle = React.useCallback((live: boolean) => {
    setIsLive(live);
    setPage(1);
    if (live) {
      setFilters((prev) => ({ ...prev, start_date: undefined, end_date: undefined }));
      setLogs([]);
    }
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      setIsLoading(true);
      const result = await getEmailLogsEnriched(filters, (page - 1) * LOGS_PAGE_SIZE, LOGS_PAGE_SIZE, getToken);
      if (!cancelled && result.success) {
        setLogs(result.data);
        onLogsLoaded?.(result.data);
      }
      setIsLoading(false);
    }

    async function startStream() {
      const token = await getToken();
      if (!token) return;

      animateReadyRef.current = false;
      const ac = new AbortController();
      abortRef.current = ac;
      setIsStreaming(true);
      const readyTimer = setTimeout(() => {
        animateReadyRef.current = true;
      }, 1500);

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
                markNew(log.id);
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
        clearTimeout(readyTimer);
      }
    }

    if (isLive) {
      startStream();
    } else {
      loadInitial();
    }

    return () => {
      cancelled = true;
      animateReadyRef.current = false;
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [filters, isLive, page, getToken, onLogsLoaded, markNew]);

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

      <div className="bg-card ring-rule overflow-hidden rounded-xl ring-1">
        <div className="border-rule flex min-h-11 items-center justify-between gap-2 border-b px-3">
          <div className="flex items-center gap-2">
            <span className="tabular text-sm font-bold">{t("logsCount", { count: logs.length })}</span>
            {isStreaming && isLive && (
              <Badge variant="green">
                <Mark tone="green" className="size-2 motion-safe:animate-pulse" />
                {t("live")}
              </Badge>
            )}
          </div>
          <span className="text-ink-2 text-xs">{isLive ? t("autoUpdating") : t("staticView")}</span>
        </div>
        {/* On a phone the list flows with the page - a scroll box inside a
            scrolling page is a thumb trap. From md it is the fixed-height pane. */}
        <ScrollArea className="md:h-[520px] [&_[data-slot=scroll-area-viewport]>div]:block!">
          {isLoading && !isLive ? (
            <div className="text-ink-2 flex items-center justify-center gap-2 py-12 text-sm">
              <Loader2 className="size-4 animate-spin" />
              {t("loading")}
            </div>
          ) : logs.length === 0 ? (
            <div className="text-ink-2 flex flex-col items-center justify-center gap-3 px-4 py-12 text-center text-sm">
              {isLive && isStreaming ? (
                hasActiveFilters ? (
                  <>
                    <Radio className="text-door-green-ink size-5 motion-safe:animate-pulse" />
                    <span>{t("listeningFiltered")}</span>
                    <Button variant="outline" size="sm" onClick={clearAllFilters}>
                      {t("clearFilters")}
                    </Button>
                  </>
                ) : (
                  <>
                    <Radio className="text-door-green-ink size-5 motion-safe:animate-pulse" />
                    <span>{t("listening")}</span>
                  </>
                )
              ) : isLive && !isStreaming ? (
                <>
                  <Activity className="text-door-madder-ink size-5" />
                  <span>{t("disconnected")}</span>
                </>
              ) : (
                <span>{t("noneForPeriod")}</span>
              )}
            </div>
          ) : (
            <div className="divide-rule divide-y">
              {logs.map((log) => (
                <EmailLogRow key={log.id} log={log} onViewHtml={handleViewHtml} isNew={newIds.has(log.id)} />
              ))}
            </div>
          )}
        </ScrollArea>
        {!isLive && (
          <div className="border-rule flex items-center justify-between border-t px-3 py-2">
            <span className="tabular text-ink-2 text-xs">{tp("page", { page })}</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="rtl:-scale-x-100" />
                {tp("prev")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={logs.length < LOGS_PAGE_SIZE || isLoading}
                onClick={() => setPage((p) => p + 1)}
              >
                {tp("next")}
                <ChevronRight className="rtl:-scale-x-100" />
              </Button>
            </div>
          </div>
        )}
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
