"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, ClipboardCheck, CornerUpLeft, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Countdown } from "@/components/pipeline/countdown";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useCompleteTask, useReturnRequest } from "@/hooks/use-pipeline";
import type { EventRequestDetail, PipelineTeam } from "@/lib/pipeline-types";

/**
 * The caller's team's turn: mark its part done, or (Design, once, early on)
 * send the request back with notes. Nothing renders when it is not their turn.
 * Design finishes with its poster (design-poster) and Logistics by confirming
 * the event (logistics-confirmation), so only Media's button is left here.
 */
export function TeamActions({ request }: { request: EventRequestDetail }) {
  const t = useTranslations("pipeline.review");
  const tt = useTranslations("pipeline.teams");
  const locale = useLocale();
  const complete = useCompleteTask(request.id);
  const [returning, setReturning] = React.useState(false);
  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });
  const teams = request.actions.complete.filter((team) => team === "media");
  const canReturn = request.actions.can_return;

  if (!teams.length && !canReturn) return null;

  const onComplete = async (team: PipelineTeam) => {
    try {
      await complete.mutateAsync(team);
      toast.success(t("marked"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("failed"));
    }
  };

  return (
    <section className="bg-card border-brand-blue/30 flex flex-col gap-4 rounded-xl border p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="bg-brand-blue-soft text-brand-blue-ink flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
          <ClipboardCheck className="h-[18px] w-[18px]" />
        </span>
        <div className="flex flex-col gap-0.5">
          <h2 className="font-display text-base font-semibold tracking-tight">{t("yourTurn")}</h2>
          <p className="text-muted-foreground text-[13px]">{t("yourTurnHint")}</p>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {teams.map((team) => (
          <Button key={team} onClick={() => onComplete(team)} disabled={complete.isPending}>
            <CheckCircle2 className="h-4 w-4" />
            {t("markTeamDone", { team: tt(team) })}
          </Button>
        ))}
        {canReturn ? (
          <Button variant="outline" onClick={() => setReturning(true)}>
            <CornerUpLeft className="h-4 w-4" />
            {t("return")}
          </Button>
        ) : null}
        {canReturn && request.return_deadline ? (
          <span className="text-muted-foreground text-xs sm:ms-1">
            {t("returnUntil", { date: formatter.format(new Date(request.return_deadline)) })}
          </span>
        ) : null}
      </div>
      <ReturnDialog request={request} open={returning} onOpenChange={setReturning} />
    </section>
  );
}

/** Design sent it back: the notes, the clock, and any late penalty. */
export function ReturnedNotice({ request }: { request: EventRequestDetail }) {
  const t = useTranslations("pipeline.review");
  return (
    <section className="bg-brand-red-soft text-brand-red-ink border-brand-red/30 flex flex-col gap-3 rounded-xl border p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <CornerUpLeft className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="font-display text-base font-semibold tracking-tight">{t("returnedTitle")}</h2>
          {request.return_due_at ? (
            <span className="text-sm">
              {t("fixWithin")} <Countdown until={request.return_due_at} serverNow={request.now} />
            </span>
          ) : null}
        </div>
      </div>
      {request.return_notes ? (
        <blockquote className="bg-card text-foreground rounded-lg px-4 py-3 text-sm whitespace-pre-wrap">
          {request.return_notes}
        </blockquote>
      ) : null}
      <p className="text-sm">{t("returnedHint")}</p>
    </section>
  );
}

/** A late fix costs points, taken at publish. */
export function PenaltyNote({ request }: { request: EventRequestDetail }) {
  const t = useTranslations("pipeline.review");
  if (!request.penalty) return null;
  return (
    <p className="bg-brand-red-soft text-brand-red-ink flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm">
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
      {t("penalty", { points: request.penalty.points, days: request.penalty.late_days })}
    </p>
  );
}

function ReturnDialog({
  request,
  open,
  onOpenChange,
}: {
  request: EventRequestDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("pipeline.review");
  const [notes, setNotes] = React.useState("");
  const mutation = useReturnRequest(request.id);

  const onConfirm = async () => {
    try {
      await mutation.mutateAsync(notes.trim());
      toast.success(t("returned"));
      onOpenChange(false);
      setNotes("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("failed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("returnTitle")}</DialogTitle>
          <DialogDescription>{t("returnHint")}</DialogDescription>
        </DialogHeader>
        <Textarea rows={5} autoFocus value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("notesPlaceholder")} />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={onConfirm} disabled={!notes.trim() || mutation.isPending}>
            <CornerUpLeft className="h-4 w-4" />
            {t("returnConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
