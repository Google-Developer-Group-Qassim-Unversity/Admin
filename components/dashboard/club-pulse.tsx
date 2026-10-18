"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Building2, ChevronRight, type LucideIcon } from "lucide-react";

import { Plate, SectionHead } from "@/components/najdi";
import { SuperAdminSeal, TEAMS, whoseTurn } from "@/components/pipeline/roles";
import { TEAM_ICON } from "@/components/pipeline/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { useTimeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EventRequestSummary, PipelineTeam } from "@/lib/pipeline-types";

/**
 * A super admin's view of who has what, on the dashboard: each team's queue
 * and what waits on departments, each a link to that desk. Nothing here is
 * painted as theirs: these are other people's turns, and those people have
 * been told. The super admin's own work stays in the door above.
 */
export function ClubPulse({
  requests,
  isPending,
  panel = false,
}: {
  requests: EventRequestSummary[];
  isPending: boolean;
  panel?: boolean;
}) {
  const t = useTranslations("dashboard.club");
  const tt = useTranslations("pipeline.teams");
  const timeAgo = useTimeAgo();

  const rows = React.useMemo(() => {
    const teams = TEAMS.map((team) => {
      const waiting = requests.filter((r) => {
        const turn = whoseTurn(r);
        return turn?.kind === "teams" && turn.teams.includes(team);
      });
      const oldest = waiting
        .map((r) => r.task_states?.find((s) => s.team === team)?.opened_at)
        .filter((at): at is string => !!at)
        .sort()[0];
      return { key: team as PipelineTeam | "departments", icon: TEAM_ICON[team], count: waiting.length, oldest };
    });
    const departments = requests.filter((r) => whoseTurn(r)?.kind === "department").length;
    return [...teams, { key: "departments" as const, icon: Building2 as LucideIcon, count: departments, oldest: undefined }];
  }, [requests]);

  return (
    <section
      aria-labelledby="club-pulse"
      className={cn("flex flex-col gap-1", panel && "bg-card ring-rule rounded-xl px-5 pt-4 pb-2 ring-1")}
    >
      <SectionHead
        id="club-pulse"
        title={t("title")}
        action={<SuperAdminSeal compact />}
      />
      <p className="text-ink-2 pt-1 text-[13px] text-pretty">{t("hint")}</p>
      {isPending ? (
        <Skeleton className="my-2 h-40 w-full" />
      ) : (
        <ul className="flex flex-col">
          {rows.map((row) => {
            const href = row.key === "departments" ? "/pipeline?view=club#club-departments" : `/pipeline?view=${row.key}`;
            const name = row.key === "departments" ? t("departments") : tt(row.key);
            return (
              <li key={row.key}>
                <Link
                  href={href}
                  className="border-rule group hover:bg-card active:bg-sunk focus-visible:outline-ring flex min-h-14 items-center gap-3 border-b px-1 py-2 outline-none last:border-b-0 focus-visible:outline-2 focus-visible:-outline-offset-2"
                >
                  <Plate tone={row.key === "departments" ? "neutral" : "indigo"} icon={row.icon} size="sm" />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <b className="truncate text-[14.5px] font-bold">{t("waitingOn", { name })}</b>
                    <span className="text-ink-2 truncate text-[12.5px]">
                      {row.count ? (row.oldest ? t("oldest", { ago: timeAgo(row.oldest) }) : t("count", { count: row.count })) : t("clear")}
                    </span>
                  </span>
                  <b className={cn("tabular text-[19px] font-bold", !row.count && "text-ink-3")}>{row.count}</b>
                  <ChevronRight className="text-ink-3 group-hover:text-foreground size-[18px] shrink-0 rtl:-scale-x-100" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
