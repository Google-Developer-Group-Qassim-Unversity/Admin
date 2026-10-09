"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ExternalLink, PartyPopper, Rocket, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Door, DoorPanel } from "@/components/najdi";
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
import { isolate } from "@/lib/format";

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
      <Door tone="green" aria-label={t("published")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="flex items-center gap-2.5 text-[15px] font-bold">
            <PartyPopper className="size-5 shrink-0" />
            {t("done", { id: request.event_id })}
          </span>
          {can("events.view") ? (
            <Button asChild variant="outline" className="text-on-door shadow-[inset_0_0_0_1.5px_currentColor] hover:bg-white/12">
              <Link href={`/events/${request.event_id}`}>
                <ExternalLink />
                {t("open")}
              </Link>
            </Button>
          ) : null}
        </div>
      </Door>
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
    <Door tone="ochre" aria-labelledby="publish-title">
      <h2 id="publish-title" className="font-display text-[21px] leading-tight font-semibold">
        {t("title")}
      </h2>
      <p className="text-sm font-medium">{t("hint")}</p>

      {/* What will go live, as the teams handed it over. */}
      <DoorPanel className="flex-row items-center gap-3">
        {posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- an R2 URL, shown as uploaded
          <img src={posterUrl} alt="" className="size-16 shrink-0 rounded-sm object-cover shadow-[0_0_0_1px_var(--door-panel-rule)]" />
        ) : null}
        <div className="flex min-w-0 flex-col gap-0.5">
          <bdi className="truncate text-[15px] font-bold">{request.title}</bdi>
          {summary.length ? <span className="tabular text-[13px] opacity-80">{summary.map(String).map(isolate).join(" · ")}</span> : null}
          {!posterUrl ? <span className="text-door-madder-ink text-[13px] font-medium">{t("noPoster")}</span> : null}
        </div>
      </DoorPanel>

      <div className="flex">
        <Button variant="green" size="lg" className="max-sm:flex-1" onClick={() => setAsking(true)} disabled={publish.isPending}>
          <Rocket />
          {t("button")}
        </Button>
      </div>

      <AlertDialog open={asking} onOpenChange={onOpenChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <TriangleAlert className="text-door-madder-ink size-5 shrink-0" />
              {t("confirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="flex flex-col gap-2">
                <p>{t("confirmBody")}</p>
                <p className="text-foreground font-medium">{t("confirmFinal")}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex min-h-11 items-start gap-2.5">
            <Checkbox id="publish-checked" checked={checked} onCheckedChange={(v) => setChecked(v === true)} className="mt-0.5" />
            <Label htmlFor="publish-checked" className="text-sm leading-snug font-normal">
              {t("confirmCheck")}
            </Label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("confirmCancel")}</AlertDialogCancel>
            <Button variant="green" onClick={onPublish} disabled={!checked || publish.isPending}>
              <Rocket />
              {t("confirmButton")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Door>
  );
}
