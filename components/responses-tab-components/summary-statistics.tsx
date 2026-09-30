"use client";

import { useTranslations } from "next-intl";

import { URGENCY_STYLES } from "@/components/status-badge";
import { cn } from "@/lib/utils";

interface SummaryStatisticsProps {
  total: number;
  accepted: number;
  pending: number;
  invited: number;
  acceptedNotInvited: number;
}

/**
 * Response counts as small tiles - 2-up on a phone (total spans the row),
 * one row of five on a wide screen. Each tile's dot says what state it
 * counts: green done (accepted), blue informational (emailed), yellow
 * waiting on an admin (not yet emailed, not yet accepted).
 */
export function SummaryStatistics({
  total,
  accepted,
  pending,
  invited,
  acceptedNotInvited,
}: SummaryStatisticsProps) {
  const t = useTranslations("responses.summary");

  const tiles: { key: string; label: string; value: number; dot: string | null; className?: string }[] = [
    { key: "total", label: t("tiles.total"), value: total, dot: null, className: "col-span-2 sm:col-span-1" },
    { key: "accepted", label: t("tiles.accepted"), value: accepted, dot: URGENCY_STYLES.done.dot },
    { key: "emailed", label: t("tiles.emailed"), value: invited, dot: URGENCY_STYLES.info.dot },
    { key: "notEmailed", label: t("tiles.notEmailed"), value: acceptedNotInvited, dot: URGENCY_STYLES.waiting.dot },
    { key: "pending", label: t("tiles.pending"), value: pending, dot: URGENCY_STYLES.waiting.dot },
  ];

  return (
    <section aria-label={t("title")} className="mb-5 sm:mb-6">
      <h3 className="sr-only">{t("title")}</h3>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-5">
        {tiles.map((tile) => (
          <div
            key={tile.key}
            className={cn("rounded-xl border bg-muted/40 px-3.5 py-3", tile.className)}
          >
            <dt className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
              {tile.dot ? (
                <span className={cn("inline-block h-2 w-2 shrink-0 rounded-full", tile.dot)} aria-hidden="true" />
              ) : null}
              <span className="truncate">{tile.label}</span>
            </dt>
            <dd className="tabular mt-1 font-display text-2xl leading-none font-semibold tracking-tight">
              {tile.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
