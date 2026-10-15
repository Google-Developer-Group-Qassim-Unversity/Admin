"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Ban, Bell, CalendarClock, CalendarX2, CheckCheck, CornerUpLeft, Hourglass, Inbox, Megaphone, Send, XCircle, type LucideIcon } from "lucide-react";

import { useDepartmentName } from "@/components/pipeline/shared";
import { Plate, type Tone } from "@/components/najdi";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccess } from "@/hooks/use-access";
import { usePipelineNotifications, useReadNotifications } from "@/hooks/use-pipeline";
import { SegmentedControl } from "@/components/ui/segmented-control";
import type { NotificationKind, NotificationScope } from "@/lib/pipeline-types";
import { useTimeAgo } from "@/lib/format";

/** Each kind on its plate: ochre is waiting on the reader, madder went wrong, green moved on, neutral is news. */
const KIND: Record<NotificationKind, { tone: Tone; icon: LucideIcon }> = {
  request_received: { tone: "ochre", icon: Inbox },
  media_received: { tone: "ochre", icon: Megaphone },
  ready_to_publish: { tone: "ochre", icon: Send },
  returned: { tone: "madder", icon: CornerUpLeft },
  dates_banned: { tone: "madder", icon: Ban },
  hold_expired: { tone: "madder", icon: Hourglass },
  task_done: { tone: "green", icon: CheckCheck },
  // News, not a state: the dates moved, nothing is asked of the reader.
  dates_changed: { tone: "neutral", icon: CalendarClock },
  confirmation_changed: { tone: "neutral", icon: CalendarClock },
  overridden: { tone: "madder", icon: CalendarX2 },
  // News too: the work stops, nothing is asked of the reader.
  cancelled: { tone: "neutral", icon: XCircle },
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
  const { isSuperAdmin } = useAccess();
  const [open, setOpen] = React.useState(false);
  // A super admin's bell rings for their own departments and teams only; the
  // rest of the club is one tap away and never adds to the count.
  const [scope, setScope] = React.useState<NotificationScope>("mine");
  const mine = usePipelineNotifications();
  const club = usePipelineNotifications({ scope: "club", enabled: isSuperAdmin && open && scope === "club" });
  const shown = scope === "club" ? club : mine;
  const read = useReadNotifications(scope);
  const { data, isPending } = shown;

  // The pipeline has its own access check; if it refuses, there is no bell.
  if (mine.error) return null;
  const unread = mine.data?.unread ?? 0;
  const shownUnread = data?.unread ?? 0;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setScope("mine");
      }}
    >
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
          {shownUnread > 0 ? (
            <Button variant="link" size="sm" onClick={() => read.mutate("all")} disabled={read.isPending}>
              <CheckCheck />
              {t("readAll")}
            </Button>
          ) : (
            <span className="h-8" />
          )}
        </div>
        {isSuperAdmin ? (
          <div className="border-rule flex flex-col gap-2 border-b px-3 py-2.5">
            <SegmentedControl
              label={t("scope.label")}
              value={scope}
              onValueChange={(v) => setScope(v as NotificationScope)}
              options={[
                { value: "mine", label: unread ? `${t("scope.mine")} · ${unread}` : t("scope.mine") },
                { value: "club", label: t("scope.club") },
              ]}
            />
            <p className="text-ink-2 px-1 text-[12.5px] text-pretty">{scope === "mine" ? t("scope.mineHint") : t("scope.clubHint")}</p>
          </div>
        ) : null}
        {isPending ? (
          <div className="flex flex-col gap-2 p-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : shown.error ? (
          <p className="text-door-madder-ink px-4 py-8 text-center text-sm font-medium">{t("failed")}</p>
        ) : !data?.items.length ? (
          <div className="text-ink-2 flex flex-col items-center gap-2 px-6 py-10 text-center text-sm text-pretty">
            <Bell className="size-6 opacity-50" />
            {isSuperAdmin && scope === "mine" ? t("noneMine") : t("none")}
          </div>
        ) : (
          <ul className="divide-rule max-h-[min(30rem,60dvh)] divide-y overflow-y-auto overscroll-contain">
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
                  <Plate
                    tone={scope === "club" ? "neutral" : KIND[n.kind].tone}
                    icon={KIND[n.kind].icon}
                    size="sm"
                    className={n.read ? "opacity-55" : undefined}
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className={`text-sm leading-snug ${n.read ? "text-ink-2 font-medium" : "font-bold"}`}>
                      {t(`${scope === "club" ? "kindsClub" : "kinds"}.${n.kind}`, { title: `\u2068${n.request.title || tr("untitled")}\u2069` })}
                    </span>
                    <span className="text-ink-2 text-xs">
                      {scope === "club" ? t("forDepartment", { name: `\u2068${departmentName(n.department)}\u2069` }) : departmentName(n.department)} ·{" "}
                      {timeAgo(n.created_at)}
                    </span>
                  </div>
                  {n.read ? null : (
                    <span
                      className={`size-2 shrink-0 rounded-[1px] ${scope === "club" ? "bg-adobe" : "bg-door-ochre"}`}
                      aria-hidden="true"
                    />
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
