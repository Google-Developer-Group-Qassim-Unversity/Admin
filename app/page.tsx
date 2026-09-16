"use client";

import * as React from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { CalendarPlus, Mail, Radio, Users } from "lucide-react";

import { BrandArcs, BrandRail } from "@/components/brand-mark";
import { AttentionQueue } from "@/components/dashboard/attention-queue";
import { PipelineCard } from "@/components/dashboard/pipeline-card";
import { StatTile } from "@/components/dashboard/stat-tile";
import { Button } from "@/components/ui/button";
import { useEvents } from "@/hooks/use-event";
import { useMembers } from "@/hooks/use-members";
import { getEmailDashboardStats } from "@/lib/api";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const { getToken } = useAuth();

  const { data: events, isPending: eventsPending } = useEvents(undefined);
  const { data: members, isPending: membersPending } = useMembers(getToken);

  const { data: emailStats, isPending: emailsPending } = useQuery({
    queryKey: ["emails", "stats", "dashboard", 1],
    queryFn: async () => {
      const result = await getEmailDashboardStats(1, getToken);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
  });

  const counts = React.useMemo(() => {
    const list = events ?? [];
    const open = list.filter((e) => e.status === "open");
    const active = list.filter((e) => e.status === "active");
    return { open: open.length, active: active.length, liveName: active[0]?.name ?? null };
  }, [events]);

  const memberSplit = React.useMemo(() => {
    const list = members ?? [];
    return {
      total: list.length,
      verified: list.filter((m) => m.is_authenticated).length,
    };
  }, [members]);

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5">
      {/* Hero. The arcs bleed off the trailing corner and flip with the locale. */}
      <section className="bg-card brand-hero border-border relative overflow-hidden rounded-2xl border px-6 py-7 sm:px-8">
        <BrandRail className="absolute inset-x-0 top-0" />
        <BrandArcs
          size={380}
          className="pointer-events-none absolute -top-28 -end-16 opacity-40 rtl:-scale-x-100"
        />

        <div className="relative flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {t("title")}
            </h1>
            <p className="text-muted-foreground max-w-xl text-[15px] text-pretty">
              {eventsPending
                ? t("summaryLoading")
                : t("summary", { live: counts.active, open: counts.open })}
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Button asChild>
              <Link href="/events/create">
                <CalendarPlus className="h-4 w-4" />
                {t("newEvent")}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/events">{t("allEvents")}</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          icon={CalendarPlus}
          tone="blue"
          label={t("tiles.open")}
          value={counts.open}
          hint={t("tiles.openHint")}
          isPending={eventsPending}
        />
        <StatTile
          icon={Radio}
          tone="green"
          label={t("tiles.live")}
          value={counts.active}
          hint={counts.liveName ?? t("tiles.liveNone")}
          isPending={eventsPending}
        />
        <StatTile
          icon={Users}
          tone="blue"
          label={t("tiles.members")}
          value={memberSplit.total.toLocaleString()}
          hint={t("tiles.membersHint", {
            verified: memberSplit.verified,
            pending: memberSplit.total - memberSplit.verified,
          })}
          isPending={membersPending}
        />
        <StatTile
          icon={Mail}
          tone="neutral"
          label={t("tiles.emails")}
          value={emailStats?.total_24h ?? 0}
          hint={t("tiles.emailsHint")}
          isPending={emailsPending}
        />
      </div>

      <div className="grid gap-3.5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <AttentionQueue />
        <PipelineCard events={events ?? []} />
      </div>
    </div>
  );
}
