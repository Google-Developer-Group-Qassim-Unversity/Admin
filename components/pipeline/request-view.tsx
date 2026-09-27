"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowLeft, CalendarClock, CalendarPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { BookingCalendar } from "@/components/pipeline/booking-calendar";
import { MAX_BOOKING_DAYS, useRangePicker } from "@/components/pipeline/book-panel";
import { Countdown } from "@/components/pipeline/countdown";
import { DetailsForm } from "@/components/pipeline/details-form";
import { useDepartmentName } from "@/components/pipeline/shared";
import { StageBadge } from "@/components/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCancelRequest, usePipelineRequest, useRedate } from "@/hooks/use-pipeline";
import type { EventRequestDetail, PipelineMe } from "@/lib/pipeline-types";

export function RequestView({ id, me }: { id: number; me: PipelineMe }) {
  const t = useTranslations("pipeline.request");
  const { data: request, isPending, error } = usePipelineRequest(id);

  if (isPending) return <Skeleton className="h-96 w-full rounded-xl" />;
  if (error || !request) {
    return <p className="text-brand-red-ink text-sm">{error?.message ?? t("notFound")}</p>;
  }

  return (
    <div className="flex flex-col gap-5">
      <RequestHeader request={request} me={me} />
      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">{t("tabs.details")}</TabsTrigger>
        </TabsList>
        <TabsContent value="details" className="bg-card border-border rounded-xl border p-5">
          <DetailsForm request={request} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function RequestHeader({ request, me }: { request: EventRequestDetail; me: PipelineMe }) {
  const t = useTranslations("pipeline.request");
  const router = useRouter();
  const departmentName = useDepartmentName();
  const cancel = useCancelRequest();
  const canAct = me.is_super_admin || me.departments.some((d) => d.id === request.department.id);
  const isDraft = request.stage === "draft";

  const onCancel = async () => {
    if (!window.confirm(t("cancelConfirm"))) return;
    try {
      await cancel.mutateAsync(request.id);
      toast.success(t("cancelled"));
      router.push("/pipeline");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("failed"));
    }
  };

  return (
    <section className="bg-card border-border flex flex-col gap-4 rounded-xl border p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Link href="/pipeline" className="text-muted-foreground flex items-center gap-1 text-xs hover:underline">
            <ArrowLeft className="h-3.5 w-3.5 rtl:-scale-x-100" />
            {t("back")}
          </Link>
          <h2 className="font-display truncate text-xl font-semibold tracking-tight">
            {request.title || t("untitled")}
          </h2>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span>{departmentName(request.department)}</span>
            <span className="tabular">
              {request.start_date ? `${request.start_date} → ${request.end_date}` : t("noDates")}
            </span>
            <span>{t("createdBy", { name: request.created_by.name })}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StageBadge stage={request.stage} />
          {canAct && (isDraft || me.is_super_admin) && request.stage !== "published" ? (
            <Button variant="ghost" size="sm" onClick={onCancel} disabled={cancel.isPending}>
              <Trash2 className="h-4 w-4" />
              {t("cancel")}
            </Button>
          ) : null}
        </div>
      </div>

      {isDraft && request.hold_expires_at ? (
        <Alert>
          <CalendarClock className="h-4 w-4" />
          <AlertTitle>{t("holdTitle")}</AlertTitle>
          <AlertDescription>
            <span>
              {t("holdBody")} <Countdown until={request.hold_expires_at} serverNow={request.now} />
            </span>
          </AlertDescription>
        </Alert>
      ) : null}

      {!request.start_date && canAct && request.stage !== "published" ? <Redate request={request} me={me} /> : null}
    </section>
  );
}

function Redate({ request, me }: { request: EventRequestDetail; me: PipelineMe }) {
  const t = useTranslations("pipeline.request");
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
    <Alert variant="destructive">
      <CalendarPlus className="h-4 w-4" />
      <AlertTitle>{t(request.undated_reason === "day_banned" ? "lostDatesBanned" : "lostDatesExpired")}</AlertTitle>
      <AlertDescription>
        <div className="flex w-full flex-col gap-3">
          <span>{t("lostDatesBody")}</span>
          {open ? (
            <>
              <BookingCalendar
                selected={range.selected}
                onDayClick={range.onDayClick}
                isSelectable={(d) => me.is_super_admin || d.status === "open"}
              />
              <div className="flex gap-2">
                <Button onClick={onSave} disabled={!range.start || redate.isPending}>
                  {t("redateSave")}
                </Button>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  {t("redateCancel")}
                </Button>
              </div>
            </>
          ) : (
            <div>
              <Button variant="outline" onClick={() => setOpen(true)}>
                {t("redate")}
              </Button>
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
