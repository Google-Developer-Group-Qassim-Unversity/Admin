"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Ban,
  CalendarCheck,
  CalendarPlus,
  Check,
  CircleDashed,
  FileQuestion,
  Hourglass,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Door, INK, Mark, SectionHead, type Tone } from "@/components/najdi";
import { BookingCalendar } from "@/components/pipeline/booking-calendar";
import { MAX_BOOKING_DAYS, useRangePicker } from "@/components/pipeline/book-panel";
import { useBookOver } from "@/components/pipeline/override-dialog";
import { Countdown } from "@/components/pipeline/countdown";
import { DesignBriefForm, LogisticsBriefForm } from "@/components/pipeline/brief-forms";
import { DesignBriefSummary, EventFacts, LogisticsBriefSummary } from "@/components/pipeline/brief-summaries";
import { DesignPoster } from "@/components/pipeline/design-poster";
import { DetailsForm } from "@/components/pipeline/details-form";
import { DraftSaveProvider } from "@/components/pipeline/draft-autosave";
import { MissingProvider, focusField } from "@/components/pipeline/form-kit";
import { LogisticsConfirmation } from "@/components/pipeline/logistics-confirmation";
import { MediaJob, MediaReceives, MediaShared } from "@/components/pipeline/media-desk";
import { NotionLink } from "@/components/pipeline/notion-link";
import { PublishPanel } from "@/components/pipeline/publish-panel";
import { RequestHistory } from "@/components/pipeline/request-history";
import {
  BehalfFrame,
  BehalfNote,
  RoleProvider,
  TurnLine,
  useBehalfOf,
  usePipelineRole,
  whoseTurn,
  type PipelineRole,
} from "@/components/pipeline/roles";
import { isBookable, TEAM_ICON, useDepartmentName, useFormatDateRange } from "@/components/pipeline/shared";
import {
  FORM_STATIONS,
  Handoff,
  NextOnDesk,
  StationColumns,
  StationHead,
  StationNote,
  StationPanel,
  StationRail,
  StationSteps,
  stationOfField,
  useStationNav,
  useStations,
  type FormStation,
  type Station,
  type StationKey,
} from "@/components/pipeline/stations";
import { DraftBar, useFieldLabel } from "@/components/pipeline/submit-bar";
import { PenaltyNote, ReturnedNotice } from "@/components/pipeline/team-actions";
import { StageBadge } from "@/components/status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { useCancelRequest, useDeleteRequest, usePipelineRequest, useRedate } from "@/hooks/use-pipeline";
import { isolate, useFormatters, useListFormat, useTimeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { EventRequestDetail, PipelineMe, PipelineTeam } from "@/lib/pipeline-types";

const FORM_PANEL = "bg-card ring-rule rounded-xl p-4 ring-1 sm:p-6";

/**
 * One request: what it is and whose turn it is, then its five stations
 * (Event, Design, Logistics, Media, Publish) one at a time. Each party works
 * in its own station; the page lands each reader on theirs and moves on with
 * the request as it is handed over. A draft gets a bar that stays above the
 * thumb and walks the forms in order, ending in Submit.
 */
export function RequestView({ id, me }: { id: string; me: PipelineMe }) {
  const t = useTranslations("pipeline.request");
  const { data: request, isPending, error } = usePipelineRequest(id);

  if (isPending) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-5 w-1/2" />
        {/* The stations' course, then the station. */}
        <Skeleton className="h-[86px] w-full rounded-lg" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }
  if (error || !request) {
    return (
      <Empty className="bg-card ring-rule rounded-xl border-0 ring-1">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileQuestion />
          </EmptyMedia>
          <EmptyTitle>{t("notFound")}</EmptyTitle>
          {error ? <EmptyDescription className="text-door-madder-ink">{error.message}</EmptyDescription> : null}
        </EmptyHeader>
        <Button asChild variant="outline">
          <Link href="/pipeline">
            <ArrowLeft className="rtl:-scale-x-100" />
            {t("back")}
          </Link>
        </Button>
      </Empty>
    );
  }

  return (
    <DraftSaveProvider>
      <RequestBody request={request} me={me} />
    </DraftSaveProvider>
  );
}

interface StationContext {
  request: EventRequestDetail;
  role: PipelineRole;
  station: Station;
  /** Whether the reader is the requesting department (not a super admin stepping in). */
  ownsDepartment: boolean;
  /** Missing fields to show on this station, once anything is shown at all. */
  missing: string[];
  shown: boolean;
  onJump: (field: string) => void;
  onGo: (key: StationKey) => void;
}

function RequestBody({ request, me }: { request: EventRequestDetail; me: PipelineMe }) {
  const ts = useTranslations("pipeline.stations");
  // Missing fields turn red only after someone tries to submit.
  const [shown, setShown] = React.useState(false);

  const role = usePipelineRole(me);
  const ownsDepartment = role.ownsDepartment(request.department.id);
  const canAct = me.is_super_admin || me.departments.some((d) => d.id === request.department.id);
  const isDraft = request.stage === "draft";
  const isReturned = request.stage === "returned";
  const holdRanOut = isDraft && !!request.hold_expires_at && request.hold_expires_at <= request.now;
  const lostDates = (!request.start_date || holdRanOut) && canAct && !["published", "cancelled"].includes(request.stage);
  const showBar = request.can_edit && ((isDraft && canAct) || (isReturned && request.actions.can_resubmit));
  // The dates door already says when dates are what's missing.
  const missing = lostDates ? request.missing.filter((f) => f !== "dates") : request.missing;
  const showMissing = request.can_edit && canAct && (isDraft || (isReturned && missing.length > 0));
  const holding = isDraft && canAct && !!request.hold_expires_at && !holdRanOut;

  const missingBy = React.useMemo(() => {
    const out: Record<FormStation, string[]> = { event: [], design: [], logistics: [] };
    if (showMissing) for (const field of missing) if (field !== "dates") out[stationOfField(field)].push(field);
    return out;
  }, [missing, showMissing]);
  const counts = { event: missingBy.event.length, design: missingBy.design.length, logistics: missingBy.logistics.length };
  const firstMissing = FORM_STATIONS.find((key) => missingBy[key].length) ?? null;

  const stations = useStations(request, role, counts);
  const nav = useStationNav(request, role, firstMissing);
  const station = stations.find((s) => s.key === nav.station) ?? stations[0];

  const jump = (field: string) => {
    if (field === "dates") {
      document.getElementById("request-dates")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    const target = stationOfField(field);
    if (target !== nav.station) nav.go(target);
    // The station has to be on screen before its field can scroll into view.
    window.setTimeout(() => focusField(field), target === nav.station ? 0 : 140);
  };

  const onIncomplete = (fields: string[]) => {
    setShown(true);
    if (fields[0]) jump(fields[0]);
  };

  // A draft is filled in station by station: the bar's Next walks to the following form.
  const formIndex = (FORM_STATIONS as readonly string[]).indexOf(nav.station);
  const nextForm = isDraft && formIndex >= 0 && formIndex < FORM_STATIONS.length - 1 ? FORM_STATIONS[formIndex + 1] : null;

  const context: StationContext = {
    request,
    role,
    station,
    ownsDepartment,
    missing: (FORM_STATIONS as readonly string[]).includes(nav.station) ? missingBy[nav.station as FormStation] : [],
    shown,
    onJump: jump,
    onGo: nav.go,
  };

  return (
    <RoleProvider role={role}>
      <MissingProvider missing={request.missing} shown={shown}>
        <div className={cn("flex flex-col gap-5", showBar && "max-md:pb-40")}>
          <RequestHeader request={request} me={me} role={role} />
          <OversightNote request={request} role={role} />
          {holding ? <HoldLine request={request} /> : null}

          {request.stage === "cancelled" ? <CancelledDoor request={request} /> : null}
          {lostDates ? <Redate request={request} me={me} /> : null}
          {isReturned ? <ReturnedNotice request={request} /> : null}
          <PenaltyNote request={request} />

          <div className="flex flex-col gap-5">
            <StationRail stations={stations} current={nav.station} onSelect={nav.go} railRef={nav.railRef} />
            <StationPanel station={nav.station} direction={nav.direction}>
              {nav.handoff ? (
                <Handoff kind={nav.handoff} request={request} ownsDepartment={ownsDepartment} onDismiss={nav.dismissHandoff} />
              ) : null}
              {nav.station === "event" ? <EventStation {...context} /> : null}
              {nav.station === "design" ? <DesignStation {...context} /> : null}
              {nav.station === "logistics" ? <LogisticsStation {...context} /> : null}
              {nav.station === "media" ? <MediaStation {...context} /> : null}
              {nav.station === "publish" ? <PublishStation {...context} /> : null}
              {/* A draft's bar walks its forms; everywhere else the stations are walked from here. */}
              {showBar && isDraft && formIndex >= 0 ? null : <StationSteps station={nav.station} onGo={nav.go} />}
            </StationPanel>
          </div>

          <RequestHistory request={request} />

          {showBar ? (
            <DraftBar
              request={request}
              onIncomplete={onIncomplete}
              next={nextForm ? { label: ts(`names.${nextForm}`), onGo: () => nav.go(nextForm) } : null}
            />
          ) : null}
        </div>
      </MissingProvider>
    </RoleProvider>
  );
}

/** The plate colour of a station's head: its own tone while it is active or finished, the wall while it waits. */
function headTone(station: Station): Tone {
  if (station.state === "later") return "neutral";
  if (station.state === "active" && !station.mine && station.tone === "ochre") return "neutral";
  return station.tone;
}

/** What the department still has to fill in on this station, as chips that jump to each field. */
function MissingHere({ missing, shown, onJump }: { missing: string[]; shown: boolean; onJump: (field: string) => void }) {
  const t = useTranslations("pipeline.stations");
  const label = useFieldLabel();
  if (!missing.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className={cn("me-1 text-[13px] font-bold", shown ? INK.madder : INK.ochre)}>{t("missingHere")}</span>
      {missing.map((field) => (
        <button
          key={field}
          type="button"
          onClick={() => onJump(field)}
          className={cn(
            "focus-visible:outline-ring inline-flex min-h-8 items-center gap-1 rounded-sm px-2 text-[13px] font-bold outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 pointer-coarse:min-h-10",
            shown ? "bg-door-madder-soft text-door-madder-ink" : "bg-door-ochre-soft text-door-ochre-ink",
          )}
        >
          <CircleDashed className="size-3.5" aria-hidden="true" />
          {label(field)}
        </button>
      ))}
    </div>
  );
}

/** "Sent by Ibrahim 2 days ago": a person and a time, for a station's line. */
function useWhoWhen() {
  const timeAgo = useTimeAgo();
  return (name: string | null | undefined, at: string | null | undefined) => ({
    name: isolate(name ?? "-"),
    ago: timeAgo(at),
  });
}

function EventStation({ request, station, ownsDepartment, missing, shown, onJump }: StationContext) {
  const t = useTranslations("pipeline.stations.head.event");
  const departmentName = useDepartmentName();
  const whoWhen = useWhoWhen();
  const department = isolate(departmentName(request.department));
  const line =
    request.stage === "cancelled"
      ? t("cancelled")
      : request.stage === "draft"
        ? ownsDepartment
          ? t("filling")
          : t("fillingFor", { department })
        : request.stage === "returned"
          ? ownsDepartment
            ? t("returned")
            : t("returnedFor", { department })
          : t("sent", whoWhen(request.submitted_by?.name ?? request.requested_by.name, request.submitted_at));

  return (
    <>
      <StationHead station="event" request={request} line={line} tone={headTone(station)} mine={station.mine} />
      <MissingHere missing={missing} shown={shown} onJump={onJump} />
      {request.can_edit ? (
        <div className={FORM_PANEL}>
          <DetailsForm request={request} />
        </div>
      ) : (
        <div className={cn(FORM_PANEL, "pt-2 sm:pt-3")}>
          <EventFacts request={request} full />
        </div>
      )}
    </>
  );
}

/** The line under a team station's name, by where its part stands and whose it is. */
function useTeamLine(request: EventRequestDetail, team: PipelineTeam, station: Station, ownsDepartment: boolean) {
  const t = useTranslations("pipeline.stations.head");
  const departmentName = useDepartmentName();
  const whoWhen = useWhoWhen();
  const timeAgo = useTimeAgo();
  const department = isolate(departmentName(request.department));
  const task = request.tasks.find((x) => x.team === team);
  const status = task?.status;

  if (team === "media") {
    if (status === "done") return t("media.done", whoWhen(task?.done_by?.name, task?.done_at));
    if (status === "open") return station.mine ? t("media.yours") : t("media.working", { ago: timeAgo(task?.opened_at) });
    return t("media.later");
  }
  if (status === "done") return t(`${team}.done`, whoWhen(task?.done_by?.name, task?.done_at));
  if (status === "open") return station.mine ? t(`${team}.yours`) : t(`${team}.working`, { ago: timeAgo(task?.opened_at) });
  if (status === "returned") return t("design.sentBack");
  if (request.can_edit) return ownsDepartment ? t(`${team}.brief`) : t(`${team}.briefFor`, { department });
  return t(`${team}.notSent`, { department });
}

/** Beside a team's job: what the department asked of that team, and the event in brief. */
function AskedFor({ request, brief }: { request: EventRequestDetail; brief: React.ReactNode }) {
  const t = useTranslations("pipeline.stations.context");
  return (
    <div className="flex flex-col gap-6 pt-2">
      {brief}
      <section className="flex flex-col gap-2">
        <h4 className="border-rule border-b pb-1.5 text-[14px] font-bold">{t("event")}</h4>
        <EventFacts request={request} />
      </section>
    </div>
  );
}

function DesignStation({ request, role, station, ownsDepartment, missing, shown, onJump }: StationContext) {
  const t = useTranslations("pipeline.stations");
  const tp = useTranslations("pipeline.poster");
  const departmentName = useDepartmentName();
  const line = useTeamLine(request, "design", station, ownsDepartment);
  const task = request.tasks.find((x) => x.team === "design");
  const status = task?.status;
  const posterUrl = task?.deliverable?.poster_url as string | undefined;
  const head = <StationHead station="design" request={request} line={line} tone={headTone(station)} mine={station.mine} />;

  // Still the department's to write (a draft, or a request Design returned).
  if (request.can_edit) {
    return (
      <>
        {head}
        <MissingHere missing={missing} shown={shown} onJump={onJump} />
        <div className={FORM_PANEL}>
          <DesignBriefForm request={request} />
        </div>
      </>
    );
  }
  if (!status || status === "brief") {
    return (
      <>
        {head}
        <div className={cn(FORM_PANEL, "pt-2 sm:pt-3")}>
          <DesignBriefSummary request={request} />
        </div>
      </>
    );
  }

  const posterShows = request.actions.can_upload_poster || !!posterUrl;
  return (
    <>
      {head}
      <StationColumns
        asideTitle={t("context.asked", { department: isolate(departmentName(request.department)) })}
        aside={<AskedFor request={request} brief={<DesignBriefSummary request={request} />} />}
        main={
          <>
            {posterShows ? (
              <DesignPoster request={request} />
            ) : (
              <StationNote tone="indigo" icon={TEAM_ICON.design}>
                <p className="font-bold">{tp("title")}</p>
                <p className="text-ink-2">{tp("viewHint")}</p>
              </StationNote>
            )}
            {status === "done" && role.ownsTeam("design") ? <NextOnDesk team="design" currentId={request.id} role={role} /> : null}
          </>
        }
      />
    </>
  );
}

function LogisticsStation({ request, role, station, ownsDepartment, missing, shown, onJump }: StationContext) {
  const t = useTranslations("pipeline.stations");
  const departmentName = useDepartmentName();
  const line = useTeamLine(request, "logistics", station, ownsDepartment);
  const task = request.tasks.find((x) => x.team === "logistics");
  const status = task?.status;
  const head = <StationHead station="logistics" request={request} line={line} tone={headTone(station)} mine={station.mine} />;

  if (request.can_edit) {
    return (
      <>
        {head}
        <MissingHere missing={missing} shown={shown} onJump={onJump} />
        <div className={FORM_PANEL}>
          {/* Its questions depend on each day's mode, which is set on the Event station. */}
          <LogisticsBriefForm request={request} onGoToDetails={() => onJump("details.day_modes")} />
        </div>
      </>
    );
  }
  if (!status || status === "brief") {
    return (
      <>
        {head}
        <div className={cn(FORM_PANEL, "pt-2 sm:pt-3")}>
          <LogisticsBriefSummary request={request} />
        </div>
      </>
    );
  }

  const confirming = request.actions.complete.includes("logistics");
  const shows = confirming || (status === "done" && !!task?.deliverable);
  return (
    <>
      {head}
      <StationColumns
        // The confirmation is a long form: on a phone the brief folds into a line above it.
        foldOnPhone={confirming}
        asideTitle={t("context.asked", { department: isolate(departmentName(request.department)) })}
        aside={<AskedFor request={request} brief={<LogisticsBriefSummary request={request} />} />}
        main={
          <>
            {shows ? (
              <LogisticsConfirmation request={request} />
            ) : (
              <StationNote tone="indigo" icon={TEAM_ICON.logistics}>
                <p className="font-bold">{t("receives.confirmed")}</p>
                <p className="text-ink-2">{line}</p>
              </StationNote>
            )}
            {status === "done" && role.ownsTeam("logistics") ? <NextOnDesk team="logistics" currentId={request.id} role={role} /> : null}
          </>
        }
      />
    </>
  );
}

function MediaStation({ request, role, station, ownsDepartment }: StationContext) {
  const t = useTranslations("pipeline.stations");
  const line = useTeamLine(request, "media", station, ownsDepartment);
  const status = request.tasks.find((x) => x.team === "media")?.status;

  return (
    <>
      <StationHead station="media" request={request} line={line} tone={headTone(station)} mine={station.mine} />
      <StationColumns
        asideTitle={t("context.event")}
        aside={
          <div className="pt-2">
            <EventFacts request={request} />
          </div>
        }
        main={
          <>
            <MediaJob request={request} />
            <MediaShared request={request} />
            <MediaReceives request={request} />
            {status === "done" && role.ownsTeam("media") ? <NextOnDesk team="media" currentId={request.id} role={role} /> : null}
          </>
        }
      />
    </>
  );
}

function PublishStation({ request, station, ownsDepartment }: StationContext) {
  const t = useTranslations("pipeline.stations");
  const departmentName = useDepartmentName();
  const whoWhen = useWhoWhen();
  const department = isolate(departmentName(request.department));
  const line =
    request.stage === "cancelled"
      ? t("head.publish.cancelled")
      : request.stage === "published"
        ? t("head.publish.published", whoWhen(request.published_by?.name, request.published_at))
        : request.stage === "ready"
          ? ownsDepartment
            ? t("head.publish.readyYours")
            : t("head.publish.ready", { department })
          : ownsDepartment
            ? t("head.publish.laterYours")
            : t("head.publish.later", { department });

  return (
    <>
      <StationHead station="publish" request={request} line={line} tone={headTone(station)} mine={station.mine} />
      <PublishPanel request={request} />
      {request.stage !== "published" && request.stage !== "cancelled" ? <PublishChecklist request={request} /> : null}
      <MediaShared request={request} />
    </>
  );
}

/** What publishing takes from each team, and whether it is in: the poster, the confirmed event, Media's part. */
function PublishChecklist({ request }: { request: EventRequestDetail }) {
  const t = useTranslations("pipeline.stations.checklist");
  const status = (team: PipelineTeam) => request.tasks.find((x) => x.team === team)?.status;
  const poster = !!request.tasks.find((x) => x.team === "design")?.deliverable?.poster_url;
  const rows: { key: string; label: string; ready: boolean }[] = [
    { key: "poster", label: t("poster"), ready: status("design") === "done" && poster },
    { key: "confirmed", label: t("confirmed"), ready: status("logistics") === "done" },
    { key: "media", label: t("media"), ready: status("media") === "done" },
  ];

  return (
    <section aria-labelledby="publish-checklist" className="flex flex-col gap-1">
      <SectionHead id="publish-checklist" title={t("title")} />
      <ul className="flex flex-col">
        {rows.map((row) => (
          <li key={row.key} className="border-rule flex min-h-12 items-center gap-3 border-b px-1 py-2.5">
            {row.ready ? (
              <Check className={cn("size-[18px] shrink-0", INK.green)} strokeWidth={2.25} aria-hidden="true" />
            ) : (
              <Mark tone="neutral" className="mx-1 size-2.5" />
            )}
            <span className="flex-1 text-[14.5px] font-medium">{row.label}</span>
            <span className={cn("text-[12.5px] font-bold", row.ready ? INK.green : "text-ink-3")}>{row.ready ? t("ready") : t("waiting")}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * The days are held while the request is filled in: one line with the clock,
 * above every station, so it never has to be scrolled back up to.
 */
function HoldLine({ request }: { request: EventRequestDetail }) {
  const t = useTranslations("pipeline.request");
  const departmentName = useDepartmentName();
  const behalf = useBehalfOf({ kind: "department", department: request.department });
  return (
    <p
      className={cn(
        "flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg px-3.5 py-2.5 text-[14px] font-medium",
        behalf ? "bg-sunk text-ink-2" : "bg-door-ochre-soft text-door-ochre-ink",
      )}
    >
      <Hourglass className="size-4 shrink-0" aria-hidden="true" />
      <span>{behalf ? t("holdLineFor", { department: isolate(departmentName(request.department)) }) : t("holdLine")}</span>
      <Countdown
        until={request.hold_expires_at}
        serverNow={request.now}
        format="clock"
        plain
        className={cn("text-[16px] font-bold", behalf ? "text-foreground" : undefined)}
      />
    </p>
  );
}

/**
 * A super admin on a request that is not theirs: one line saying whose it is,
 * who it waits on, and that they have been told. Every door below then shows
 * as that party's, with the super admin's controls set apart.
 */
function OversightNote({ request, role }: { request: EventRequestDetail; role: PipelineRole }) {
  const t = useTranslations("roles.oversight");
  const tt = useTranslations("pipeline.teams");
  const departmentName = useDepartmentName();
  const list = useListFormat();
  if (!role.isSuperAdmin || role.ownsDepartment(request.department.id)) return null;
  const turn = whoseTurn(request);
  if (turn?.kind === "teams" && turn.teams.some((team) => role.ownsTeam(team))) return null;
  const department = isolate(departmentName(request.department));

  return (
    <BehalfNote>
      <b className="font-bold">{t("whose", { department })}</b>{" "}
      {turn?.kind === "teams" && turn.teams.length
        ? t("waitsOnTeams", { teams: list(turn.teams.map((team) => tt(team))) })
        : turn?.kind === "department"
          ? t("waitsOnDepartment", { department })
          : t("over")}{" "}
      {turn ? t("canAct") : null}
    </BehalfNote>
  );
}


function RequestHeader({
  request,
  me,
  role,
}: {
  request: EventRequestDetail;
  me: PipelineMe;
  role: PipelineRole;
}) {
  const t = useTranslations("pipeline.request");
  const td = useTranslations("pipeline.details.eventTypes");
  const departmentName = useDepartmentName();
  const formatRange = useFormatDateRange();
  const cancel = useCancelRequest(request.id);
  const [confirming, setConfirming] = React.useState(false);

  const onCancel = async () => {
    try {
      await cancel.mutateAsync();
      toast.success(t("cancelled"));
      setConfirming(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("failed"));
    }
  };

  const meta = [
    request.details.event_type ? td(request.details.event_type) : null,
    request.start_date ? formatRange(request.start_date, request.end_date) : t("noDates"),
    t("requestedBy", { name: request.requested_by.name }),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <header className="border-foreground flex flex-col gap-2 border-b pb-3 sm:gap-3 sm:pb-4">
      <div className="flex items-center justify-between gap-2">
        <Link
          href="/pipeline"
          className="text-ink-2 hover:text-foreground -ms-1 flex min-h-11 w-fit items-center gap-1 rounded-sm px-1 text-sm font-bold transition-colors"
        >
          <ArrowLeft className="size-4 rtl:-scale-x-100" />
          {t("back")}
        </Link>
        <div className="-me-2 flex items-center gap-1.5">
          <NotionLink request={request} isSuperAdmin={me.is_super_admin} />
          {request.actions.can_cancel ? (
            <Button
              variant="ghost"
              className="text-door-madder-ink hover:text-door-madder-ink min-h-11 max-sm:min-w-11 max-sm:px-0"
              aria-label={t("cancel")}
              onClick={() => setConfirming(true)}
            >
              <Ban />
              <span className="max-sm:sr-only">{t("cancel")}</span>
            </Button>
          ) : null}
        </div>
      </div>
      <h1 className="font-display text-[26px] leading-tight font-semibold text-balance sm:text-[32px]">
        <bdi>{request.title || t("untitled")}</bdi>
      </h1>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <span className="bg-sunk inline-flex h-7 items-center gap-1.5 rounded-sm px-2.5 text-[13px] font-bold">
          <Mark tone="umber" />
          {departmentName(request.department)}
        </span>
        <StageBadge stage={request.stage} />
        <p className="text-ink-2 tabular text-[13.5px]">{meta}</p>
      </div>
      {whoseTurn(request) ? (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13.5px]">
          <span className="text-ink-2 font-medium">{t("nowWith")}</span>
          <TurnLine request={request} role={role} />
        </p>
      ) : null}
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("cancelTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(request.stage === "draft" ? "cancelConfirm" : "cancelConfirmSubmitted")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("keep")}</AlertDialogCancel>
            <AlertDialogAction
              variant="madder"
              onClick={(e) => {
                e.preventDefault();
                onCancel();
              }}
              disabled={cancel.isPending}
            >
              {t("cancel")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}

/** A cancelled request: who dropped it and when. It holds no dates, and can be deleted for good. */
function CancelledDoor({ request }: { request: EventRequestDetail }) {
  const t = useTranslations("pipeline.request");
  const router = useRouter();
  const fmt = useFormatters();
  const remove = useDeleteRequest();
  const [confirming, setConfirming] = React.useState(false);

  const onDelete = async () => {
    try {
      await remove.mutateAsync(request.id);
      toast.success(t("deleted"));
      router.push("/pipeline");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("failed"));
    }
  };

  return (
    <Door tone="umber" aria-labelledby="cancelled-title">
      <h2 id="cancelled-title" className="font-display text-[21px] leading-tight font-semibold">
        {t("cancelledTitle")}
      </h2>
      <p className="text-sm font-medium">
        {request.cancelled_by && request.cancelled_at
          ? t("cancelledBy", { name: isolate(request.cancelled_by.name), when: fmt.dateTime(request.cancelled_at) })
          : null}{" "}
        {t("cancelledBody")}
      </p>
      {request.actions.can_delete ? (
        <div>
          <Button size="lg" className="bg-card text-foreground hover:bg-card/90" onClick={() => setConfirming(true)}>
            <Trash2 />
            {t("delete")}
          </Button>
        </div>
      ) : null}
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("keep")}</AlertDialogCancel>
            <AlertDialogAction
              variant="madder"
              onClick={(e) => {
                e.preventDefault();
                onDelete();
              }}
              disabled={remove.isPending}
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Door>
  );
}

const LOST_DATES = {
  hold_expired: "lostDatesExpired",
  day_banned: "lostDatesBanned",
  overridden: "lostDatesOverridden",
} as const;

/** The dates were lost (the hold ran out, Logistics closed a day, or a super admin took them): pick new ones. */
function Redate({ request, me }: { request: EventRequestDetail; me: PipelineMe }) {
  const t = useTranslations("pipeline.request");
  const tb = useTranslations("pipeline.book");
  const formatRange = useFormatDateRange();
  const [open, setOpen] = React.useState(false);
  const range = useRangePicker(MAX_BOOKING_DAYS, (d) => isBookable(d, me));
  const redate = useRedate(request.id);
  const behalf = useBehalfOf({ kind: "department", department: request.department });
  const bookOver = useBookOver(me);

  const onSave = async () => {
    if (!range.start || !range.end) return;
    const [start, end] = [range.start, range.end];
    try {
      await bookOver.guard(start, end, request.id, async (bumps) => {
        try {
          await redate.mutateAsync({ start, end, bumps });
          toast.success(t("redated"));
          setOpen(false);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : t("failed"));
        }
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("failed"));
    }
  };

  return (
    <div id="request-dates" className="flex scroll-mt-24 flex-col gap-3">
      {bookOver.dialog}
      {behalf ? (
        <BehalfFrame
          party={behalf}
          aria-labelledby="lost-dates"
          title={<span id="lost-dates">{t(LOST_DATES[request.undated_reason ?? "hold_expired"])}</span>}
          note={t("lostDatesBodyFor")}
          actions={
            !open ? (
              <div>
                <Button variant="outline" size="lg" onClick={() => setOpen(true)}>
                  <CalendarPlus />
                  {t("redateFor")}
                </Button>
              </div>
            ) : undefined
          }
        />
      ) : (
        <Door tone="madder" aria-labelledby="lost-dates">
          <h2 id="lost-dates" className="font-display text-[21px] leading-tight font-semibold">
            {t(LOST_DATES[request.undated_reason ?? "hold_expired"])}
          </h2>
          <p className="text-sm font-medium">{t("lostDatesBody")}</p>
          {!open ? (
            <div>
              <Button size="lg" className="bg-card text-foreground hover:bg-card/90" onClick={() => setOpen(true)}>
                <CalendarPlus />
                {t("redate")}
              </Button>
            </div>
          ) : null}
        </Door>
      )}
      {open ? (
        <section className="bg-card ring-door-ochre flex flex-col gap-4 rounded-xl p-4 ring-2 sm:p-5">
          <BookingCalendar
            selected={range.selected}
            range={{ start: range.start, end: range.end }}
            flash={range.flash}
            onDayClick={range.onDayClick}
            isSelectable={(d) => isBookable(d, me)}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <span className={cn("flex-1 text-sm", range.start && range.end ? "tabular text-[17px] font-bold" : "text-ink-2")}>
              {range.start && range.end ? formatRange(range.start, range.end) : tb(me.is_super_admin ? "hintSuperAdmin" : "hint", { max: MAX_BOOKING_DAYS })}
            </span>
            <div className="flex gap-2 *:flex-1 sm:*:flex-none">
              <Button variant="ghost" size="lg" onClick={() => setOpen(false)}>
                {t("redateCancel")}
              </Button>
              <Button variant="ochre" size="lg" onClick={onSave} disabled={!range.start || redate.isPending}>
                <CalendarCheck />
                {t("redateSave")}
              </Button>
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
