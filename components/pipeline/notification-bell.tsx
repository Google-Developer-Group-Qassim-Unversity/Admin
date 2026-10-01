"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Bell, CheckCheck } from "lucide-react";

import { useDepartmentName } from "@/components/pipeline/shared";
import { UrgencyDot, type Urgency } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccess } from "@/hooks/use-access";
import { usePipelineNotifications, useReadNotifications } from "@/hooks/use-pipeline";
import type { NotificationKind } from "@/lib/pipeline-types";

const URGENCY: Record<NotificationKind, Urgency> = {
  request_received: "waiting",
  media_received: "waiting",
  returned: "overdue",
  dates_banned: "overdue",
  hold_expired: "overdue",
  task_done: "done",
  ready_to_publish: "info",
};

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

/** "3 hours ago" - a notification's age matters more than its timestamp. */
function useTimeAgo() {
  const locale = useLocale();
  return React.useMemo(() => {
    const relative = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
    const absolute = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
    return (iso: string) => {
      const seconds = (new Date(iso).getTime() - Date.now()) / 1000;
      if (seconds < -7 * 86_400) return absolute.format(new Date(iso));
      for (const [unit, size] of UNITS) {
        if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit);
      }
      return relative.format(0, "minute");
    };
  }, [locale]);
}

/**
 * The pipeline's notifications, in the top bar so they reach people on every
 * page. Only rendered for someone who can open the pipeline; each person marks
 * their own read.
 */
export function NotificationBell() {
  const { canOpen, access } = useAccess();
  if (!access || !canOpen("/pipeline")) return null;
  return <NotificationPopover />;
}

function NotificationPopover() {
  const t = useTranslations("pipeline.notifications");
  const departmentName = useDepartmentName();
  const timeAgo = useTimeAgo();
  const [open, setOpen] = React.useState(false);
  const { data, isPending, error } = usePipelineNotifications();
  const read = useReadNotifications();

  // The pipeline has its own access check; if it refuses, there is no bell.
  if (error) return null;
  const unread = data?.unread ?? 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 md:h-[18px] md:w-[18px]" />
          {unread > 0 ? (
            <span className="bg-brand-red ring-card tabular absolute top-1 end-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none font-bold text-white ring-2">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
          <span className="sr-only">
            {t("title")}
            {unread > 0 ? ` (${unread})` : ""}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        collisionPadding={8}
        className="w-[calc(100vw-1rem)] gap-0 overflow-hidden rounded-xl p-0 sm:w-96"
      >
        <div className="border-border flex items-center justify-between gap-2 border-b py-2 ps-4 pe-2">
          <h2 className="font-display text-[15px] font-semibold tracking-tight">{t("title")}</h2>
          {unread > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => read.mutate("all")} disabled={read.isPending}>
              <CheckCheck className="h-4 w-4" />
              {t("readAll")}
            </Button>
          ) : (
            <span className="h-8" />
          )}
        </div>
        {isPending ? (
          <div className="flex flex-col gap-2 p-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !data?.items.length ? (
          <div className="text-muted-foreground flex flex-col items-center gap-2 px-4 py-10 text-sm">
            <Bell className="h-6 w-6 opacity-40" />
            {t("none")}
          </div>
        ) : (
          <ul className="divide-border max-h-[min(28rem,70dvh)] divide-y overflow-y-auto overscroll-contain">
            {data.items.map((n) => (
              <li key={n.id}>
                <Link
                  href={`/pipeline/requests/${n.request.id}`}
                  onClick={() => {
                    if (!n.read) read.mutate(n.id);
                    setOpen(false);
                  }}
                  className={`hover:bg-muted/60 focus-visible:bg-muted/60 flex items-start gap-3 px-4 py-3 outline-none transition-colors ${
                    n.read ? "" : "bg-brand-blue-soft/40"
                  }`}
                >
                  <UrgencyDot urgency={URGENCY[n.kind]} className="mt-1.5" />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className={`text-sm leading-snug ${n.read ? "text-muted-foreground" : "font-medium"}`}>
                      {t(`kinds.${n.kind}`, { title: n.request.title || `#${n.request.id}` })}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      {departmentName(n.department)} · {timeAgo(n.created_at)}
                    </span>
                  </div>
                  {n.read ? null : (
                    <span className="bg-brand-blue mt-2 h-2 w-2 shrink-0 rounded-full" aria-hidden="true" />
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
