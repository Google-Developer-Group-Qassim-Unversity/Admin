"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Bell, CheckCheck } from "lucide-react";

import { useDepartmentName } from "@/components/pipeline/shared";
import { UrgencyDot, type Urgency } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

/** What happened to your departments' requests, newest first. Each person marks their own read. */
export function NotificationsPanel() {
  const t = useTranslations("pipeline.notifications");
  const locale = useLocale();
  const departmentName = useDepartmentName();
  const { data, isPending } = usePipelineNotifications();
  const read = useReadNotifications();
  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  return (
    <section className="bg-card border-border flex flex-col gap-3 rounded-xl border p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Bell className="h-4 w-4" />
          {t("title")}
          {data?.unread ? (
            <span className="bg-brand-yellow-soft text-brand-yellow-ink tabular rounded-full px-2 py-0.5 text-xs">
              {data.unread}
            </span>
          ) : null}
        </h2>
        {data?.unread ? (
          <Button variant="ghost" size="sm" onClick={() => read.mutate("all")} disabled={read.isPending}>
            <CheckCheck className="h-4 w-4" />
            {t("readAll")}
          </Button>
        ) : null}
      </div>
      {isPending ? (
        <Skeleton className="h-20 w-full" />
      ) : !data?.items.length ? (
        <p className="text-muted-foreground text-sm">{t("none")}</p>
      ) : (
        <ul className="divide-border border-border divide-y rounded-lg border">
          {data.items.map((n) => (
            <li key={n.id} className={n.read ? "opacity-60" : ""}>
              <Link
                href={`/pipeline/requests/${n.request.id}`}
                onClick={() => !n.read && read.mutate(n.id)}
                className="hover:bg-muted/60 flex items-start gap-3 px-3 py-2.5 transition-colors"
              >
                <UrgencyDot urgency={URGENCY[n.kind]} className="mt-1.5" />
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-sm font-medium">
                    {t(`kinds.${n.kind}`, { title: n.request.title || `#${n.request.id}` })}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {departmentName(n.department)} · {formatter.format(new Date(n.created_at))}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
