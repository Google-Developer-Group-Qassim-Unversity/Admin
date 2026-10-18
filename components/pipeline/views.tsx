"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Building2, ChevronRight, Crown, History, type LucideIcon } from "lucide-react";

import { waitingOnYou } from "@/components/dashboard/your-turn";
import { Count, INK, Mortar, Plate, SectionHead } from "@/components/najdi";
import { RequestList, RequestRowsSkeleton } from "@/components/pipeline/request-list";
import { BehalfNote, SuperAdminSeal, TEAMS, isMyTurn, whoseTurn, type PipelineRole } from "@/components/pipeline/roles";
import { TEAM_ICON } from "@/components/pipeline/shared";
import { Button } from "@/components/ui/button";
import { useRequestSlice } from "@/hooks/use-pipeline";
import { isolate, useTimeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EventRequestSummary, PipelineTeam, TaskState } from "@/lib/pipeline-types";

/** Every list of the page loads up to this many at once; past lists grow by a page at a time. */
const ALL = 100;
const PAST_PAGE = 10;

function stateOf(request: EventRequestSummary, team: PipelineTeam): TaskState | undefined {
  return request.task_states?.find((s) => s.team === team);
}

/** Oldest first by when the team got it: the one that has waited longest leads. */
function byArrival(team: PipelineTeam) {
  return (a: EventRequestSummary, b: EventRequestSummary) =>
    (stateOf(a, team)?.opened_at ?? "").localeCompare(stateOf(b, team)?.opened_at ?? "");
}

/** A view's heading block: what this list is and whose it is. */
function ViewHead({
  icon,
  tone = "neutral",
  title,
  description,
  aside,
  children,
}: {
  icon: LucideIcon;
  tone?: "neutral" | "ochre" | "indigo";
  title: React.ReactNode;
  description: React.ReactNode;
  aside?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <Plate tone={tone} icon={icon} size="lg" />
        <div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h2 className="text-[19px] leading-tight font-bold">{title}</h2>
            {aside}
          </div>
          <p className="text-ink-2 max-w-[62ch] text-[14px] text-pretty">{description}</p>
        </div>
      </div>
      {children}
    </header>
  );
}

/** The past, newest first, a page at a time. */
function PastSection({
  id,
  title,
  params,
  role,
  showDepartment,
  empty,
  extra,
}: {
  id: string;
  title: string;
  params: Parameters<typeof useRequestSlice>[0];
  role: PipelineRole;
  showDepartment: boolean;
  empty: string;
  extra?: (request: EventRequestSummary) => React.ReactNode;
}) {
  const t = useTranslations("pipeline.views");
  const [size, setSize] = React.useState(PAST_PAGE);
  const past = useRequestSlice({ ...params, page: 1, pageSize: size });
  const total = past.data?.total ?? 0;

  return (
    <section aria-labelledby={id} className="flex flex-col gap-1">
      <SectionHead
        id={id}
        title={
          <>
            <History className="text-ink-2 size-4" aria-hidden="true" />
            {title}
          </>
        }
        count={total || undefined}
      />
      <RequestList
        items={past.data?.items}
        isPending={past.isPending}
        empty={empty}
        role={role}
        showDepartment={showDepartment}
        extra={extra}
      />
      {total > (past.data?.items.length ?? 0) ? (
        <Button
          variant="outline"
          className="mt-2 self-start"
          onClick={() => setSize((n) => Math.min(n + PAST_PAGE, ALL))}
          disabled={past.isFetching}
        >
          {t("showMore", { count: Math.min(PAST_PAGE, total - (past.data?.items.length ?? 0)) })}
        </Button>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------ department */

/**
 * The caller's own department(s): what is waiting on them (fix, finish,
 * re-date, publish), what is with the teams, and what is over.
 */
export function DepartmentView({ role, onBook }: { role: PipelineRole; onBook: () => void }) {
  const t = useTranslations("pipeline.views");
  const tw = useTranslations("pipeline.views.why");
  const departmentIds = [...role.ownDepartmentIds].sort((a, b) => a - b);
  const several = departmentIds.length > 1;
  const active = useRequestSlice({ departmentIds, state: "active", pageSize: ALL }, { enabled: departmentIds.length > 0 });

  if (!departmentIds.length) {
    return (
      <div className="flex flex-col gap-4">
        <ViewHead icon={Building2} title={t("department.title")} description={t("department.noneSuperAdmin")} />
      </div>
    );
  }

  const items = active.data?.items ?? [];
  const waiting = waitingOnYou(items);
  const waitingIds = new Set(waiting.map((w) => w.request.id));
  const why = new Map(waiting.map((w) => [w.request.id, w.why]));
  const withTeams = items.filter((r) => !waitingIds.has(r.id));

  return (
    <div className="flex flex-col gap-7">
      <ViewHead
        icon={Building2}
        tone={waiting.length ? "ochre" : "neutral"}
        title={t("department.title")}
        description={t("department.description")}
      />

      <section aria-labelledby="dept-waiting" className="flex flex-col gap-1">
        <SectionHead id="dept-waiting" title={t("department.waiting")} count={waiting.length || undefined} countTone="ochre" />
        <RequestList
          items={waiting.map((w) => w.request)}
          isPending={active.isPending}
          empty={
            <span className="flex flex-wrap items-center gap-x-3 gap-y-2">
              {t("department.waitingNone")}
              <Button variant="outline" size="sm" onClick={onBook}>
                {t("department.book")}
              </Button>
            </span>
          }
          role={role}
          showDepartment={several}
          extra={(r) => {
            const reason = why.get(r.id);
            return reason && reason !== "hold" ? <span className={cn("font-bold", reason === "ready" ? INK.ochre : INK.madder)}>{tw(reason)}</span> : null;
          }}
        />
      </section>

      <section aria-labelledby="dept-teams" className="flex flex-col gap-1">
        <SectionHead id="dept-teams" title={t("department.withTeams")} count={withTeams.length || undefined} />
        <RequestList
          items={withTeams}
          isPending={active.isPending}
          empty={t("department.withTeamsNone")}
          role={role}
          showDepartment={several}
        />
      </section>

      <PastSection
        id="dept-past"
        title={t("past")}
        params={{ departmentIds, state: "past" }}
        role={role}
        showDepartment={several}
        empty={t("department.pastNone")}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ team desk */

/**
 * One team's desk: what is waiting on the team, what Design sent back, and
 * what the team has finished. A super admin who is not on the team sees it as
 * the team's desk, not their own: the counts stay quiet and a note says who
 * the work belongs to.
 */
export function DeskView({ team, role }: { team: PipelineTeam; role: PipelineRole }) {
  const t = useTranslations("pipeline.views");
  const tt = useTranslations("pipeline.teams");
  const timeAgo = useTimeAgo();
  const own = role.ownsTeam(team);
  const open = useRequestSlice({ team, teamStatuses: ["open", "returned"], pageSize: ALL });
  const items = open.data?.items ?? [];
  const waiting = items.filter((r) => stateOf(r, team)?.status === "open").sort(byArrival(team));
  const returned = items.filter((r) => stateOf(r, team)?.status === "returned").sort(byArrival(team));
  const name = tt(team);

  return (
    <div className="flex flex-col gap-7">
      <ViewHead
        icon={TEAM_ICON[team]}
        tone={own && waiting.length ? "ochre" : "indigo"}
        title={t("desk.title", { team: name })}
        description={t(`desk.about.${team}`)}
        aside={own ? <span className="bg-sunk text-ink-2 rounded-sm px-2 py-1 text-[12px] font-bold">{t("desk.yours")}</span> : null}
      >
        {!own ? <BehalfNote>{t("desk.overseen", { team: isolate(name) })}</BehalfNote> : null}
      </ViewHead>

      <section aria-labelledby={`${team}-waiting`} className="flex flex-col gap-1">
        <SectionHead
          id={`${team}-waiting`}
          title={own ? t("desk.waitingYours") : t("desk.waiting", { team: name })}
          count={waiting.length || undefined}
          countTone={own ? "ochre" : undefined}
        />
        <RequestList
          items={waiting}
          isPending={open.isPending}
          empty={own ? t("desk.waitingNoneYours") : t("desk.waitingNone", { team: name })}
          role={role}
          extra={(r) => {
            const at = stateOf(r, team)?.opened_at;
            return at ? t("arrived", { ago: timeAgo(at) }) : null;
          }}
        />
      </section>

      {team === "design" && (returned.length || open.isPending) ? (
        <section aria-labelledby="design-returned" className="flex flex-col gap-1">
          <SectionHead id="design-returned" title={t("desk.returned")} count={returned.length || undefined} />
          <p className="text-ink-2 text-[13px]">{t("desk.returnedHint")}</p>
          <RequestList items={returned} isPending={open.isPending} empty="" role={role} />
        </section>
      ) : null}

      <PastSection
        id={`${team}-done`}
        title={own ? t("desk.doneYours") : t("desk.done", { team: name })}
        params={{ team, teamStatuses: ["done"] }}
        role={role}
        showDepartment
        empty={t("desk.doneNone")}
        extra={(r) => {
          const at = stateOf(r, team)?.done_at;
          return at ? <span className={INK.green}>{t("doneAgo", { ago: timeAgo(at) })}</span> : null;
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ the whole club */

/**
 * A super admin's view of everything: each team's queue on its own, then what
 * waits on departments, then the past. Nothing here is painted as theirs; the
 * point is to see who has what, and open a desk to step in.
 */
export function ClubView({ role, onOpenView }: { role: PipelineRole; onOpenView: (view: PipelineTeam | "department") => void }) {
  const t = useTranslations("pipeline.views");
  const tt = useTranslations("pipeline.teams");
  const timeAgo = useTimeAgo();
  const active = useRequestSlice({ state: "active", pageSize: ALL });
  const items = React.useMemo(() => active.data?.items ?? [], [active.data]);

  const byTeam = React.useMemo(() => {
    const out = Object.fromEntries(TEAMS.map((team) => [team, [] as EventRequestSummary[]])) as Record<PipelineTeam, EventRequestSummary[]>;
    for (const r of items) {
      const turn = whoseTurn(r);
      if (turn?.kind === "teams") for (const team of turn.teams) out[team].push(r);
    }
    for (const team of TEAMS) out[team].sort(byArrival(team));
    return out;
  }, [items]);
  const onDepartments = React.useMemo(() => waitingOnYou(items.filter((r) => whoseTurn(r)?.kind === "department")), [items]);
  const yours = items.filter((r) => isMyTurn(role, r)).length;

  return (
    <div className="flex flex-col gap-7">
      <ViewHead
        icon={Crown}
        title={t("club.title")}
        description={t("club.description")}
        aside={<SuperAdminSeal />}
      >
        {active.isPending ? (
          <RequestRowsSkeleton rows={1} />
        ) : (
          <Mortar className="grid-cols-2 sm:grid-cols-4">
            {[...TEAMS.map((team) => ({ key: team, label: tt(team), icon: TEAM_ICON[team], count: byTeam[team].length })), {
              key: "departments" as const,
              label: t("club.departments"),
              icon: Building2,
              count: onDepartments.length,
            }].map((cell) => (
              <a
                key={cell.key}
                href={`#club-${cell.key}`}
                className="bg-card hover:bg-background focus-visible:outline-ring flex min-h-16 items-center gap-2.5 rounded-[2px] px-3 py-2.5 outline-none transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2"
              >
                <cell.icon className="text-ink-2 size-[18px] shrink-0" aria-hidden="true" />
                <span className="flex min-w-0 flex-col">
                  <b className={cn("tabular text-[21px] leading-none font-bold", !cell.count && "text-ink-3")}>{cell.count}</b>
                  <span className="text-ink-2 truncate text-[12.5px] font-medium">{t("club.waitingOn", { name: cell.label })}</span>
                </span>
              </a>
            ))}
          </Mortar>
        )}
        {yours ? (
          <p className="text-door-ochre-ink text-[13px] font-bold">{t("club.yoursToo", { count: yours })}</p>
        ) : null}
      </ViewHead>

      {TEAMS.map((team) => {
        const list = byTeam[team];
        const Icon = TEAM_ICON[team];
        return (
          <section key={team} id={`club-${team}`} aria-labelledby={`club-${team}-head`} className="flex scroll-mt-24 flex-col gap-1">
            <SectionHead
              id={`club-${team}-head`}
              title={
                <>
                  <Icon className="text-ink-2 size-4" aria-hidden="true" />
                  {t("club.teamQueue", { team: tt(team) })}
                </>
              }
              count={list.length || undefined}
              action={
                <button
                  type="button"
                  onClick={() => onOpenView(team)}
                  className="text-door-indigo-ink inline-flex min-h-8 items-center gap-0.5 underline-offset-3 hover:underline"
                >
                  {t("club.openDesk", { team: tt(team) })}
                  <ChevronRight className="size-4 rtl:-scale-x-100" aria-hidden="true" />
                </button>
              }
            />
            <RequestList
              items={list}
              isPending={active.isPending}
              empty={t("club.teamClear", { team: tt(team) })}
              role={role}
              extra={(r) => {
                const at = stateOf(r, team)?.opened_at;
                return at ? t("arrived", { ago: timeAgo(at) }) : null;
              }}
            />
          </section>
        );
      })}

      <section id="club-departments" aria-labelledby="club-departments-head" className="flex scroll-mt-24 flex-col gap-1">
        <SectionHead
          id="club-departments-head"
          title={
            <>
              <Building2 className="text-ink-2 size-4" aria-hidden="true" />
              {t("club.departmentQueue")}
            </>
          }
          count={onDepartments.length || undefined}
        />
        <RequestList
          items={onDepartments.map((w) => w.request)}
          isPending={active.isPending}
          empty={t("club.departmentsClear")}
          role={role}
        />
      </section>

      <PastSection
        id="club-past"
        title={t("past")}
        params={{ state: "past" }}
        role={role}
        showDepartment
        empty={t("club.pastNone")}
      />
    </div>
  );
}

/** How many things wait on the caller in a view, for its tab. Own work only; overseen queues are not chores. */
export function ViewCount({ count, own }: { count: number; own: boolean }) {
  if (!count) return null;
  return (
    <Count tone={own ? "ochre" : undefined} className={cn("h-[18px] min-w-[18px] text-[11px]", !own && "bg-sunk text-ink-2 shadow-[inset_0_0_0_1px_var(--rule)]")}>
      {count}
    </Count>
  );
}

