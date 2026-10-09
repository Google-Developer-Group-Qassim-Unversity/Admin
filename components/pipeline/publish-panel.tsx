"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ExternalLink, PartyPopper, Rocket, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { useFormatDateRange } from "@/components/pipeline/shared";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { usePublishRequest } from "@/hooks/use-pipeline";
import { useAccess } from "@/hooks/use-access";
import type { EventRequestDetail, LogisticsConfirmation } from "@/lib/pipeline-types";

const hhmm = (time: string | null | undefined) => time?.slice(0, 5) ?? "";

/**
 * The last step. Nothing is typed here: the event is built from the request
 * and what the teams handed over, and goes live the moment it is published,
 * with no admin review after it. So the button asks first, in plain words.
 */
export function PublishPanel({ request }: { request: EventRequestDetail }) {
  const t = useTranslations("pipeline.publish");
  const { can } = useAccess();
  const publish = usePublishRequest(request.id);
  const formatRange = useFormatDateRange();
  const [asking, setAsking] = React.useState(false);
  const [checked, setChecked] = React.useState(false);

  if (request.stage === "published" && request.event_id) {
    return (
      <section className="bg-brand-green-soft text-brand-green-ink border-brand-green/30 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 sm:p-5">
        <span className="flex items-center gap-2.5 text-sm font-medium">
          <PartyPopper className="h-5 w-5 shrink-0" />
          {t("done", { id: request.event_id })}
        </span>
        {can("events.view") ? (
          <Button asChild variant="outline" size="sm">
            <Link href={`/events/${request.event_id}`}>
              <ExternalLink className="h-4 w-4" />
              {t("open")}
            </Link>
          </Button>
        ) : null}
      </section>
    );
  }
  if (!request.actions.can_publish) return null;

  const confirmed = request.tasks.find((x) => x.team === "logistics")?.deliverable as LogisticsConfirmation | null;
  const posterUrl = request.tasks.find((x) => x.team === "design")?.deliverable?.poster_url as string | undefined;
  const modes = new Set(Object.values(confirmed?.day_modes ?? {}));
  const place = [confirmed?.venue, confirmed?.room].filter(Boolean).join(" · ");
  const summary = [
    confirmed?.start_date ? formatRange(confirmed.start_date, confirmed.end_date) : null,
    confirmed?.daily_start_time ? `${hhmm(confirmed.daily_start_time)}–${hhmm(confirmed.daily_end_time)}` : null,
    modes.has("on_site") ? place : null,
    modes.has("online") ? t("online") : null,
  ].filter(Boolean);

  const onOpenChange = (open: boolean) => {
    setAsking(open);
    if (!open) setChecked(false);
  };

  const onPublish = async () => {
    try {
      await publish.mutateAsync();
      toast.success(t("published"));
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("failed"));
    }
  };

  return (
    <section className="bg-card border-brand-green/40 flex flex-col gap-4 rounded-xl border p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="bg-brand-green-soft text-brand-green-ink flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
          <Rocket className="h-[18px] w-[18px]" />
        </span>
        <div className="flex flex-col gap-0.5">
          <h2 className="font-display text-base font-semibold tracking-tight">{t("title")}</h2>
          <p className="text-muted-foreground text-[13px]">{t("hint")}</p>
        </div>
      </div>

      <div className="bg-muted/40 flex items-center gap-3 rounded-lg p-3">
        {posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- an R2 URL, shown as uploaded
          <img src={posterUrl} alt="" className="h-16 w-16 shrink-0 rounded-md border object-cover" />
        ) : null}
        <div className="flex min-w-0 flex-col gap-0.5">
          <span className="truncate text-sm font-semibold">{request.title}</span>
          <span className="text-muted-foreground text-xs">{summary.join(" · ")}</span>
          {!posterUrl ? <span className="text-brand-yellow-ink text-xs">{t("noPoster")}</span> : null}
        </div>
      </div>

      <div className="flex">
        <Button className="max-sm:flex-1" onClick={() => setAsking(true)} disabled={publish.isPending}>
          <Rocket className="h-4 w-4" />
          {t("button")}
        </Button>
      </div>

      <AlertDialog open={asking} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <TriangleAlert className="text-brand-red-ink h-5 w-5 shrink-0" />
              {t("confirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="flex flex-col gap-2">
                <p>{t("confirmBody")}</p>
                <p className="text-foreground font-medium">{t("confirmFinal")}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-start gap-2.5">
            <Checkbox id="publish-checked" checked={checked} onCheckedChange={(v) => setChecked(v === true)} />
            <Label htmlFor="publish-checked" className="text-sm leading-snug font-normal">
              {t("confirmCheck")}
            </Label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("confirmCancel")}</AlertDialogCancel>
            <Button onClick={onPublish} disabled={!checked || publish.isPending}>
              <Rocket className="h-4 w-4" />
              {t("confirmButton")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
