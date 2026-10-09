"use client";

import { useTranslations } from "next-intl";

import { INK, Mortar } from "@/components/najdi";
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

  const tiles: { key: string; label: string; value: number; ink: string; className?: string }[] = [
    { key: "total", label: t("tiles.total"), value: total, ink: "text-foreground", className: "col-span-2 sm:col-span-1" },
    { key: "accepted", label: t("tiles.accepted"), value: accepted, ink: INK.green },
    { key: "emailed", label: t("tiles.emailed"), value: invited, ink: INK.indigo },
    { key: "notEmailed", label: t("tiles.notEmailed"), value: acceptedNotInvited, ink: acceptedNotInvited ? INK.ochre : "text-ink-2" },
    { key: "pending", label: t("tiles.pending"), value: pending, ink: pending ? INK.ochre : "text-ink-2" },
  ];

  return (
    <section aria-label={t("title")} className="mb-5 sm:mb-6">
      <h3 className="sr-only">{t("title")}</h3>
      {/* Bricks in mortar: each count in the colour of the state it counts. */}
      <Mortar className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
        <dl className="contents">
          {tiles.map((tile) => (
            <div key={tile.key} className={cn("bg-card flex flex-col-reverse gap-1 rounded-sm px-3.5 py-3", tile.className)}>
              <dt className="text-ink-2 truncate text-[12.5px] font-medium">{tile.label}</dt>
              <dd className={cn("tabular text-[21px] leading-none font-bold", tile.ink)}>{tile.value}</dd>
            </div>
          ))}
        </dl>
      </Mortar>
    </section>
  );
}
