"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Ban, Building2, CalendarPlus, CircleHelp, Crown, Route } from "lucide-react";

import { SectionHead } from "@/components/najdi";
import { PageHeader } from "@/components/page-header";
import { BanEditor } from "@/components/pipeline/ban-editor";
import { BookPanel } from "@/components/pipeline/book-panel";
import { BookingCalendar } from "@/components/pipeline/booking-calendar";
import { usePipelineRole, type PipelineRole } from "@/components/pipeline/roles";
import { PipelineGate, TEAM_ICON } from "@/components/pipeline/shared";
import { ClubView, DepartmentView, DeskView, ViewCount } from "@/components/pipeline/views";
import { waitingOnYou } from "@/components/dashboard/your-turn";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useInbox, useRequestSlice } from "@/hooks/use-pipeline";
import { cn } from "@/lib/utils";
import type { PipelineMe, PipelineTeam } from "@/lib/pipeline-types";

export default function PipelinePage() {
  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <PipelineGate>
        {(me) => (
          // useSearchParams needs a boundary so the page can still prerender.
          <React.Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
            <PipelineHome me={me} />
          </React.Suspense>
        )}
      </PipelineGate>
    </div>
  );
}

type View = "department" | PipelineTeam | "club";

/** The views the caller has, in the order the tabs show them. */
function viewsFor(role: PipelineRole, hasDepartment: boolean): View[] {
  return [
    ...(hasDepartment ? (["department"] as const) : []),
    ...role.deskTeams,
    ...(role.isSuperAdmin ? (["club"] as const) : []),
  ];
}

/**
 * Where requests stand and where new ones start. Each team works its own desk
 * (Design, Logistics and Media never share a list), a department sees its own
 * requests, and a super admin also gets the whole club. The view lives in the
 * URL (`?view=design`), and booking mode too (`?book=1`) so the shell's Book
 * dates door can open it from anywhere.
 */
function PipelineHome({ me }: { me: PipelineMe }) {
  const t = useTranslations("pipeline");
  const tv = useTranslations("pipeline.views");
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = usePipelineRole(me);
  const [bans, setBans] = React.useState(false);
  const booking = searchParams.get("book") === "1";
  const mode = booking ? "book" : bans ? "bans" : "view";
  const canRequest = role.isSuperAdmin || role.ownDepartmentIds.size > 0;
  const canBan = role.isSuperAdmin || role.ownsTeam("logistics");
  const calendarRef = React.useRef<HTMLElement>(null);

  const views = viewsFor(role, role.ownDepartmentIds.size > 0);
  const counts = useViewCounts(role, views);
  const asked = searchParams.get("view") as View | null;
  // Open on what waits on the caller: their team's desk, then their department; a super admin with nothing of their own, the club.
  const fallback =
    role.ownTeams.find((team) => counts[team]) ??
    (counts.department ? "department" : role.isSuperAdmin && !role.ownTeams.length && !counts.department ? "club" : views[0]);
  const view: View = asked && views.includes(asked) ? asked : (fallback ?? "department");

  React.useEffect(() => {
    if (mode !== "view") calendarRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [mode]);

  const setView = (next: View) => router.replace(`/pipeline?view=${next}`, { scroll: false });
  const openBooking = () => {
    setBans(false);
    router.push(`/pipeline?view=${view}&book=1`, { scroll: false });
  };
  const closeBooking = () => router.replace(`/pipeline?view=${view}`, { scroll: false });

  return (
    <>
      <PageHeader title={t("title")} description={t("subtitle")} icon={Route}>
        {mode === "view" ? (
          <>
            <Button asChild variant="outline">
              <Link href="/pipeline/guide">
                <CircleHelp />
                {t("guide.open")}
              </Link>
            </Button>
            {canBan ? (
              <Button variant="outline" onClick={() => setBans(true)}>
                <Ban />
                {t("bans.edit")}
              </Button>
            ) : null}
            {canRequest ? (
              <Button variant="ochre" onClick={openBooking}>
                <CalendarPlus />
                {t("book.start")}
              </Button>
            ) : null}
          </>
        ) : null}
      </PageHeader>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,400px)]">
        <div className={cn("flex min-w-0 flex-col gap-5", mode !== "view" && "max-lg:hidden")}>
          {views.length > 1 ? (
            <Tabs value={view} onValueChange={(v) => setView(v as View)} className="gap-5">
              <TabsList aria-label={tv("label")} className="w-full sm:w-fit">
                {views.map((v) => {
                  const Icon = v === "department" ? Building2 : v === "club" ? Crown : TEAM_ICON[v];
                  const own = v === "department" || (v !== "club" && role.ownsTeam(v));
                  return (
                    <TabsTrigger key={v} value={v} className="gap-1.5 px-3.5 max-sm:flex-none">
                      <Icon aria-hidden="true" />
                      {v === "department" ? tv("tabs.department") : v === "club" ? tv("tabs.club") : t(`teams.${v}`)}
                      {v !== "club" ? <ViewCount count={counts[v] ?? 0} own={own} /> : null}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              {views.map((v) => (
                <TabsContent key={v} value={v}>
                  <ViewBody view={v} role={role} onBook={openBooking} onOpenView={setView} />
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <ViewBody view={view} role={role} onBook={openBooking} onOpenView={setView} />
          )}
        </div>

        <section
          ref={calendarRef}
          aria-labelledby="pipeline-calendar"
          className={cn(
            "bg-card flex scroll-mt-24 flex-col gap-4 rounded-xl p-4 ring-1 sm:p-5 lg:sticky lg:top-24",
            mode === "view" ? "ring-rule" : "ring-door-ochre ring-2 lg:col-span-2 lg:static",
          )}
        >
          {mode === "book" ? (
            <BookPanel me={me} ownIds={role.ownDepartmentIds} onDone={closeBooking} />
          ) : mode === "bans" ? (
            <BanEditor onDone={() => setBans(false)} />
          ) : (
            <>
              <SectionHead id="pipeline-calendar" title={t("calendar.title")} />
              <p className="text-ink-2 -mt-2 text-[13px]">{t("calendar.subtitle")}</p>
              <BookingCalendar
                onDayClick={(day) => {
                  const first = day.requests?.[0];
                  if (first) router.push(`/pipeline/requests/${first.id}`);
                }}
                isSelectable={(day) => Boolean(day.requests?.length)}
              />
            </>
          )}
        </section>
      </div>
    </>
  );
}

function ViewBody({
  view,
  role,
  onBook,
  onOpenView,
}: {
  view: View;
  role: PipelineRole;
  onBook: () => void;
  onOpenView: (view: View) => void;
}) {
  if (view === "department") return <DepartmentView role={role} onBook={onBook} />;
  if (view === "club") return <ClubView role={role} onOpenView={onOpenView} />;
  return <DeskView team={view} role={role} />;
}

/**
 * What waits in each view, for the tab counts: a team's open tasks (one
 * inbox call), and the caller's own department's requests that need them.
 */
function useViewCounts(role: PipelineRole, views: View[]): Partial<Record<View, number>> {
  const inbox = useInbox(role.deskTeams.length > 0);
  const departmentIds = [...role.ownDepartmentIds].sort((a, b) => a - b);
  const department = useRequestSlice(
    { departmentIds, state: "active", pageSize: 100 },
    { enabled: views.includes("department") && departmentIds.length > 0 },
  );
  return React.useMemo(() => {
    const out: Partial<Record<View, number>> = {};
    for (const item of inbox.data ?? []) {
      if (item.status === "open") out[item.team] = (out[item.team] ?? 0) + 1;
    }
    out.department = waitingOnYou(department.data?.items ?? []).length;
    return out;
  }, [inbox.data, department.data]);
}
