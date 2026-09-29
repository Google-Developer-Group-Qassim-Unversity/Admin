"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, CornerUpLeft, Send } from "lucide-react";
import { toast } from "sonner";

import { Countdown } from "@/components/pipeline/countdown";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { useCompleteTask, useResubmit, useReturnRequest } from "@/hooks/use-pipeline";
import type { EventRequestDetail } from "@/lib/pipeline-types";

/** Progress of each team, and the steps the caller can take now. */
export function TeamActions({ request }: { request: EventRequestDetail }) {
  const t = useTranslations("pipeline.review");
  const tt = useTranslations("pipeline.teams");
  const locale = useLocale();
  const complete = useCompleteTask(request.id);
  const resubmit = useResubmit(request.id);
  const [returning, setReturning] = React.useState(false);
  const formatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" });

  const run = async (fn: () => Promise<unknown>, success: string) => {
    try {
      await fn();
      toast.success(success);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("failed"));
    }
  };

  if (request.stage === "draft") return null;

  return (
    <section className="bg-card border-border flex flex-col gap-4 rounded-xl border p-5">
      <h3 className="font-display text-base font-semibold tracking-tight">{t("title")}</h3>

      {request.stage === "returned" ? (
        <Alert variant="destructive">
          <CornerUpLeft className="h-4 w-4" />
          <AlertTitle>{t("returnedTitle")}</AlertTitle>
          <AlertDescription>
            <div className="flex w-full flex-col gap-2">
              <p className="whitespace-pre-wrap">{request.return_notes}</p>
              {request.return_due_at ? (
                <span>
                  {t("fixWithin")} <Countdown until={request.return_due_at} serverNow={request.now} />
                </span>
              ) : null}
              {request.actions.can_resubmit ? (
                <div>
                  <Button onClick={() => run(() => resubmit.mutateAsync(), t("resubmitted"))} disabled={resubmit.isPending}>
                    <Send className="h-4 w-4 rtl:-scale-x-100" />
                    {t("resubmit")}
                  </Button>
                </div>
              ) : null}
            </div>
          </AlertDescription>
        </Alert>
      ) : null}

      {request.penalty ? (
        <p className="bg-brand-red-soft text-brand-red-ink rounded-lg px-3 py-2 text-sm">
          {t("penalty", { points: request.penalty.points, days: request.penalty.late_days })}
        </p>
      ) : null}

      <ul className="grid gap-2 sm:grid-cols-3">
        {request.tasks.map((task) => (
          <li key={task.team} className="border-border flex flex-col gap-2 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">{tt(task.team)}</span>
              <span className="text-muted-foreground text-xs">{t(`status.${task.status}`)}</span>
            </div>
            {task.completed_by ? (
              <span className="text-muted-foreground text-xs">
                {t("doneBy", { name: task.completed_by.name })}
              </span>
            ) : null}
            {request.actions.complete.includes(task.team) ? (
              <Button
                size="sm"
                onClick={() => run(() => complete.mutateAsync(task.team), t("marked"))}
                disabled={complete.isPending}
              >
                <CheckCircle2 className="h-4 w-4" />
                {t("markDone")}
              </Button>
            ) : null}
            {task.team === "design" && request.actions.can_return ? (
              <Button size="sm" variant="outline" onClick={() => setReturning(true)}>
                <CornerUpLeft className="h-4 w-4" />
                {t("return")}
              </Button>
            ) : null}
            {task.team === "design" && request.actions.can_return && request.return_deadline ? (
              <span className="text-muted-foreground text-xs">
                {t("returnUntil", { date: formatter.format(new Date(request.return_deadline)) })}
              </span>
            ) : null}
          </li>
        ))}
      </ul>

      <ReturnDialog request={request} open={returning} onOpenChange={setReturning} />
    </section>
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
        <Textarea rows={5} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("notesPlaceholder")} />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={onConfirm} disabled={!notes.trim() || mutation.isPending}>
            {t("return")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
