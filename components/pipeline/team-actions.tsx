"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle2, ClipboardCheck, CornerUpLeft, Timer, TriangleAlert } from "lucide-react";
import { toast } from "sonner";

import { Door, DoorPanel } from "@/components/najdi";
import { Countdown } from "@/components/pipeline/countdown";
import { BehalfFrame, useBehalfOf } from "@/components/pipeline/roles";
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
import { intlLocale, isolate } from "@/lib/format";

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
  const formatter = new Intl.DateTimeFormat(intlLocale(locale), { dateStyle: "medium", timeStyle: "short" });
  const teams = request.actions.complete.filter((team) => team === "media");
  const canReturn = request.actions.can_return;

  const behalf = useBehalfOf(teams[0] ? { kind: "team", team: teams[0] } : null);

  if (!teams.length && !canReturn) return null;
  // On Design's turn the poster's door carries "Return with notes" too: one door, not two.
  if (!teams.length && request.actions.complete.includes("design")) return null;

  const formatTeams = teams.map((team) => tt(team)).join(" · ");

  if (behalf) {
    return (
      <BehalfFrame
        party={behalf}
        aria-labelledby="team-turn"
        title={<span id="team-turn">{t("teamTurn", { team: formatTeams })}</span>}
        note={t("teamTurnFor", { team: isolate(formatTeams) })}
        actions={<TeamActionButtons request={request} onWall />}
      />
    );
  }

  return (
    <Door tone="ochre" aria-labelledby="team-turn">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="team-turn" className="font-display text-[21px] leading-tight font-semibold">
          {t("yourTurn")}
        </h2>
        {formatTeams ? (
          <span className="bg-on-door-ochre text-white inline-flex h-7 items-center gap-1.5 rounded-sm px-2.5 text-[13px] font-bold">
            <ClipboardCheck className="size-4" />
            {formatTeams}
          </span>
        ) : null}
      </div>
      <DoorPanel>
        <p className="text-sm font-medium">{t("yourTurnHint")}</p>
        {canReturn && request.return_deadline ? (
          <p className="mt-1 flex items-center gap-1.5 text-[13px] font-bold">
            <CornerUpLeft className="size-4 shrink-0" />
            {t("returnUntil", { date: formatter.format(new Date(request.return_deadline)) })}
          </p>
        ) : null}
      </DoorPanel>
      <TeamActionButtons request={request} />
    </Door>
  );
}

/**
 * The buttons alone, for an ochre door that is already open: one green
 * "Mark <team> done" per team whose turn it is, and "Return with notes" when
 * Design still may. Shared by the request view and the dashboard's door.
 */
export function TeamActionButtons({
  request,
  onWall = false,
  teams: only,
}: {
  request: EventRequestDetail;
  /** Drawn on the wall (a super admin's frame) rather than on an ochre door. */
  onWall?: boolean;
  /** Only these teams' buttons (the reader's own), when some are not theirs to press. */
  teams?: PipelineTeam[];
}) {
  const t = useTranslations("pipeline.review");
  const tt = useTranslations("pipeline.teams");
  const complete = useCompleteTask(request.id);
  const [returning, setReturning] = React.useState(false);
  // Design finishes with its poster (design-poster) and Logistics by
  // confirming the event (logistics-confirmation), so only Media's button is
  // left here.
  const teams = request.actions.complete.filter((team) => team === "media" && (!only || only.includes(team)));
  const canReturn = request.actions.can_return && (!only || only.includes("design"));

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
    <div className="grid gap-2 sm:flex sm:flex-wrap">
      {teams.map((team) => (
        <Button key={team} variant="green" size="lg" onClick={() => onComplete(team)} disabled={complete.isPending}>
          <CheckCircle2 />
          {t("markTeamDone", { team: tt(team) })}
        </Button>
      ))}
      {canReturn ? (
        <Button
          variant="outline"
          size="lg"
          className={onWall ? undefined : "text-on-door-ochre shadow-[inset_0_0_0_1.5px_currentColor] hover:bg-black/8"}
          onClick={() => setReturning(true)}
        >
          <CornerUpLeft />
          {t("return")}
        </Button>
      ) : null}
      <ReturnDialog request={request} open={returning} onOpenChange={setReturning} onBehalf={onWall} />
    </div>
  );
}

/** Design sent it back: the notes, the clock, and what to do. */
export function ReturnedNotice({ request }: { request: EventRequestDetail }) {
  const t = useTranslations("pipeline.review");
  const behalf = useBehalfOf({ kind: "department", department: request.department });
  const clock = request.return_due_at ? (
    <Countdown until={request.return_due_at} serverNow={request.now} format="clock" plain className="text-[15px]" />
  ) : null;

  if (behalf) {
    return (
      <BehalfFrame
        party={behalf}
        aria-labelledby="returned-title"
        title={<span id="returned-title">{t("returnedTitleFor")}</span>}
        note={
          clock ? (
            <span className="inline-flex flex-wrap items-center gap-x-1.5">
              {t("fixWithinFor")}
              <span className="text-foreground font-bold">{clock}</span>
            </span>
          ) : undefined
        }
      >
        {request.return_notes ? (
          <blockquote className="bg-door-madder-soft text-door-madder-ink rounded-sm px-3.5 py-3 text-[15px] leading-relaxed font-medium whitespace-pre-wrap">
            {request.return_notes}
          </blockquote>
        ) : null}
      </BehalfFrame>
    );
  }

  return (
    <Door tone="madder" aria-labelledby="returned-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="returned-title" className="font-display text-[21px] leading-tight font-semibold">
          {t("returnedTitle")}
        </h2>
        {clock ? (
          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium">
            <Timer className="size-4" />
            {t("fixWithin")}
            {clock}
          </span>
        ) : null}
      </div>
      {request.return_notes ? (
        <DoorPanel>
          <blockquote className="text-[15px] leading-relaxed font-medium whitespace-pre-wrap">{request.return_notes}</blockquote>
        </DoorPanel>
      ) : null}
      <p className="text-sm font-medium">{t("returnedHint")}</p>
    </Door>
  );
}

/** A late fix costs points, taken at publish. */
export function PenaltyNote({ request }: { request: EventRequestDetail }) {
  const t = useTranslations("pipeline.review");
  if (!request.penalty) return null;
  return (
    <p className="bg-door-madder-soft text-door-madder-ink flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm font-medium">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" />
      {t("penalty", { points: request.penalty.points, days: request.penalty.late_days })}
    </p>
  );
}

function ReturnDialog({
  request,
  open,
  onOpenChange,
  onBehalf = false,
}: {
  request: EventRequestDetail;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** A super admin returning it for Design. */
  onBehalf?: boolean;
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
          {onBehalf ? <p className="text-door-madder-ink text-sm font-medium">{t("returnFor")}</p> : null}
        </DialogHeader>
        <Textarea rows={5} autoFocus value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("notesPlaceholder")} />
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button variant="madder" onClick={onConfirm} disabled={!notes.trim() || mutation.isPending}>
            <CornerUpLeft />
            {t("returnConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
