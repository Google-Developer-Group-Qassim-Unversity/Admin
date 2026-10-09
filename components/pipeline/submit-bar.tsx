"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { CircleCheck, Clock, ListTodo, Send } from "lucide-react";
import { toast } from "sonner";

import { DraftSaveStatus, useDraftSave } from "@/components/pipeline/draft-autosave";
import { Button } from "@/components/ui/button";
import { pipelineKeys, useResubmit, useSubmitRequest } from "@/hooks/use-pipeline";
import { cn } from "@/lib/utils";
import type { EventRequestDetail } from "@/lib/pipeline-types";

const COLLAPSED = 8;

export type FormTab = "details" | "design" | "logistics";

/** Which tab a missing field lives on; `dates` lives on none. */
export function tabOf(field: string): FormTab | null {
  const prefix = field.split(".")[0];
  return prefix === "details" || prefix === "design" || prefix === "logistics" ? prefix : null;
}

export function useFieldLabel() {
  const tf = useTranslations("pipeline.fields");
  return (field: string) => {
    const key = field.replace(".", "_");
    return tf.has(key) ? tf(key) : field;
  };
}

/**
 * What submit still needs, as chips that jump to the field. Yellow while it is
 * just "to do"; red once submit was tried.
 */
export function MissingList({
  missing,
  shown,
  onJump,
}: {
  missing: string[];
  shown: boolean;
  onJump: (field: string) => void;
}) {
  const t = useTranslations("pipeline.submit");
  const label = useFieldLabel();
  const [expanded, setExpanded] = React.useState(false);
  const visible = expanded ? missing : missing.slice(0, COLLAPSED);

  if (!missing.length) {
    return (
      <p className="text-door-green-ink flex items-center gap-1.5 text-sm font-bold">
        <CircleCheck className="size-4" />
        {t("complete")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <span className={cn("text-sm font-bold", shown ? "text-door-madder-ink" : "text-door-ochre-ink")}>
        {t("stillMissing", { count: missing.length })}
      </span>
      <ul className="flex flex-wrap gap-1.5">
        {visible.map((field) => (
          <li key={field}>
            <button
              type="button"
              onClick={() => onJump(field)}
              className={cn(
                "inline-flex min-h-8 items-center rounded-sm px-2.5 text-[13px] font-bold transition-colors outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring pointer-coarse:min-h-10",
                shown ? "bg-door-madder-soft text-door-madder-ink" : "bg-door-ochre-soft text-door-ochre-ink",
              )}
            >
              {label(field)}
            </button>
          </li>
        ))}
        {missing.length > visible.length ? (
          <li>
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="text-ink-2 hover:text-foreground inline-flex min-h-8 items-center rounded-sm px-2.5 text-[13px] font-bold underline-offset-2 hover:underline pointer-coarse:min-h-10"
            >
              {t("more", { count: missing.length - visible.length })}
            </button>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

/**
 * The bar that follows a draft (or a returned request) down the page: whether
 * everything is saved, "Finish later", and Submit. Submit stays pressable when
 * something is missing - pressing it shows what, instead of a dead button.
 */
export function DraftBar({
  request,
  onIncomplete,
}: {
  request: EventRequestDetail;
  onIncomplete: (missing: string[]) => void;
}) {
  const t = useTranslations("pipeline.submit");
  const tr = useTranslations("pipeline.review");
  const router = useRouter();
  const queryClient = useQueryClient();
  const submit = useSubmitRequest(request.id);
  const resubmit = useResubmit(request.id);
  const { flushAll, state } = useDraftSave();
  const isReturned = request.stage === "returned";
  const busy = state === "saving" || submit.isPending || resubmit.isPending;

  const onSubmit = async () => {
    // Anything still waiting to autosave goes in first, so submit checks what is on screen.
    if (!(await flushAll())) return;
    // The saves just refreshed the request; this render's copy may be older.
    const fresh = queryClient.getQueryData<EventRequestDetail>(pipelineKeys.request(request.id)) ?? request;
    if (fresh.missing.length) {
      onIncomplete(fresh.missing);
      toast.error(t("incomplete", { count: fresh.missing.length }));
      return;
    }
    try {
      if (isReturned) {
        await resubmit.mutateAsync();
        toast.success(tr("resubmitted"));
      } else {
        await submit.mutateAsync();
        toast.success(t("sent"));
      }
    } catch (error) {
      onIncomplete(request.missing);
      toast.error(error instanceof Error ? error.message : t("failed"));
    }
  };

  const onFinishLater = async () => {
    if (!(await flushAll())) {
      toast.error(t("finishLaterFailed"));
      return;
    }
    toast.success(request.hold_expires_at ? t("finishLaterSavedHold") : t("finishLaterSaved"));
    router.push("/pipeline");
  };

  const left = request.missing.length;

  // On a phone this is one line above the bottom bar, so the form keeps the
  // screen: a short count, Finish later and Submit. Wider screens get the full
  // sentence and the autosave status.
  return (
    <div className="bg-card border-foreground z-30 flex items-center gap-2 border-t px-3 py-2.5 max-md:fixed max-md:inset-x-0 max-md:bottom-[calc(4rem+env(safe-area-inset-bottom))] md:sticky md:bottom-4 md:gap-4 md:rounded-xl md:border-0 md:px-5 md:py-3 md:shadow-[0_10px_24px_-14px_rgb(58_42_31/0.55)] md:ring-1 md:ring-rule">
      <div className="flex min-w-0 flex-1 flex-wrap items-center justify-between gap-x-3 gap-y-1">
        {left ? (
          <p className="text-door-ochre-ink flex min-w-0 items-center gap-1.5 text-[13px] font-bold md:gap-2 md:text-sm">
            <ListTodo className="size-[18px] shrink-0" />
            <span className="md:hidden">{t("leftShort", { count: left })}</span>
            <span className="max-md:hidden">{t("stillMissing", { count: left })}</span>
          </p>
        ) : (
          <p className="text-door-green-ink flex min-w-0 items-center gap-1.5 text-[13px] font-bold md:gap-2 md:text-sm">
            <CircleCheck className="size-[18px] shrink-0" />
            <span className="md:hidden">{t("readyShort")}</span>
            <span className="max-md:hidden">{t("complete")}</span>
          </p>
        )}
        <span className="max-md:hidden">
          <DraftSaveStatus />
        </span>
      </div>
      <div className="flex shrink-0 gap-2">
        {!isReturned ? (
          <Button variant="outline" size="lg" className="max-md:h-11 max-md:px-3" onClick={onFinishLater} disabled={busy}>
            <Clock className="max-[359px]:hidden" />
            {t("finishLater")}
          </Button>
        ) : null}
        <Button variant="green" size="lg" className="max-md:h-11 max-md:px-4" onClick={onSubmit} disabled={busy}>
          <Send className="rtl:-scale-x-100" />
          {isReturned ? tr("resubmit") : t("button")}
        </Button>
      </div>
    </div>
  );
}
