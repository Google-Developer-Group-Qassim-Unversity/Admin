"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { CircleCheck, Clock, Send } from "lucide-react";
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
      <p className="text-brand-green-ink flex items-center gap-1.5 text-sm font-medium">
        <CircleCheck className="h-4 w-4" />
        {t("complete")}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <span className={cn("text-sm font-medium", shown && "text-brand-red-ink")}>
        {t("stillMissing", { count: missing.length })}
      </span>
      <ul className="flex flex-wrap gap-1.5">
        {visible.map((field) => (
          <li key={field}>
            <button
              type="button"
              onClick={() => onJump(field)}
              className={cn(
                "focus-visible:ring-ring/50 rounded-full px-2.5 py-1 text-xs font-medium transition-colors outline-none hover:underline focus-visible:ring-[3px]",
                shown ? "bg-brand-red-soft text-brand-red-ink" : "bg-brand-yellow-soft text-brand-yellow-ink",
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
              className="text-muted-foreground hover:text-foreground rounded-full px-2.5 py-1 text-xs font-medium underline-offset-2 hover:underline"
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

  return (
    <div className="bg-card/95 border-border supports-backdrop-filter:bg-card/85 sticky bottom-4 z-20 flex flex-col gap-2 rounded-xl border p-3 shadow-[0_8px_24px_-8px_oklch(0_0_0/0.18)] supports-backdrop-filter:backdrop-blur-lg sm:flex-row sm:items-center sm:gap-3 sm:ps-4 max-md:bottom-[calc(4.5rem+env(safe-area-inset-bottom))]">
      <div className="min-w-0 flex-1">
        <DraftSaveStatus />
      </div>
      <div className="flex gap-2 *:flex-1 sm:*:flex-none">
        {!isReturned ? (
          <Button variant="outline" onClick={onFinishLater} disabled={busy}>
            <Clock className="h-4 w-4" />
            {t("finishLater")}
          </Button>
        ) : null}
        <Button onClick={onSubmit} disabled={busy}>
          <Send className="h-4 w-4 rtl:-scale-x-100" />
          {isReturned ? tr("resubmit") : t("button")}
        </Button>
      </div>
    </div>
  );
}
