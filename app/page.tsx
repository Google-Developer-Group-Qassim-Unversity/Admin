"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { CalendarPlus } from "lucide-react";

import { AttentionList, EventsNow, StageBoard, StageStrip, Stats, TeamInbox, type Stat } from "@/components/dashboard/overview";
import { YourTurn, waitingOnYou } from "@/components/dashboard/your-turn";
import { SectionHead } from "@/components/najdi";
import { BookingCalendar } from "@/components/pipeline/booking-calendar";
import { RequestList } from "@/components/pipeline/request-list";
import { hasTeam, useOwnDepartmentIds } from "@/components/pipeline/shared";
import { Button } from "@/components/ui/button";
import { useAccess } from "@/hooks/use-access";
import { useAttention } from "@/hooks/use-attention";
import { useEvents } from "@/hooks/use-event";
import { memberStatsQuery } from "@/hooks/use-members";
import { useInbox, usePipelineMe, usePipelineOverview } from "@/hooks/use-pipeline";
import { getEmailDashboardStats } from "@/lib/api";
import { useApi } from "@/lib/api/client";
import { useFormatters } from "@/lib/format";

/**
 * Home. The event pipeline is the club's main way to make an event, so it is
 * the heart of this page: whose turn it is (one painted door), the caller's own
 * requests, what waits on their teams and where everything stands. Events,
 * attention and the real numbers follow. Someone without pipeline access gets
 * the events half.
 */
export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const fmt = useFormatters();
  const { user } = useUser();
  const { can, canOpen, access } = useAccess();
  const pipelineAllowed = Boolean(access) && canOpen("/pipeline");

  const me = usePipelineMe({ enabled: pipelineAllowed });
  const pipeline = pipelineAllowed && me.data?.has_access === true;
  const ownIds = useOwnDepartmentIds(me.data);
  const overview = usePipelineOverview(pipeline);
  const withTeam = pipeline && hasTeam(me.data);
  const inbox = useInbox(withTeam);
  const { data: events, isPending: eventsPending } = useEvents(undefined);
  const attention = useAttention();
  const canSeeMembers = can("members.view");
  const api = useApi();
  const members = useQuery({ ...memberStatsQuery(api), enabled: canSeeMembers });
  // Email stats have not moved to lib/api/ yet (lib/api.ts's header lists what has).
  const { getToken } = useAuth();
  const { data: emailStats } = useQuery({
    queryKey: ["emails", "stats", "dashboard", 1],
    queryFn: async () => {
      const result = await getEmailDashboardStats(1, getToken);
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
  });

  const all = React.useMemo(() => (overview.data?.items ?? []).filter((r) => r.stage !== "cancelled"), [overview.data]);
  const mine = React.useMemo(() => all.filter((r) => ownIds.has(r.department.id)), [all, ownIds]);
  const waiting = React.useMemo(() => waitingOnYou(mine), [mine]);
  // Oldest first, one entry per request: the door takes the task that has waited longest.
  const teamTasks = React.useMemo(
    () =>
      [...new Map((inbox.data ?? []).map((item) => [item.request.id, item])).values()].sort((a, b) =>
        (a.opened_at ?? "").localeCompare(b.opened_at ?? ""),
      ),
    [inbox.data],
  );
  const mineSorted = React.useMemo(() => {
    const first = new Set(waiting.map((w) => w.request.id));
    return [...mine].sort((a, b) => Number(first.has(b.id)) - Number(first.has(a.id))).slice(0, 4);
  }, [mine, waiting]);
  const stagesTitle = me.data?.is_super_admin ? t("stages.club") : t("stages.yours");

  const counts = React.useMemo(() => {
    const list = events ?? [];
    return { open: list.filter((e) => e.status === "open").length, live: list.filter((e) => e.status === "active").length };
  }, [events]);

  const stats: Stat[] = [
    { label: t("tiles.open"), value: counts.open },
    { label: t("tiles.live"), value: counts.live },
    ...(canSeeMembers && members.data
      ? [
          {
            label: t("tiles.members"),
            value: fmt.number(members.data.total),
            note: t("tiles.membersHint", { verified: members.data.authenticated, pending: members.data.total - members.data.authenticated }),
          },
        ]
      : []),
    { label: t("tiles.emails"), value: emailStats?.total_24h ?? 0 },
  ];

  const greeting = (
    <header className="flex flex-col gap-1">
      <h1 className="font-display text-[26px] leading-tight font-semibold sm:text-[30px]">
        {user?.firstName ? t("greeting", { name: user.firstName }) : t("title")}
      </h1>
      <p className="text-ink-2 max-w-[70ch] text-[15px] text-pretty">
        {eventsPending ? t("summaryLoading") : t("summary", { live: counts.live, open: counts.open })}
      </p>
    </header>
  );

  const yourRequests = (
    <section aria-labelledby="your-requests" className="flex flex-col gap-1">
      <SectionHead
        id="your-requests"
        title={t("yourRequests")}
        action={
          <Link href="/pipeline" className="text-door-indigo-ink inline-flex min-h-8 items-center underline-offset-3 hover:underline">
            {t("all")}
          </Link>
        }
      />
      <RequestList
        items={mineSorted}
        isPending={overview.isPending}
        empty={t("noRequests")}
        showDepartment={ownIds.size > 1}
      />
    </section>
  );

  if (!pipeline) {
    return (
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-7">
        {greeting}
        <div className="grid gap-7 lg:grid-cols-2">
          <EventsNow events={events} isPending={eventsPending} panel />
          <AttentionList items={attention.items} isPending={attention.isPending} panel />
        </div>
        <Stats stats={stats} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-7">
      {greeting}

      {/* Phone: one column, in the order the job happens. */}
      <div className="flex flex-col gap-7 lg:hidden">
        <YourTurn waiting={waiting} teamTasks={teamTasks} isPending={overview.isPending || (withTeam && inbox.isPending)} />
        {withTeam ? <TeamInbox items={inbox.data} isPending={inbox.isPending} /> : null}
        {yourRequests}
        <StageStrip requests={all} title={stagesTitle} isPending={overview.isPending} />
        <EventsNow events={events} isPending={eventsPending} />
        <AttentionList items={attention.items} isPending={attention.isPending} />
        <Stats stats={stats} />
      </div>

      {/* Wide: the door and what waits beside the booking calendar, then the board. */}
      <div className="hidden gap-6 lg:grid lg:grid-cols-[minmax(340px,392px)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          <YourTurn waiting={waiting} teamTasks={teamTasks} isPending={overview.isPending || (withTeam && inbox.isPending)} big />
          {withTeam ? <TeamInbox items={inbox.data} isPending={inbox.isPending} panel /> : null}
          <div className="bg-card ring-rule rounded-xl px-5 pt-4 pb-2 ring-1">{yourRequests}</div>
        </div>
        <DashboardCalendar />
        <div className="col-span-2">
          <StageBoard requests={all} title={stagesTitle} isPending={overview.isPending} />
        </div>
        <EventsNow events={events} isPending={eventsPending} panel />
        <AttentionList items={attention.items} isPending={attention.isPending} panel />
        <div className="col-span-2">
          <Stats stats={stats} />
        </div>
      </div>
    </div>
  );
}

/** The booking calendar, read-only: a booked day opens its request, Book opens booking mode. */
function DashboardCalendar() {
  const t = useTranslations("pipeline");
  const router = useRouter();
  return (
    <section aria-labelledby="dashboard-calendar" className="bg-card ring-rule flex flex-col gap-3 self-start rounded-xl p-5 ring-1">
      <SectionHead
        id="dashboard-calendar"
        title={t("calendar.title")}
        action={
          <Button asChild variant="ochre" size="sm">
            <Link href="/pipeline?book=1">
              <CalendarPlus />
              {t("book.start")}
            </Link>
          </Button>
        }
      />
      <BookingCalendar
        showNotes={false}
        onDayClick={(day) => {
          const first = day.requests?.[0];
          if (first) router.push(`/pipeline/requests/${first.id}`);
        }}
        isSelectable={(day) => Boolean(day.requests?.length)}
      />
    </section>
  );
}
