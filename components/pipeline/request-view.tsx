"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, CalendarClock, CalendarPlus, CircleAlert, FileQuestion, Trash2, Workflow } from "lucide-react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { BookingCalendar } from "@/components/pipeline/booking-calendar";
import { MAX_BOOKING_DAYS, useRangePicker } from "@/components/pipeline/book-panel";
import { Countdown } from "@/components/pipeline/countdown";
import { DesignBriefForm, LogisticsBriefForm } from "@/components/pipeline/brief-forms";
import { DetailsForm } from "@/components/pipeline/details-form";
import { DraftSaveProvider } from "@/components/pipeline/draft-autosave";
import { MissingProvider, READ_ONLY, focusField } from "@/components/pipeline/form-kit";
import { PublishPanel } from "@/components/pipeline/publish-panel";
import { RequestProgress } from "@/components/pipeline/request-progress";
import { useDepartmentName, useFormatDateRange } from "@/components/pipeline/shared";
import { DraftBar, MissingList, tabOf, type FormTab } from "@/components/pipeline/submit-bar";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCancelRequest, usePipelineRequest, useRedate } from "@/hooks/use-pipeline";
import { cn } from "@/lib/utils";
import type { EventRequestDetail, PipelineMe } from "@/lib/pipeline-types";

const TAB_PANEL = "bg-card border-border rounded-xl border p-4 sm:p-6 data-[state=inactive]:hidden";

/**
 * One request, top to bottom: what it is, where it stands, what to do now,
 * then the three forms. A draft gets a bar that follows the page with Submit.
 */
export function RequestView({ id, me }: { id: string; me: PipelineMe }) {
  const t = useTranslations("pipeline.request");
  const { data: request, isPending, error } = usePipelineRequest(id);

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }
  if (error || !request) {
    return (
      <Empty className="bg-card border-border rounded-xl border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileQuestion />
          </EmptyMedia>
          <EmptyTitle>{t("notFound")}</EmptyTitle>
          {error ? <EmptyDescription className="text-brand-red-ink">{error.message}</EmptyDescription> : null}
        </EmptyHeader>
        <Button asChild variant="outline">
          <Link href="/pipeline">
            <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
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
  // The dates card already says when dates are what's missing.
  const missing = lostDates ? request.missing.filter((f) => f !== "dates") : request.missing;
  const showMissing = request.can_edit && canAct && (isDraft || (isReturned && missing.length > 0));

  const missingByTab = React.useMemo(() => {
    const counts: Record<FormTab, number> = { details: 0, design: 0, logistics: 0 };
    for (const field of request.missing) {
      const owner = tabOf(field);
      if (owner) counts[owner] += 1;
    }
    return counts;
  }, [request.missing]);

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

  const onIncomplete = (missing: string[]) => {
    setShown(true);
    if (missing[0]) jump(missing[0]);
  };

  return (
    <MissingProvider missing={request.missing} shown={shown}>
      <div className="flex flex-col gap-4 sm:gap-5">
        <RequestHeader request={request} me={me} canAct={canAct} />
        <RequestProgress request={request} />

        {lostDates ? <Redate request={request} me={me} /> : null}
        {isReturned ? <ReturnedNotice request={request} /> : null}
        <PenaltyNote request={request} />
        <TeamActions request={request} />
        <PublishPanel request={request} />

        {showMissing ? (
          <section className="bg-card border-border flex flex-col gap-3 rounded-xl border p-4 sm:p-5">
            {isDraft && request.hold_expires_at && !holdRanOut ? (
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                <CalendarClock className="text-brand-yellow-ink h-4 w-4 shrink-0" />
                <span className="font-medium">{t("holdTitle")}</span>
                <span className="text-muted-foreground">·</span>
                <Countdown until={request.hold_expires_at} serverNow={request.now} />
              </p>
            ) : null}
            <MissingList missing={missing} shown={shown} onJump={jump} />
          </section>
        ) : null}

        <Tabs value={tab} onValueChange={(v) => setTab(v as FormTab)} className="gap-3">
          <TabsList className="w-full justify-start sm:w-fit">
            {(["details", "design", "logistics"] as const).map((key) => (
              <TabsTrigger key={key} value={key} className="gap-1.5">
                {t(`tabs.${key}`)}
                {showMissing && missingByTab[key] ? (
                  <span
                    className={cn(
                      "tabular flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[11px] font-semibold",
                      shown ? "bg-brand-red text-white" : "bg-brand-yellow-soft text-brand-yellow-ink",
                    )}
                  >
                    {missingByTab[key]}
                  </span>
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

        {showBar ? <DraftBar request={request} onIncomplete={onIncomplete} /> : null}
      </div>
    </MissingProvider>
  );
}

function RequestHeader({ request, me, canAct }: { request: EventRequestDetail; me: PipelineMe; canAct: boolean }) {
  const t = useTranslations("pipeline.request");
  const router = useRouter();
  const departmentName = useDepartmentName();
  const formatRange = useFormatDateRange();
  const cancel = useCancelRequest();
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
    departmentName(request.department),
    request.start_date ? formatRange(request.start_date, request.end_date) : t("noDates"),
    t("createdBy", { name: request.created_by.name }),
  ].join(" · ");

  return (
    <div className="flex flex-col gap-2">
      <Link
        href="/pipeline"
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1 text-sm font-medium transition-colors"
      >
        <ArrowLeft className="h-4 w-4 rtl:-scale-x-100" />
        {t("back")}
      </Link>
      <PageHeader title={request.title || t("untitled")} description={meta} icon={Workflow}>
        <StageBadge stage={request.stage} className="max-sm:flex-none" />
        {canCancel ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-brand-red-ink hover:bg-brand-red-soft hover:text-brand-red-ink">
                <Trash2 className="h-4 w-4" />
                {t("cancel")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("cancelTitle")}</AlertDialogTitle>
                <AlertDialogDescription>{t("cancelConfirm")}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("keep")}</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onClick={onCancel} disabled={cancel.isPending}>
                  {t("cancel")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </PageHeader>
    </div>
  );
}

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
    <section
      id="request-dates"
      className="bg-brand-red-soft text-brand-red-ink border-brand-red/30 flex scroll-mt-24 flex-col gap-3 rounded-xl border p-4 sm:p-5"
    >
      <div className="flex items-start gap-3">
        <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-base font-semibold tracking-tight">
            {t(request.undated_reason === "day_banned" ? "lostDatesBanned" : "lostDatesExpired")}
          </h2>
          <p className="text-sm">{t("lostDatesBody")}</p>
        </div>
      </div>
      {open ? (
        <div className="bg-card text-foreground flex flex-col gap-3 rounded-lg p-3 sm:p-4">
          <BookingCalendar
            selected={range.selected}
            onDayClick={range.onDayClick}
            isSelectable={(d) => me.is_super_admin || d.status === "open"}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className={cn("flex-1 text-sm", range.start ? "font-semibold" : "text-muted-foreground")}>
              {range.start
                ? formatRange(range.start, range.end)
                : tb(me.is_super_admin ? "hintSuperAdmin" : "hint", { max: MAX_BOOKING_DAYS })}
            </span>
            <div className="flex gap-2 *:flex-1 sm:*:flex-none">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                {t("redateCancel")}
              </Button>
              <Button onClick={onSave} disabled={!range.start || redate.isPending}>
                <CalendarPlus className="h-4 w-4" />
                {t("redateSave")}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div>
          <Button onClick={() => setOpen(true)}>
            <CalendarPlus className="h-4 w-4" />
            {t("redate")}
          </Button>
        </div>
      )}
    </section>
  );
}
