"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronDown,
  CircleCheck,
  Megaphone,
  Palette,
  Rocket,
  Truck,
  X,
  type LucideIcon,
} from "lucide-react";

import { Count, INK, Plate, type DoorTone, type Tone } from "@/components/najdi";
import { RequestRow } from "@/components/pipeline/request-list";
import { usePartyName, type Party, type PipelineRole } from "@/components/pipeline/roles";
import { useDepartmentName } from "@/components/pipeline/shared";
import { tabOf } from "@/components/pipeline/submit-bar";
import { Button } from "@/components/ui/button";
import { useRequestSlice } from "@/hooks/use-pipeline";
import { isolate, useTimeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EventRequestDetail, PipelineTeam } from "@/lib/pipeline-types";

/**
 * A request is a walk through five stations: the Event the department
 * describes, Design and Logistics (side by side, each with the brief it was
 * given and what it hands back), Media, and Publish. The request page shows
 * one station at a time, so every party has a place of its own instead of
 * everyone's work stacked on one long page, and when a station hands over the
 * page moves on with it: forward, never back up the page to find what is next.
 *
 * Where a reader lands depends on who they are (`landingStation`): a team on
 * its own station, the department on whatever it still has to do, a super
 * admin on whatever the request is waiting on.
 */

export type StationKey = "event" | "design" | "logistics" | "media" | "publish";
export const STATIONS: StationKey[] = ["event", "design", "logistics", "media", "publish"];

export const STATION_ICON: Record<StationKey, LucideIcon> = {
  event: CalendarDays,
  design: Palette,
  logistics: Truck,
  media: Megaphone,
  publish: Rocket,
};

/** The stations whose forms the department fills in before it sends the request. */
export const FORM_STATIONS = ["event", "design", "logistics"] as const;
export type FormStation = (typeof FORM_STATIONS)[number];

export function isStation(value: string | null | undefined): value is StationKey {
  return !!value && (STATIONS as string[]).includes(value);
}

/** The station a missing field is filled in on. Dates have none: they live on the event. */
export function stationOfField(field: string): FormStation {
  const tab = tabOf(field);
  return tab === "details" || !tab ? "event" : tab;
}

const TEAM_STATIONS: PipelineTeam[] = ["design", "logistics", "media"];
const isTeam = (key: StationKey): key is PipelineTeam => (TEAM_STATIONS as string[]).includes(key);

/* ------------------------------------------------------------------ the model */

export type StationState = "done" | "active" | "returned" | "later";

export interface Station {
  key: StationKey;
  state: StationState;
  /** The colour of its mark: green done, ochre the reader's turn, indigo with a team, umber a draft, madder sent back. */
  tone: DoorTone;
  /** Waiting on the reader as themselves (never on someone a super admin only oversees). */
  mine: boolean;
  /** A word or two under its name. */
  status: string;
  /** Fields the department still has to fill in here before it can send. */
  missing: number;
}

const task = (request: EventRequestDetail, team: PipelineTeam) => request.tasks.find((t) => t.team === team);

/** Who a station belongs to right now: the department while it writes or publishes, otherwise the team. */
export function stationParty(request: EventRequestDetail, key: StationKey): Party {
  if (isTeam(key)) {
    const status = task(request, key)?.status;
    if (key !== "media" && (!status || status === "brief")) return { kind: "department", department: request.department };
    return { kind: "team", team: key };
  }
  return { kind: "department", department: request.department };
}

export function useStations(
  request: EventRequestDetail,
  role: PipelineRole,
  missingBy: Record<FormStation, number>,
): Station[] {
  const t = useTranslations("pipeline.stations.status");
  const stage = request.stage;
  const ownsDepartment = role.ownsDepartment(request.department.id);

  return STATIONS.map((key): Station => {
    const missing = (FORM_STATIONS as readonly string[]).includes(key) ? missingBy[key as FormStation] : 0;
    if (stage === "cancelled") {
      return { key, state: key === "event" ? "active" : "later", tone: "umber", mine: false, status: key === "event" ? t("cancelled") : t("later"), missing: 0 };
    }

    if (key === "event") {
      if (stage === "draft") {
        return { key, state: "active", tone: ownsDepartment ? "ochre" : "umber", mine: ownsDepartment, status: missing ? t("left", { count: missing }) : t(ownsDepartment ? "yourTurn" : "filling"), missing };
      }
      if (stage === "returned") return { key, state: "returned", tone: "madder", mine: ownsDepartment, status: t("fixIt"), missing };
      return { key, state: "done", tone: "green", mine: false, status: t("sent"), missing: 0 };
    }

    if (key === "publish") {
      if (stage === "published") return { key, state: "done", tone: "green", mine: false, status: t("published"), missing: 0 };
      if (stage === "ready") return { key, state: "active", tone: ownsDepartment ? "ochre" : "indigo", mine: ownsDepartment, status: t(ownsDepartment ? "yourTurn" : "waiting"), missing: 0 };
      return { key, state: "later", tone: "umber", mine: false, status: t("later"), missing: 0 };
    }

    const status = task(request, key)?.status;
    const ownsTeam = role.ownsTeam(key);
    if (status === "done") return { key, state: "done", tone: "green", mine: false, status: t("done"), missing: 0 };
    if (status === "open") return { key, state: "active", tone: ownsTeam ? "ochre" : "indigo", mine: ownsTeam, status: t(ownsTeam ? "yourTurn" : "working"), missing: 0 };
    if (status === "returned") return { key, state: "returned", tone: "madder", mine: false, status: t("sentBack"), missing };
    if (key === "media") return { key, state: "later", tone: "umber", mine: false, status: t("later"), missing: 0 };
    // A brief the department is still writing: part of the draft.
    if (stage === "draft") {
      return { key, state: "active", tone: ownsDepartment ? "ochre" : "umber", mine: false, status: missing ? t("left", { count: missing }) : t("notSent"), missing };
    }
    return { key, state: "later", tone: "umber", mine: false, status: t("notSent"), missing };
  });
}

/**
 * Where a reader lands, by who they are:
 *  1. a team whose turn it is: its own station;
 *  2. the requesting department on its turn: the first form with something
 *     missing (a returned request: Design's brief, which the notes are about),
 *     or Publish once it is ready;
 *  3. a team that is not on turn: its own station, once the request reached it;
 *  4. anyone else (a super admin, a partner): whatever the request waits on.
 */
export function landingStation(request: EventRequestDetail, role: PipelineRole, firstMissing: FormStation | null): StationKey {
  const stage = request.stage;
  if (stage === "cancelled") return "event";
  if (stage === "published") return "publish";
  const status = (team: PipelineTeam) => task(request, team)?.status;
  const writing: StationKey = stage === "returned" ? (firstMissing ?? "design") : (firstMissing ?? "event");

  for (const team of TEAM_STATIONS) if (role.ownsTeam(team) && status(team) === "open") return team;
  if (role.ownsDepartment(request.department.id)) {
    if (stage === "draft" || stage === "returned") return writing;
    if (stage === "ready") return "publish";
  }
  for (const team of role.ownTeams) if (status(team) && status(team) !== "brief") return team;

  if (stage === "draft" || stage === "returned") return writing;
  if (stage === "in_review") return status("design") === "open" ? "design" : "logistics";
  if (stage === "media") return "media";
  return "publish";
}

/* ------------------------------------------------------------------ hand-offs */

export type HandoffKind = "sent" | "resent" | "returned" | "designDone" | "logisticsDone" | "toMedia" | "mediaDone";

interface Snapshot {
  stage: EventRequestDetail["stage"];
  tasks: Partial<Record<PipelineTeam, string>>;
}

const snapshotOf = (request: EventRequestDetail): Snapshot => ({
  stage: request.stage,
  tasks: Object.fromEntries(request.tasks.map((t) => [t.team, t.status])),
});

/** What just happened between two versions of a request, as the one line worth saying about it. */
function handoffBetween(before: Snapshot, after: Snapshot): HandoffKind | null {
  if (before.stage === after.stage && JSON.stringify(before.tasks) === JSON.stringify(after.tasks)) return null;
  if (before.stage === "draft" && after.stage === "in_review") return "sent";
  if (before.stage === "returned" && after.stage === "in_review") return "resent";
  if (after.stage === "returned" && before.stage !== "returned") return "returned";
  if (after.stage === "media" && before.stage !== "media") return "toMedia";
  if (before.stage === "media" && after.stage === "ready") return "mediaDone";
  if (before.tasks.design !== "done" && after.tasks.design === "done") return "designDone";
  if (before.tasks.logistics !== "done" && after.tasks.logistics === "done") return "logisticsDone";
  return null;
}

/**
 * Which station is showing, kept in the URL (`?step=design`) so a reload or a
 * shared link keeps the place. When the request moves on (someone sends it,
 * a team finishes) the page goes with it to wherever the reader would now
 * land, and says what just happened there.
 */
export function useStationNav(request: EventRequestDetail, role: PipelineRole, firstMissing: FormStation | null) {
  const searchParams = useSearchParams();
  const landing = landingStation(request, role, firstMissing);
  const asked = searchParams.get("step");
  const [station, setStation] = React.useState<StationKey>(() => (isStation(asked) ? asked : landing));
  const [direction, setDirection] = React.useState<"forward" | "back" | null>(null);
  const [handoff, setHandoff] = React.useState<{ kind: HandoffKind; at: StationKey } | null>(null);
  const railRef = React.useRef<HTMLDivElement>(null);
  const stationRef = React.useRef(station);
  stationRef.current = station;

  const show = React.useCallback(
    (next: StationKey, { scroll = true }: { scroll?: boolean } = {}) => {
      const from = stationRef.current;
      setDirection(STATIONS.indexOf(next) >= STATIONS.indexOf(from) ? "forward" : "back");
      setStation(next);
      // The native history API keeps Next's router in step without a navigation.
      const url = new URL(window.location.href);
      url.searchParams.set("step", next);
      window.history.replaceState(window.history.state, "", url);
      if (scroll) {
        const rail = railRef.current;
        // Only scroll when the rail is out of sight: switching stations at the top of the page must not jump.
        if (rail && rail.getBoundingClientRect().top < 64) rail.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [],
  );

  /** A station picked by the reader: whatever was just said about another station is old news. */
  const go = React.useCallback(
    (next: StationKey) => {
      setHandoff((current) => (current && current.at === next ? current : null));
      show(next);
    },
    [show],
  );

  const snapshot = snapshotOf(request);
  const key = `${snapshot.stage}|${TEAM_STATIONS.map((team) => snapshot.tasks[team] ?? "-").join(",")}`;
  const previous = React.useRef({ key, snapshot, landing });
  React.useEffect(() => {
    const before = previous.current;
    previous.current = { key, snapshot, landing };
    if (before.key === key) return;
    const kind = handoffBetween(before.snapshot, snapshot);
    const next = before.landing !== landing ? landing : stationRef.current;
    if (kind) setHandoff({ kind, at: next });
    if (next !== stationRef.current) show(next);
    // `snapshot` and `landing` are read through `key`, which changes exactly when they do.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return {
    station,
    go,
    direction,
    railRef,
    handoff: handoff && handoff.at === station ? handoff.kind : null,
    dismissHandoff: () => setHandoff(null),
  };
}

/* ------------------------------------------------------------------ the rail */

const MARK_FILL: Record<StationState, (tone: DoorTone) => string> = {
  done: () => "fill-door-green stroke-door-green",
  returned: () => "fill-door-madder stroke-door-madder",
  active: (tone) =>
    ({
      ochre: "fill-door-ochre-soft stroke-door-ochre",
      indigo: "fill-door-indigo-soft stroke-door-indigo-ink",
      umber: "fill-door-umber-soft stroke-door-umber",
      green: "fill-door-green-soft stroke-door-green",
      madder: "fill-door-madder-soft stroke-door-madder",
    })[tone],
  later: () => "fill-none stroke-adobe",
};

const STATUS_INK: Record<StationState, (tone: DoorTone, mine: boolean) => string> = {
  done: () => INK.green,
  returned: () => INK.madder,
  active: (tone, mine) => (mine ? INK.ochre : tone === "umber" ? "text-ink-2" : INK[tone]),
  later: () => "text-ink-3",
};

/**
 * The five stations as one course of bricks. Each brick is a tab: its tarma
 * says how far that station has got (filled green done, outlined in the
 * colour of whoever has it, madder sent back), its name, a word on where it
 * stands, and a count of what is still missing there. The one showing is
 * underlined in ink. Design and Logistics share a joint: they run together.
 */
export function StationRail({
  stations,
  current,
  onSelect,
  railRef,
}: {
  stations: Station[];
  current: StationKey;
  onSelect: (key: StationKey) => void;
  railRef: React.Ref<HTMLDivElement>;
}) {
  const t = useTranslations("pipeline.stations");
  const buttons = React.useRef<(HTMLButtonElement | null)[]>([]);

  // Arrow keys walk the stations in reading order (right to left in Arabic).
  const onKeyDown = (event: React.KeyboardEvent, index: number) => {
    const rtl = getComputedStyle(event.currentTarget).direction === "rtl";
    const step = { ArrowRight: rtl ? -1 : 1, ArrowLeft: rtl ? 1 : -1 }[event.key];
    let next: number | null = step ? (index + step + STATIONS.length) % STATIONS.length : null;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = STATIONS.length - 1;
    if (next === null) return;
    event.preventDefault();
    buttons.current[next]?.focus();
    onSelect(STATIONS[next]);
  };

  return (
    <div ref={railRef} className="scroll-mt-24">
      <div role="tablist" aria-label={t("label")} className="bg-mortar grid grid-cols-5 gap-1 rounded-lg p-1">
        {stations.map((s, i) => {
          const selected = s.key === current;
          return (
            <button
              key={s.key}
              ref={(el) => {
                buttons.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`station-tab-${s.key}`}
              aria-selected={selected}
              aria-controls="station-panel"
              tabIndex={selected ? 0 : -1}
              onClick={() => onSelect(s.key)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                "group relative flex min-h-[78px] min-w-0 flex-col items-center justify-center gap-1 rounded-[3px] px-1 pt-2 pb-2.5 text-center transition-colors duration-150 outline-none",
                "focus-visible:outline-ring focus-visible:outline-2 focus-visible:-outline-offset-2",
                selected ? "bg-card shadow-[inset_0_-3px_0_var(--foreground)]" : "bg-background hover:bg-card",
                // Design and Logistics run side by side: a wider joint before Design and after Logistics groups them.
                s.key === "design" && "ms-0.5",
                s.key === "media" && "ms-0.5",
              )}
            >
              <span className="relative flex h-[22px] items-end">
                <svg viewBox="-1 -1 24 21" width="24" height="21" aria-hidden="true" className="overflow-visible">
                  <polygon
                    key={`${s.state}-${s.tone}`}
                    points="0,19 22,19 11,0.5"
                    strokeLinejoin="round"
                    strokeWidth={s.state === "active" ? 2 : 1.6}
                    className={cn("animate-tarma", MARK_FILL[s.state](s.tone), s.state === "later" && "opacity-80")}
                  />
                </svg>
                {s.missing ? (
                  <Count
                    tone={s.state === "returned" ? "madder" : "ochre"}
                    className="absolute -end-3.5 -top-1.5 h-4 min-w-4 px-1 text-[10.5px]"
                  >
                    {s.missing}
                  </Count>
                ) : null}
              </span>
              <span
                className={cn(
                  "w-full truncate text-[12.5px] leading-tight sm:text-sm",
                  selected ? "text-foreground font-bold" : "text-ink-2 font-bold group-hover:text-foreground",
                )}
              >
                {t(`names.${s.key}`)}
              </span>
              <span className={cn("w-full truncate text-[11px] leading-tight font-bold sm:text-[12px]", STATUS_INK[s.state](s.tone, s.mine))}>
                {s.status}
              </span>
              {selected ? <span className="sr-only">{t("you")}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ inside a station */

/** The station panel: one at a time, sliding in from the side it was reached from. */
export function StationPanel({
  station,
  direction,
  children,
}: {
  station: StationKey;
  direction: "forward" | "back" | null;
  children: React.ReactNode;
}) {
  return (
    <div
      key={station}
      id="station-panel"
      role="tabpanel"
      aria-labelledby={`station-tab-${station}`}
      data-direction={direction ?? undefined}
      className="animate-station flex min-w-0 flex-col gap-6 outline-none"
      tabIndex={-1}
    >
      {children}
    </div>
  );
}

/**
 * The top of a station: its plate, its name, whose part it is, and one line
 * saying where it stands and what happens here.
 */
export function StationHead({
  station,
  request,
  line,
  tone,
  mine,
}: {
  station: StationKey;
  request: EventRequestDetail;
  line: React.ReactNode;
  tone: Tone;
  mine: boolean;
}) {
  const t = useTranslations("pipeline.stations");
  const partyName = usePartyName();
  const party = stationParty(request, station);
  const owner = mine
    ? t(party.kind === "team" ? "owner.yourTeam" : "owner.yours")
    : t("owner.theirs", { name: isolate(partyName(party)) });

  return (
    <header className="border-foreground flex items-start gap-3 border-b pb-3">
      <Plate tone={tone} icon={STATION_ICON[station]} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <h2 className="text-[19px] leading-tight font-bold">{t(`names.${station}`)}</h2>
          <span className={cn("text-[12.5px] font-bold", mine ? INK.ochre : "text-ink-2")}>{owner}</span>
        </div>
        <p className="text-ink-2 max-w-[68ch] text-[14px] text-pretty">{line}</p>
      </div>
    </header>
  );
}

/** "Sent to Design and Logistics": what just happened, said once, where the page moved to. */
export function Handoff({
  kind,
  request,
  ownsDepartment,
  onDismiss,
}: {
  kind: HandoffKind;
  request: EventRequestDetail;
  ownsDepartment: boolean;
  onDismiss: () => void;
}) {
  const t = useTranslations("pipeline.stations.handoff");
  const departmentName = useDepartmentName();
  const department = isolate(departmentName(request.department));
  const status = (team: PipelineTeam) => task(request, team)?.status;

  const title =
    kind === "sent" && !ownsDepartment ? t("sentFor", { department }) : t(kind);
  const body =
    kind === "sent"
      ? ownsDepartment
        ? t("sentBody")
        : t("sentForBody", { department })
      : kind === "returned"
        ? t("returnedBody", { department })
        : kind === "designDone"
          ? status("logistics") === "open"
            ? t("designDoneBody")
            : null
          : kind === "logisticsDone"
            ? status("design") === "open"
              ? t("logisticsDoneBody")
              : null
            : kind === "mediaDone"
              ? ownsDepartment
                ? t("mediaDoneBodyYours")
                : t("mediaDoneBody", { department })
              : kind === "resent"
                ? t("resentBody")
                : t("toMediaBody");
  const tone: Tone = kind === "returned" ? "madder" : "green";

  return (
    <div
      role="status"
      className={cn(
        "animate-handoff flex items-start gap-3 rounded-lg px-3.5 py-3",
        tone === "madder" ? "bg-door-madder-soft text-door-madder-ink" : "bg-door-green-soft text-door-green-ink",
      )}
    >
      <CircleCheck className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-[15px] leading-snug font-bold">{title}</p>
        {body ? <p className="text-foreground/80 text-[13.5px] text-pretty">{body}</p> : null}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label={t("dismiss")}
        className="-me-1.5 -mt-1 grid size-9 shrink-0 place-items-center rounded-sm opacity-70 transition-opacity outline-none hover:opacity-100 focus-visible:outline-2 focus-visible:outline-ring pointer-coarse:size-11"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}

/**
 * A station's job beside what it was given. On a desktop the brief sits in a
 * column of its own next to the job; on a phone it follows the job, or, where
 * the job is a long form (Logistics), folds into a line above it.
 */
export function StationColumns({
  main,
  aside,
  asideTitle,
  foldOnPhone = false,
}: {
  main: React.ReactNode;
  aside: React.ReactNode;
  asideTitle: string;
  foldOnPhone?: boolean;
}) {
  const t = useTranslations("pipeline.stations.context");
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
      {foldOnPhone ? (
        <details className="group bg-card ring-rule rounded-xl ring-1 lg:hidden">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-4 text-[14px] font-bold [&::-webkit-details-marker]:hidden">
            {t("show")}
            <ChevronDown className="text-ink-2 size-[18px] transition-transform duration-200 group-open:rotate-180" aria-hidden="true" />
          </summary>
          <div className="border-rule flex flex-col gap-1 border-t px-4 pt-2 pb-4">{aside}</div>
        </details>
      ) : null}
      <div className="flex min-w-0 flex-col gap-6">{main}</div>
      <aside
        aria-label={asideTitle}
        className={cn(
          "bg-card ring-rule flex min-w-0 flex-col gap-1 rounded-xl px-4 pt-3 pb-4 ring-1 sm:px-5",
          foldOnPhone && "max-lg:hidden",
        )}
      >
        <h3 className="border-foreground border-b pb-2 text-base font-bold">{asideTitle}</h3>
        {aside}
      </aside>
    </div>
  );
}

/** A quiet note inside a station for when there is nothing to do there (yet). */
export function StationNote({ tone = "neutral", icon, children }: { tone?: Tone; icon?: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="bg-card ring-rule flex items-start gap-3 rounded-xl px-4 py-3.5 ring-1">
      {icon ? <Plate tone={tone} icon={icon} size="sm" /> : null}
      <div className="flex min-w-0 flex-1 flex-col gap-1 pt-1 text-[14px] text-pretty">{children}</div>
    </div>
  );
}

/** Back and on along the stations, at the foot of one. */
export function StationSteps({ station, onGo }: { station: StationKey; onGo: (key: StationKey) => void }) {
  const t = useTranslations("pipeline.stations");
  const i = STATIONS.indexOf(station);
  const prev = STATIONS[i - 1];
  const next = STATIONS[i + 1];
  return (
    <nav className="border-rule flex flex-wrap items-center justify-between gap-2 border-t pt-4">
      {prev ? (
        <Button variant="ghost" onClick={() => onGo(prev)} className="text-ink-2 hover:text-foreground">
          <ArrowLeft className="rtl:-scale-x-100" />
          {t("nav.prev", { station: t(`names.${prev}`) })}
        </Button>
      ) : (
        <span />
      )}
      {next ? (
        <Button variant="outline" onClick={() => onGo(next)}>
          {t("nav.next", { station: t(`names.${next}`) })}
          <ArrowRight className="rtl:-scale-x-100" />
        </Button>
      ) : null}
    </nav>
  );
}

/**
 * After a team finishes its part: the next request waiting on the same desk,
 * the one that has waited longest, one tap away. A team works a queue; the
 * way forward from a finished request is the next one, not the pipeline page.
 */
export function NextOnDesk({ team, currentId, role }: { team: PipelineTeam; currentId: string; role: PipelineRole }) {
  const t = useTranslations("pipeline.stations.next");
  const tt = useTranslations("pipeline.teams");
  const tv = useTranslations("pipeline.views");
  const timeAgo = useTimeAgo();
  const open = useRequestSlice({ team, teamStatuses: ["open"], pageSize: 50 });
  const next = (open.data?.items ?? [])
    .filter((r) => r.id !== currentId)
    .sort((a, b) => {
      const at = (r: typeof a) => r.task_states?.find((s) => s.team === team)?.opened_at ?? "";
      return at(a).localeCompare(at(b));
    })[0];
  const arrived = next?.task_states?.find((s) => s.team === team)?.opened_at;

  return (
    <section aria-labelledby="next-on-desk" className="flex flex-col gap-2">
      <div className="border-foreground flex min-h-10 items-end justify-between gap-3 border-b pb-2">
        <h3 id="next-on-desk" className="inline-flex items-center gap-2 text-base font-bold">
          <CircleCheck className={cn("size-[18px]", INK.green)} aria-hidden="true" />
          {t("title")}
        </h3>
        <Link
          href={`/pipeline?view=${team}`}
          className="text-ink-2 hover:text-foreground inline-flex min-h-8 items-center text-[13.5px] font-bold underline-offset-3 hover:underline"
        >
          {t("desk")}
        </Link>
      </div>
      {open.isPending ? (
        <div className="bg-sunk h-16 animate-pulse rounded-lg motion-reduce:animate-none" />
      ) : next ? (
        <>
          <p className="text-ink-2 text-[13.5px]">{t("body")}</p>
          <ul className="flex flex-col">
            <li>
              <RequestRow request={next} role={role} extra={arrived ? tv("arrived", { ago: timeAgo(arrived) }) : null} />
            </li>
          </ul>
        </>
      ) : (
        <p className="text-ink-2 py-3 text-[14px]">{t("clear", { team: tt(team) })}</p>
      )}
    </section>
  );
}
