"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

import { EmptyLine, Plate, RowsSkeleton } from "@/components/najdi";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { isSending, useSends } from "@/hooks/use-email-sends";
import { errorMessage } from "@/lib/api/errors";
import type { Send, SendsFilters } from "@/lib/api-types";
import { useFormatters } from "@/lib/format";

import { KIND_ICON, recipientCount, SendProgress, SendStatusPill, titleIsEvent, useKindLabel, useSendTitle } from "./send-bits";

const DAY_MS = 86_400_000;

/** The day of an API time, "2026-10-30". They are naive Riyadh-local strings, so the day is the string's own. */
const dayKey = (iso: string) => iso.slice(0, 10);

/** "Today", "Yesterday", then "Tuesday, 14 October" (with the year once it is not this year's), by Riyadh's calendar. */
function useDayLabel() {
  const t = useTranslations("manageEmails.feed");
  const fmt = useFormatters();
  return (iso: string) => {
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date());
    const yesterday = new Date(Date.parse(today) - DAY_MS).toISOString().slice(0, 10);
    const key = dayKey(iso);
    if (key === today) return t("today");
    if (key === yesterday) return t("yesterday");
    const sameYear = key.slice(0, 4) === today.slice(0, 4);
    return fmt.custom(iso, { weekday: "long", day: "numeric", month: "long", year: sameYear ? undefined : "numeric" });
  };
}

/**
 * The outbox: one row per send (not per email), newest first, grouped by day.
 * Every kind of send gets the same row, so a mixed list scans like a filtered
 * one. A row opens the send's details; the event name inside it links to the event.
 */
export function SendsFeed({
  filters,
  emptyText,
  onOpen,
}: {
  filters: SendsFilters;
  emptyText: string;
  onOpen: (id: number) => void;
}) {
  const t = useTranslations("manageEmails.feed");
  const dayLabel = useDayLabel();
  const query = useSends(filters);

  if (query.isPending) return <RowsSkeleton rows={6} />;

  if (query.isError) {
    return (
      <Alert variant="destructive">
        <AlertCircle />
        <AlertTitle>{t("loadFailed")}</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-3">
          <span>{errorMessage(query.error, t("loadFailed"))}</span>
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
            {t("retry")}
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const sends = query.data!.pages.flatMap((page) => page.items);
  if (sends.length === 0) return <EmptyLine>{emptyText}</EmptyLine>;

  const days: { key: string; label: string; sends: Send[] }[] = [];
  for (const send of sends) {
    const key = dayKey(send.created_at);
    const last = days.at(-1);
    if (last?.key === key) last.sends.push(send);
    else days.push({ key, label: dayLabel(send.created_at), sends: [send] });
  }

  return (
    <div className="flex flex-col">
      {days.map((day) => (
        <section key={day.key} aria-label={day.label}>
          <h3 className="text-ink-3 border-rule border-b px-1 pt-5 pb-1.5 text-[12.5px] font-bold">{day.label}</h3>
          <ul className="flex flex-col">
            {day.sends.map((send) => (
              <SendRow key={send.id} send={send} showKind={!filters.kind} onOpen={onOpen} />
            ))}
          </ul>
        </section>
      ))}
      {query.nextPageError && <p role="alert" className="text-door-madder-ink mt-3 text-sm">{t("loadFailed")}</p>}
      {query.hasNextPage && (
        <Button
          variant="outline"
          className="mt-4 self-center"
          onClick={() => void query.fetchNextPage()}
          disabled={query.isFetchingNextPage}
        >
          {query.isFetchingNextPage && <Loader2 className="animate-spin motion-reduce:animate-none" />}
          {t("showMore")}
        </Button>
      )}
    </div>
  );
}

/**
 * Title: what it was about. Meta: the kind (unless a chip already says it),
 * the event when the title isn't it, who sent it, when. A plain finished send
 * shows only its count; a pill appears only when there is something to look at.
 */
function SendRow({ send, showKind, onOpen }: { send: Send; showKind: boolean; onOpen: (id: number) => void }) {
  const t = useTranslations("manageEmails.feed");
  const fmt = useFormatters();
  const title = useSendTitle()(send);
  const kindLabel = useKindLabel();
  const meta = [
    showKind && <span className="text-foreground whitespace-nowrap">{kindLabel(send.kind)}</span>,
    send.event && !titleIsEvent(send) && (
      <Link href={`/events/${send.event.id}`} className="relative z-10 max-w-full truncate underline-offset-2 hover:underline">
        <bdi>{send.event.name}</bdi>
      </Link>
    ),
    <bdi key="sender" className="truncate">{send.sender.name}</bdi>,
    <span key="time" className="tabular whitespace-nowrap">{fmt.time(send.created_at)}</span>,
  ].filter(Boolean);
  const state = (
    <>
      {send.status !== "succeeded" && <SendStatusPill send={send} />}
      <span className="text-ink-3 tabular text-[12.5px] whitespace-nowrap">{t("recipients", { count: recipientCount(send) })}</span>
    </>
  );

  return (
    <li data-send-id={send.id} className="border-rule hover:bg-card relative flex min-h-16 items-center gap-3 border-b px-1 py-3 transition-colors">
      <Plate tone="neutral" icon={KIND_ICON[send.kind]} />
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {/* The button stretches over the whole row; the event link sits above it. */}
        <button
          type="button"
          onClick={() => onOpen(send.id)}
          className="focus-visible:after:outline-ring truncate text-start text-[15px] font-bold outline-none after:absolute after:inset-0 after:rounded-sm focus-visible:after:outline-2"
        >
          <bdi>{title}</bdi>
        </button>
        <div className="text-ink-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px]">
          {/* A separator stays at the end of its item, never at the start of a wrapped line. */}
          {meta.map((part, i) => (
            <span key={i} className="flex min-w-0 max-w-full items-center gap-2">
              {part}
              {i < meta.length - 1 && <span className="shrink-0" aria-hidden="true">·</span>}
            </span>
          ))}
        </div>
        {isSending(send) && <SendProgress send={send} className="mt-1" />}
        {/* Phone: the state goes under the meta line so the title keeps the width. */}
        <div className="mt-0.5 flex items-center gap-2 sm:hidden">{state}</div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1 max-sm:hidden">{state}</div>
    </li>
  );
}
