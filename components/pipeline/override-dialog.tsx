"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { CalendarX2, Mail, RotateCcw, Trash2 } from "lucide-react";

import { Plate } from "@/components/najdi";
import { useDepartmentName, useFormatDateRange } from "@/components/pipeline/shared";
import { StageBadge } from "@/components/status-badge";
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
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useApi } from "@/lib/api/client";
import type { BumpOutcome, PipelineMe, PipelineOverlaps } from "@/lib/pipeline-types";

type Run = (bumps: Record<string, BumpOutcome>) => Promise<void>;

/**
 * Booking over other requests. A super admin's booking first asks which
 * requests hold those days; when some do, the booking waits for the warning
 * below, where each one is rescheduled or deleted. Everyone else, and a
 * booking that bumps nothing, goes straight through.
 *
 *   const { guard, dialog } = useBookOver(me);
 *   guard(start, end, ignoreId, (bumps) => book.mutateAsync({ ..., bumps }));
 */
export function useBookOver(me: PipelineMe) {
  const api = useApi();
  const [pending, setPending] = React.useState<{ overlaps: PipelineOverlaps; run: Run } | null>(null);

  const guard = async (start: string, end: string, ignore: string | undefined, run: Run) => {
    if (!me.is_super_admin) return run({});
    const overlaps = await api.pipeline.overlaps(start, end, ignore);
    if (overlaps.requests.length === 0) return run({});
    setPending({ overlaps, run });
  };

  const dialog = pending ? (
    <OverrideDialog overlaps={pending.overlaps} run={pending.run} onClose={() => setPending(null)} />
  ) : null;
  return { guard, dialog };
}

function OverrideDialog({ overlaps, run, onClose }: { overlaps: PipelineOverlaps; run: Run; onClose: () => void }) {
  const t = useTranslations("pipeline.override");
  const [choices, setChoices] = React.useState<Record<string, BumpOutcome>>({});
  const [busy, setBusy] = React.useState(false);
  const published = overlaps.requests.some((o) => o.request.stage === "published");
  const decided = overlaps.requests.every((o) => choices[o.request.id]);

  const onConfirm = async () => {
    setBusy(true);
    try {
      await run(choices);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <AlertDialog open onOpenChange={(open) => !open && !busy && onClose()}>
      <AlertDialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {published ? t("publishedTitle") : t("title", { count: overlaps.requests.length })}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-foreground font-medium">
            {published ? t("publishedBody") : t("warning")}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {published ? null : (
          <ul className="flex flex-col gap-3">
            {overlaps.requests.map((entry) => (
              <Bumped
                key={entry.request.id}
                entry={entry}
                choice={choices[entry.request.id]}
                onChoose={(outcome) => setChoices((c) => ({ ...c, [entry.request.id]: outcome }))}
                disabled={busy}
              />
            ))}
          </ul>
        )}
        {published || overlaps.emails_live ? null : <p className="text-ink-2 text-[13px]">{t("trial")}</p>}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{t("keep")}</AlertDialogCancel>
          {published ? null : (
            <Button variant="madder" onClick={onConfirm} disabled={!decided || busy}>
              <CalendarX2 />
              {t("confirm")}
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** One request losing its days: what it is, the choice, and who gets the email. */
function Bumped({
  entry,
  choice,
  onChoose,
  disabled,
}: {
  entry: PipelineOverlaps["requests"][number];
  choice: BumpOutcome | undefined;
  onChoose: (outcome: BumpOutcome) => void;
  disabled: boolean;
}) {
  const t = useTranslations("pipeline.override");
  const departmentName = useDepartmentName();
  const formatRange = useFormatDateRange();
  const [showNames, setShowNames] = React.useState(false);
  const { request, recipients } = entry;
  const department = departmentName(request.department);

  return (
    <li className="ring-rule flex flex-col gap-3 rounded-lg p-3 ring-1">
      <div className="flex items-start gap-3">
        <Plate tone="madder" icon={CalendarX2} size="sm" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <b className="truncate text-sm font-bold">{request.title || t("untitled")}</b>
          <span className="text-ink-2 text-[13px]">
            {department}
            {request.start_date ? ` · ${formatRange(request.start_date, request.end_date ?? request.start_date)}` : ""}
          </span>
          <StageBadge stage={request.stage} className="self-start" />
        </div>
      </div>

      <SegmentedControl
        label={t("choose")}
        value={choice ?? ""}
        onValueChange={(v) => onChoose(v as BumpOutcome)}
        options={[
          { value: "reschedule", label: t("reschedule"), icon: RotateCcw },
          { value: "cancel", label: t("delete"), icon: Trash2 },
        ]}
        disabled={disabled}
      />
      <p className="text-ink-2 text-[13px] text-pretty">
        {choice === "cancel" ? t("deleteBody") : choice === "reschedule" ? t("rescheduleBody") : t("chooseHint")}
      </p>

      <div className="bg-sunk flex flex-col gap-1.5 rounded-md p-2.5 text-[13px]">
        <span className="flex items-start gap-2">
          <Mail className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{t("email", { count: recipients.length, department })}</span>
        </span>
        {recipients.length > 0 ? (
          <>
            <button
              type="button"
              className="text-ink-2 hover:text-foreground self-start ps-6 font-bold underline underline-offset-3"
              aria-expanded={showNames}
              onClick={() => setShowNames((s) => !s)}
            >
              {showNames ? t("showLess") : t("showMore")}
            </button>
            {showNames ? (
              <ul className="text-ink-2 flex flex-col gap-0.5 ps-6">
                {recipients.map((person) => (
                  <li key={person.member_id}>{person.name}</li>
                ))}
              </ul>
            ) : null}
          </>
        ) : null}
      </div>
    </li>
  );
}
