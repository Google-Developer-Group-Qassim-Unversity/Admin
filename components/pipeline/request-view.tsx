"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  CalendarCheck,
  CalendarPlus,
  Check,
  ChevronRight,
  CircleDashed,
  Ellipsis,
  FileQuestion,
  FileText,
  Palette,
  Trash2,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Count, Door, Mark, Plate, SectionHead } from "@/components/najdi";
import { BookingCalendar } from "@/components/pipeline/booking-calendar";
import { MAX_BOOKING_DAYS, useRangePicker } from "@/components/pipeline/book-panel";
import { Countdown } from "@/components/pipeline/countdown";
import { DesignBriefForm, LogisticsBriefForm } from "@/components/pipeline/brief-forms";
import { DesignPoster } from "@/components/pipeline/design-poster";
import { DetailsForm } from "@/components/pipeline/details-form";
import { DraftSaveProvider } from "@/components/pipeline/draft-autosave";
import { MissingProvider, READ_ONLY, focusField } from "@/components/pipeline/form-kit";
import { LogisticsConfirmation } from "@/components/pipeline/logistics-confirmation";
import { PublishPanel } from "@/components/pipeline/publish-panel";
import { RequestHistory } from "@/components/pipeline/request-history";
import { RequestProgress } from "@/components/pipeline/request-progress";
import { useDepartmentName, useFormatDateRange } from "@/components/pipeline/shared";
import { DraftBar, tabOf, useFieldLabel, type FormTab } from "@/components/pipeline/submit-bar";
import { PenaltyNote, ReturnedNotice, TeamActions } from "@/components/pipeline/team-actions";
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCancelRequest, usePipelineRequest, useRedate } from "@/hooks/use-pipeline";
import { cn } from "@/lib/utils";
import type { EventRequestDetail, PipelineMe } from "@/lib/pipeline-types";

const TAB_PANEL = "bg-card ring-rule rounded-xl p-4 ring-1 sm:p-6 data-[state=inactive]:hidden";
const FORM_TABS = ["details", "design", "logistics"] as const;
const TAB_ICON: Record<FormTab, LucideIcon> = { details: FileText, design: Palette, logistics: Truck };

/**
 * One request, top to bottom: what it is, the one thing to do now (a painted
 * door), where it stands, what is left, then the three forms. A draft gets a
 * bar that stays above the thumb with Submit.
 */
export function RequestView({ id, me }: { id: string; me: PipelineMe }) {
  const t = useTranslations("pipeline.request");
  const { data: request, isPending, error } = usePipelineRequest(id);

  if (isPending) {
    return (
      <div className="flex flex-col gap-5">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-24 w-full" />
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

function RequestBody({ request, me }: { request: EventRequestDetail; me: PipelineMe }) {
  const t = useTranslations("pipeline.request");
  const [tab, setTab] = React.useState<FormTab>("details");
  // Missing fields turn red only after someone tries to submit.
  const [shown, setShown] = React.useState(false);

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

  const missingByTab = React.useMemo(() => {
    const out: Record<FormTab, string[]> = { details: [], design: [], logistics: [] };
    for (const field of missing) out[tabOf(field) ?? "details"].push(field);
    return out;
  }, [missing]);

  const openTab = React.useCallback((owner: FormTab) => {
    setTab(owner);
    window.setTimeout(() => document.getElementById("request-forms")?.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
  }, []);

  const jump = React.useCallback((field: string) => {
    const owner = tabOf(field);
    if (!owner) {
      document.getElementById("request-dates")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setTab(owner);
    // The tab has to be visible before its field can scroll into view.
    window.setTimeout(() => focusField(field), 60);
  }, []);

  const onIncomplete = (fields: string[]) => {
    setShown(true);
    if (fields[0]) jump(fields[0]);
  };

  return (
    <MissingProvider missing={request.missing} shown={shown}>
      <div className={cn("flex flex-col gap-6", showBar && "max-md:pb-40")}>
        <RequestHeader request={request} me={me} canAct={canAct} />

        {lostDates ? <Redate request={request} me={me} /> : null}
        {holding ? <HoldDoor request={request} /> : null}
        {isReturned ? <ReturnedNotice request={request} /> : null}
        <PenaltyNote request={request} />
        <TeamActions request={request} />
        <PublishPanel request={request} />
        <DesignPoster request={request} />
        <LogisticsConfirmation request={request} />

        <RequestProgress request={request} />

        {showMissing ? (
          <WhatIsLeft missingByTab={missingByTab} total={missing.length} shown={shown} onJump={jump} onOpen={openTab} />
        ) : null}

        <Tabs id="request-forms" value={tab} onValueChange={(v) => setTab(v as FormTab)} className="scroll-mt-24 gap-3">
          <TabsList className="w-full sm:w-fit">
            {FORM_TABS.map((key) => (
              <TabsTrigger key={key} value={key} className="gap-1.5">
                {t(`tabs.${key}`)}
                {showMissing && missingByTab[key].length ? (
                  <Count tone={shown ? "madder" : "ochre"} className="h-[18px] min-w-[18px] text-[11px]">
                    {missingByTab[key].length}
                  </Count>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>
          {/* Every tab stays mounted, so switching tabs never drops what was typed. */}
          <TabsContent value="details" forceMount className={cn(TAB_PANEL, !request.can_edit && READ_ONLY)}>
            <DetailsForm request={request} />
          </TabsContent>
          <TabsContent value="design" forceMount className={cn(TAB_PANEL, !request.can_edit && READ_ONLY)}>
            <DesignBriefForm request={request} />
          </TabsContent>
          <TabsContent value="logistics" forceMount className={cn(TAB_PANEL, !request.can_edit && READ_ONLY)}>
            <LogisticsBriefForm request={request} onGoToDetails={() => setTab("details")} />
          </TabsContent>
        </Tabs>

        <RequestHistory request={request} />

        {showBar ? <DraftBar request={request} onIncomplete={onIncomplete} /> : null}
      </div>
    </MissingProvider>
  );
}

/** The days are held while the request is filled in: the clock, on an ochre door. */
function HoldDoor({ request }: { request: EventRequestDetail }) {
  const t = useTranslations("pipeline.request");
  return (
    <Door tone="ochre" aria-labelledby="hold-title">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <h2 id="hold-title" className="font-display text-[21px] leading-tight font-semibold">
          {t("holdTitle")}
        </h2>
        <Countdown until={request.hold_expires_at} serverNow={request.now} format="clock" plain className="text-2xl" />
      </div>
      <p className="text-sm font-medium">{t("holdBody")}</p>
    </Door>
  );
}

/**
 * What submit still needs, by form: a plate per form (green when it is
 * complete), and each missing field as a chip that jumps to it.
 */
function WhatIsLeft({
  missingByTab,
  total,
  shown,
  onJump,
  onOpen,
}: {
  missingByTab: Record<FormTab, string[]>;
  total: number;
  shown: boolean;
  onJump: (field: string) => void;
  onOpen: (tab: FormTab) => void;
}) {
  const t = useTranslations("pipeline");
  const label = useFieldLabel();

  return (
    <section aria-labelledby="whats-left" className="flex flex-col gap-1">
      <SectionHead
        id="whats-left"
        title={t("request.whatsLeft")}
        count={total || undefined}
        countTone={shown ? "madder" : "ochre"}
      />
      <ul className="flex flex-col">
        {FORM_TABS.map((key) => {
          const fields = missingByTab[key];
          const complete = fields.length === 0;
          return (
            <li key={key} className="border-rule flex min-h-16 items-center gap-3 border-b px-1 py-3">
              <Plate tone={complete ? "green" : shown ? "madder" : "ochre"} icon={complete ? Check : TAB_ICON[key]} />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => onOpen(key)}
                  className="w-fit text-start text-[15px] font-bold outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {t(`request.tabs.${key}`)}
                </button>
                {complete ? (
                  <span className="text-door-green-ink text-[13px] font-medium">{t("request.sectionDone")}</span>
                ) : (
                  <ul className="flex flex-wrap gap-1.5">
                    {fields.map((field) => (
                      <li key={field}>
                        <button
                          type="button"
                          onClick={() => onJump(field)}
                          className={cn(
                            "inline-flex min-h-8 items-center gap-1 rounded-sm px-2 text-[13px] font-bold outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring pointer-coarse:min-h-10",
                            shown ? "bg-door-madder-soft text-door-madder-ink" : "bg-door-ochre-soft text-door-ochre-ink",
                          )}
                        >
                          <CircleDashed className="size-3.5" aria-hidden="true" />
                          {label(field)}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <ChevronRight className="text-ink-3 size-[18px] shrink-0 rtl:-scale-x-100" aria-hidden="true" />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function RequestHeader({ request, me, canAct }: { request: EventRequestDetail; me: PipelineMe; canAct: boolean }) {
  const t = useTranslations("pipeline.request");
  const td = useTranslations("pipeline.details.eventTypes");
  const router = useRouter();
  const departmentName = useDepartmentName();
  const formatRange = useFormatDateRange();
  const cancel = useCancelRequest();
  const [confirming, setConfirming] = React.useState(false);
  const canCancel =
    canAct && (request.stage === "draft" || me.is_super_admin) && !["published", "cancelled"].includes(request.stage);

  const onCancel = async () => {
    try {
      await cancel.mutateAsync(request.id);
      toast.success(t("cancelled"));
      router.push("/pipeline");
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
        {canCancel ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="-me-2" aria-label={t("moreActions")}>
                <Ellipsis className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem variant="destructive" onSelect={() => setConfirming(true)}>
                <Trash2 />
                {t("cancel")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
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
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("cancelTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("cancelConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("keep")}</AlertDialogCancel>
            <AlertDialogAction variant="madder" onClick={onCancel} disabled={cancel.isPending}>
              {t("cancel")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </header>
  );
}

/** The dates were lost (the hold ran out, or Logistics closed a day): pick new ones. */
function Redate({ request, me }: { request: EventRequestDetail; me: PipelineMe }) {
  const t = useTranslations("pipeline.request");
  const tb = useTranslations("pipeline.book");
  const formatRange = useFormatDateRange();
  const [open, setOpen] = React.useState(false);
  const range = useRangePicker(me.is_super_admin ? null : MAX_BOOKING_DAYS);
  const redate = useRedate(request.id);

  const onSave = async () => {
    if (!range.start || !range.end) return;
    try {
      await redate.mutateAsync({ start: range.start, end: range.end });
      toast.success(t("redated"));
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("failed"));
    }
  };

  return (
    <div id="request-dates" className="flex scroll-mt-24 flex-col gap-3">
      <Door tone="madder" aria-labelledby="lost-dates">
        <h2 id="lost-dates" className="font-display text-[21px] leading-tight font-semibold">
          {t(request.undated_reason === "day_banned" ? "lostDatesBanned" : "lostDatesExpired")}
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
      {open ? (
        <section className="bg-card ring-door-ochre flex flex-col gap-4 rounded-xl p-4 ring-2 sm:p-5">
          <BookingCalendar
            selected={range.selected}
            range={{ start: range.start, end: range.end }}
            onDayClick={range.onDayClick}
            isSelectable={(d) => me.is_super_admin || d.status === "open"}
          />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <span className={cn("flex-1 text-sm", range.start ? "tabular text-[17px] font-bold" : "text-ink-2")}>
              {range.start ? formatRange(range.start, range.end) : tb(me.is_super_admin ? "hintSuperAdmin" : "hint", { max: MAX_BOOKING_DAYS })}
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
