"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Ban, Bell, CheckCheck, CornerUpLeft, Hourglass, Inbox, Megaphone, Send, type LucideIcon } from "lucide-react";

import { useDepartmentName } from "@/components/pipeline/shared";
import { Plate, type DoorTone } from "@/components/najdi";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccess } from "@/hooks/use-access";
import { usePipelineNotifications, useReadNotifications } from "@/hooks/use-pipeline";
import type { NotificationKind } from "@/lib/pipeline-types";
import { useTimeAgo } from "@/lib/format";

/** Each kind on its plate: ochre is waiting on the reader, madder went wrong, green moved on. */
const KIND: Record<NotificationKind, { tone: DoorTone; icon: LucideIcon }> = {
  request_received: { tone: "ochre", icon: Inbox },
  media_received: { tone: "ochre", icon: Megaphone },
  ready_to_publish: { tone: "ochre", icon: Send },
  returned: { tone: "madder", icon: CornerUpLeft },
  dates_banned: { tone: "madder", icon: Ban },
  hold_expired: { tone: "madder", icon: Hourglass },
  task_done: { tone: "green", icon: CheckCheck },
};


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
  const tr = useTranslations("pipeline.requests");
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
          <Bell className="size-5" strokeWidth={1.75} />
          {unread > 0 ? (
            <span className="bg-door-madder text-on-door tabular absolute top-1 end-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-sm px-1 text-[11px] leading-none font-bold shadow-[0_0_0_2px_var(--card)]">
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
        className="w-[calc(100vw-1rem)] gap-0 overflow-hidden rounded-xl p-0 sm:w-[400px]"
      >
        <div className="border-foreground flex min-h-12 items-center justify-between gap-2 border-b py-1.5 ps-4 pe-2">
          <h2 className="font-display text-[17px] font-semibold">{t("title")}</h2>
          {unread > 0 ? (
            <Button variant="link" size="sm" onClick={() => read.mutate("all")} disabled={read.isPending}>
              <CheckCheck />
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
          <div className="text-ink-2 flex flex-col items-center gap-2 px-4 py-10 text-sm">
            <Bell className="size-6 opacity-50" />
            {t("none")}
          </div>
        ) : (
          <ul className="divide-rule max-h-[min(30rem,70dvh)] divide-y overflow-y-auto overscroll-contain">
            {data.items.map((n) => (
              <li key={n.id}>
                <Link
                  href={`/pipeline/requests/${n.request.id}`}
                  onClick={() => {
                    if (!n.read) read.mutate(n.id);
                    setOpen(false);
                  }}
                  className="hover:bg-sunk focus-visible:bg-sunk flex items-center gap-3 px-4 py-3 outline-none transition-colors"
                >
                  <Plate tone={KIND[n.kind].tone} icon={KIND[n.kind].icon} size="sm" className={n.read ? "opacity-55" : undefined} />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className={`text-sm leading-snug ${n.read ? "text-ink-2 font-medium" : "font-bold"}`}>
                      {t(`kinds.${n.kind}`, { title: `\u2068${n.request.title || tr("untitled")}\u2069` })}
                    </span>
                    <span className="text-ink-2 text-xs">
                      {departmentName(n.department)} · {timeAgo(n.created_at)}
                    </span>
                  </div>
                  {n.read ? null : (
                    <span className="bg-door-ochre size-2 shrink-0 rounded-[1px]" aria-hidden="true" />
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
