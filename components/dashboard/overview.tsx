"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Award, ChevronRight, ClockAlert, CornerUpLeft, FilePen, Users, type LucideIcon } from "lucide-react";

import { INK, Mark, Mortar, Plate, SectionHead, SOFT, type DoorTone } from "@/components/najdi";
import { TEAM_ICON, useDepartmentName, useFormatDateRange } from "@/components/pipeline/shared";
import { EVENT_TONE, STAGE_STEP, STAGE_TONE, URGENCY_TONE } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { AttentionItem, AttentionKind } from "@/hooks/use-attention";
import { nextStepFor } from "@/lib/event-next-step";
import { cn, getEffectiveEndDate, parseLocalDateTime } from "@/lib/utils";
import type { Event } from "@/lib/api-types";
import type { EventRequestSummary, InboxItem } from "@/lib/pipeline-types";
import { intlLocale, useTimeAgo } from "@/lib/format";

const STEPS = ["draft", "in_review", "media", "ready", "published"] as const;
const LINK = "text-door-indigo-ink inline-flex min-h-8 items-center hover:underline underline-offset-3";

/** Requests per step of the path. A returned request counts on the review step. */
export function stageCounts(requests: EventRequestSummary[]) {
  const counts = [0, 0, 0, 0, 0];
  let returned = 0;
  for (const r of requests) {
    const step = STAGE_STEP[r.stage];
    if (step < 0) continue;
    counts[step] += 1;
    if (r.stage === "returned") returned += 1;
  }
  return { counts, returned };
}

/**
 * The pipeline at a glance on a phone: five doorways in mortar, a count in
 * each, coloured by whose turn the step is.
 */
export function StageStrip({ requests, title, isPending }: { requests: EventRequestSummary[]; title: string; isPending: boolean }) {
  const t = useTranslations("pipeline");
  const td = useTranslations("dashboard.stages");
  const { counts, returned } = stageCounts(requests);
  const tone: DoorTone[] = ["ochre", "indigo", "indigo", "ochre", "green"];

  return (
    <section aria-labelledby="stage-strip" className="flex flex-col gap-2">
      <SectionHead id="stage-strip" title={title} action={<Link href="/pipeline" className={LINK}>{td("open")}</Link>} />
      {isPending ? (
        <Skeleton className="h-[76px] w-full" />
      ) : (
        <Mortar className="grid-cols-5">
          {STEPS.map((step, i) => (
            <div key={step} className="bg-card flex min-h-[76px] flex-col items-center justify-center gap-0.5 rounded-[2px] px-1 py-2 text-center">
              <b className={cn("tabular text-[21px] leading-none font-bold", counts[i] ? INK[tone[i]] : "text-ink-3")}>{counts[i]}</b>
              <span className="text-ink-2 text-[11.5px] leading-tight font-medium">{t(`stepNames.${step}`)}</span>
            </div>
          ))}
        </Mortar>
      )}
      {returned ? (
        <p className="text-door-madder-ink flex items-center gap-2 text-[13px] font-bold">
          <CornerUpLeft className="size-4 shrink-0" />
          {td("returned", { count: returned })}
        </p>
      ) : null}
    </section>
  );
}

/**
 * The pipeline on a wide screen: one column per step, laid in mortar, each
 * request a card that names whose turn it is.
 */
export function StageBoard({ requests, title, isPending }: { requests: EventRequestSummary[]; title: string; isPending: boolean }) {
  const t = useTranslations("pipeline");
  const td = useTranslations("dashboard.stages");
  const departmentName = useDepartmentName();
  const formatRange = useFormatDateRange();
  const { counts } = stageCounts(requests);
  const MAX = 4;

  return (
    <section aria-labelledby="stage-board" className="bg-card ring-rule flex flex-col gap-3 rounded-xl p-5 ring-1">
      <SectionHead
        id="stage-board"
        title={title}
        count={requests.length || undefined}
        action={<Link href="/pipeline" className={LINK}>{td("open")}</Link>}
      />
      {isPending ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <Mortar className="grid-cols-5">
          {STEPS.map((step, i) => {
            const items = requests.filter((r) => STAGE_STEP[r.stage] === i);
            return (
              <div key={step} className="bg-background flex min-h-40 flex-col gap-2 rounded-[2px] p-2.5">
                <header className="border-rule flex items-center gap-2 border-b pb-1.5 text-[13px]">
                  <svg viewBox="-1 -1 14 12" width="14" height="12" aria-hidden="true">
                    <polygon
                      points="0,10.5 12,10.5 6,0.5"
                      strokeWidth="1.4"
                      strokeLinejoin="round"
                      className={i === 4 ? "fill-door-green stroke-door-green" : "stroke-adobe fill-none"}
                    />
                  </svg>
                  <h3 className="flex-1 font-bold">{t(`stepNames.${step}`)}</h3>
                  <span className="text-ink-2 tabular font-bold">{counts[i]}</span>
                </header>
                {items.slice(0, MAX).map((r) => {
                  const tone = STAGE_TONE[r.stage];
                  return (
                    <Link
                      key={r.id}
                      href={`/pipeline/requests/${r.id}`}
                      className={cn(
                        "flex flex-col gap-1 rounded-lg px-3 py-2.5 transition-shadow outline-none focus-visible:outline-2 focus-visible:outline-ring",
                        r.stage === "returned"
                          ? "bg-door-madder-soft shadow-[inset_0_0_0_1px_var(--door-madder-ink)]"
                          : r.stage === "draft" || r.stage === "ready"
                            ? "bg-card shadow-[inset_0_0_0_1.5px_var(--door-ochre)] hover:shadow-[inset_0_0_0_1.5px_var(--door-ochre),var(--shadow-lift)]"
                            : "bg-card shadow-[inset_0_0_0_1px_var(--rule)] hover:shadow-[inset_0_0_0_1px_var(--adobe),var(--shadow-lift)]",
                      )}
                    >
                      <span className={cn("flex items-center gap-1.5 text-xs font-bold", INK[tone])}>
                        <Mark tone={tone} className="size-2" />
                        {t(`stage.${r.stage}`)}
                      </span>
                      <b className="text-[14px] leading-snug font-bold"><bdi>{r.title || t("requests.untitled")}</bdi></b>
                      <span className="text-ink-2 text-xs">
                        {departmentName(r.department)} ·{" "}
                        <span className="tabular">{r.start_date ? formatRange(r.start_date, r.end_date) : t("requests.noDates")}</span>
                      </span>
                    </Link>
                  );
                })}
                {items.length > MAX ? (
                  <Link href="/pipeline" className="text-ink-2 hover:text-foreground px-1 text-xs font-bold">
                    {td("moreInStep", { count: items.length - MAX })}
                  </Link>
                ) : null}
              </div>
            );
          })}
        </Mortar>
      )}
    </section>
  );
}

/** What is waiting on the caller's teams: a plate per team, newest task last. */
export function TeamInbox({ items, isPending, panel = false }: { items: InboxItem[] | undefined; isPending: boolean; panel?: boolean }) {
  const t = useTranslations("pipeline");
  const td = useTranslations("dashboard");
  const timeAgo = useTimeAgo();

  return (
    <section
      aria-labelledby="team-inbox"
      className={cn("flex flex-col gap-1", panel && "bg-card ring-rule rounded-xl px-5 pt-4 pb-2 ring-1")}
    >
      <SectionHead
        id="team-inbox"
        title={t("inbox.title")}
        count={items?.length || undefined}
        countTone="ochre"
        action={<Link href="/pipeline" className={LINK}>{td("openInbox")}</Link>}
      />
      {isPending ? (
        <Skeleton className="my-2 h-14 w-full" />
      ) : !items?.length ? (
        <p className="text-ink-2 py-4 text-sm">{t("inbox.none")}</p>
      ) : (
        <ul className="flex flex-col">
          {items.map((item) => (
            <li key={`${item.request.id}-${item.team}`}>
              <Link
                href={`/pipeline/requests/${item.request.id}`}
                className="border-rule group hover:bg-card active:bg-sunk flex min-h-14 items-center gap-3 border-b px-1 py-2 outline-none last:border-b-0 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
              >
                <Plate tone="ochre" icon={TEAM_ICON[item.team]} />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <b className="truncate text-[15px] font-bold"><bdi>{item.request.title || t("requests.untitled")}</bdi></b>
                  <span className="text-ink-2 truncate text-[13px]">
                    {t(`teams.${item.team}`)} · {timeAgo(item.opened_at)}
                  </span>
                </span>
                <ChevronRight className="text-ink-3 group-hover:text-foreground size-[18px] shrink-0 rtl:-scale-x-100" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}


/** Events running now and open for registration, each with the one thing it waits for. */
export function EventsNow({ events, isPending, panel = false }: { events: Event[] | undefined; isPending: boolean; panel?: boolean }) {
  const t = useTranslations("dashboard");
  const te = useTranslations("events");
  const locale = useLocale();
  const when = React.useMemo(
    () => new Intl.DateTimeFormat(intlLocale(locale), { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }),
    [locale],
  );
  const now = React.useMemo(() => new Date(), []);
  const list = (events ?? [])
    .filter((e) => e.status === "active" || e.status === "open")
    .sort((a, b) => (a.status === b.status ? a.start_datetime.localeCompare(b.start_datetime) : a.status === "active" ? -1 : 1))
    .slice(0, 5);

  return (
    <section aria-labelledby="events-now" className={cn("flex flex-col gap-1", panel && "bg-card ring-rule rounded-xl px-5 pt-4 pb-2 ring-1")}>
      <SectionHead id="events-now" title={t("events")} action={<Link href="/events" className={LINK}>{t("allEvents")}</Link>} />
      {isPending ? (
        <Skeleton className="my-2 h-14 w-full" />
      ) : !list.length ? (
        <p className="text-ink-2 py-4 text-sm">{t("noEvents")}</p>
      ) : (
        <ul className="flex flex-col">
          {list.map((e) => {
            const tone = EVENT_TONE[e.status];
            const step = nextStepFor(e, now);
            const live = e.status === "active" && getEffectiveEndDate(parseLocalDateTime(e.start_datetime), parseLocalDateTime(e.end_datetime)) >= now;
            return (
              <li key={e.id} className="border-rule flex min-h-14 items-center gap-3 border-b px-1 py-2 last:border-b-0">
                <Mark tone={tone} />
                <Link href={`/events/${e.id}`} className="flex min-w-0 flex-1 flex-col gap-0.5 outline-none hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                  <b className="truncate text-[15px] font-bold">{e.name}</b>
                  <span className="text-ink-2 truncate text-[13px]">
                    <span className={cn("font-bold", INK[tone])}>{live ? t("tiles.live") : te(`status.${e.status}`)}</span>
                    {" · "}
                    <span className="tabular">{when.format(parseLocalDateTime(e.start_datetime))}</span>
                  </span>
                </Link>
                {step.key !== "done" ? (
                  <Link href={step.href} className="text-ink-2 hover:text-foreground shrink-0 text-[12.5px] font-bold">
                    {te(`nextStep.${step.key}`)}
                  </Link>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

const ATTENTION_ICON: Record<AttentionKind, LucideIcon> = {
  overdue: ClockAlert,
  draft: FilePen,
  closingSoon: Users,
  certificates: Award,
};

/** Everything waiting on an admin, ranked by how much it hurts to leave it. */
export function AttentionList({ items, isPending, panel = false }: { items: AttentionItem[]; isPending: boolean; panel?: boolean }) {
  const t = useTranslations("dashboard");
  const tq = useTranslations("dashboard.queue");

  return (
    <section aria-labelledby="attention" className={cn("flex flex-col gap-1", panel && "bg-card ring-rule rounded-xl px-5 pt-4 pb-2 ring-1")}>
      <SectionHead id="attention" title={t("attention")} count={items.length || undefined} />
      {isPending ? (
        <Skeleton className="my-2 h-14 w-full" />
      ) : !items.length ? (
        <div className="flex items-center gap-3 py-3">
          <span className={cn("grid size-8 shrink-0 place-items-center rounded-sm", SOFT.green)}>
            <Award className="size-4" />
          </span>
          <div className="flex flex-col">
            <b className="text-sm font-bold">{t("allClearTitle")}</b>
            <span className="text-ink-2 text-[13px]">{t("allClearBody")}</span>
          </div>
        </div>
      ) : (
        <ul className="flex flex-col">
          {items.map((item) => (
            <li key={item.id} className="border-rule flex min-h-14 items-center gap-3 border-b px-1 py-2 last:border-b-0">
              <Plate tone={URGENCY_TONE[item.urgency]} icon={ATTENTION_ICON[item.kind]} size="sm" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <b className="truncate text-[14.5px] font-bold">{tq(`${item.kind}.title`, { count: item.count ?? 0, days: item.days })}</b>
                <span className="text-ink-2 truncate text-[13px]">
                  <bdi>{item.event.name}</bdi> · {tq(`${item.kind}.detail`, { days: item.days })}
                </span>
              </div>
              <Button asChild variant="outline" size="sm" className="shrink-0">
                <Link href={item.href}>{tq(`${item.kind}.action`)}</Link>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export type Stat = { label: string; value: React.ReactNode; note?: string };

/** The real numbers, as a labelled row on desktop and a quiet line on a phone. */
export function Stats({ stats }: { stats: Stat[] }) {
  return (
    <>
      <p className="text-ink-2 text-center text-[12.5px] md:hidden">
        {stats.map((s, i) => (
          <React.Fragment key={s.label}>
            {i ? " · " : ""}
            <b className="tabular text-foreground font-bold">{s.value}</b> {s.label}
          </React.Fragment>
        ))}
      </p>
      <dl className="bg-card ring-rule hidden rounded-xl ring-1 md:grid md:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
        {stats.map((s) => (
          <div key={s.label} className="border-rule border-e px-5 py-3.5 last:border-e-0">
            <dt className="text-ink-2 text-[13px] font-medium">{s.label}</dt>
            <dd className="flex items-baseline gap-2.5 text-[21px] font-bold">
              <span className="tabular">{s.value}</span>
              {s.note ? <small className="text-ink-2 text-[12.5px] font-medium">{s.note}</small> : null}
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}
