"use client";

import * as React from "react";

import { Mark, SectionHead, type Tone } from "@/components/najdi";
import { Button } from "@/components/ui/button";
import { useFormatters } from "@/lib/format";

export type HistoryEntry = {
  /** ISO time it happened. */
  at: string;
  /** Who did it; the caller passes its own word for "the system". */
  actor: string;
  /** What they did, as a sentence that follows the name. */
  text: string;
  /** A second line worth reading: notes, what changed, who was marked. */
  note?: string;
  /** The state the step left things in, when it has one (returned, done). */
  tone?: Tone;
};

const COLLAPSED = 6;

/**
 * Who did what, newest first, as rows on the wall: a square mark (coloured
 * only when the step changed the state), the person in bold, what they did,
 * any note, and the time. Shared by a request's and an event's history.
 */
export function HistoryList({
  id,
  title,
  hint,
  entries,
  showAll,
  footer,
}: {
  id: string;
  title: string;
  hint: string;
  entries: HistoryEntry[];
  /** "Show all 14" */
  showAll: (count: number) => string;
  /** Trailing actions under the list, e.g. a link to the request. */
  footer?: React.ReactNode;
}) {
  const fmt = useFormatters();
  const [expanded, setExpanded] = React.useState(false);
  const visible = expanded ? entries : entries.slice(0, COLLAPSED);

  return (
    <section aria-labelledby={id} className="flex flex-col gap-1">
      <SectionHead id={id} title={title} count={entries.length || undefined} />
      <p className="text-ink-2 py-1 text-[13px]">{hint}</p>
      {visible.length ? (
        <ol className="flex flex-col">
          {visible.map((entry, index) => (
            <li key={`${entry.at}-${index}`} className="border-rule flex gap-3 border-b px-1 py-3">
              <Mark tone={entry.tone ?? "neutral"} className="mt-1.5" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="text-sm">
                    <bdi className="font-bold">{entry.actor}</bdi> {entry.text}
                  </p>
                  {entry.note ? (
                    <p dir="auto" className="text-ink-2 text-[13px] break-words whitespace-pre-wrap">
                      {entry.note}
                    </p>
                  ) : null}
                </div>
                <time dateTime={entry.at} className="text-ink-2 tabular shrink-0 text-xs">
                  {fmt.dateTime(entry.at)}
                </time>
              </div>
            </li>
          ))}
        </ol>
      ) : null}
      {entries.length > visible.length || footer ? (
        <div className="flex flex-wrap items-center gap-2 pt-2">
          {entries.length > visible.length ? (
            <Button variant="outline" size="sm" onClick={() => setExpanded(true)}>
              {showAll(entries.length)}
            </Button>
          ) : null}
          {footer}
        </div>
      ) : null}
    </section>
  );
}
