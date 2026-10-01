"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CheckCircle2, Clock, Send } from "lucide-react";
import { toast } from "sonner";

import { useDraftSave } from "@/components/pipeline/draft-autosave";
import { Button } from "@/components/ui/button";
import { useSubmitRequest } from "@/hooks/use-pipeline";
import type { EventRequestDetail } from "@/lib/pipeline-types";

/**
 * What submit still needs, the button that sends the request to Design and
 * Logistics, and "Finish later", which saves everything typed and goes back
 * to the pipeline; the draft keeps its fields until the team returns.
 */
export function SubmitBar({ request }: { request: EventRequestDetail }) {
  const t = useTranslations("pipeline.submit");
  const tf = useTranslations("pipeline.fields");
  const router = useRouter();
  const submit = useSubmitRequest(request.id);
  const { flushAll, state } = useDraftSave();
  const ready = request.missing.length === 0;
  const busy = state === "saving" || submit.isPending;

  const label = (field: string) => {
    const key = field.replace(".", "_");
    return tf.has(key) ? tf(key) : field;
  };

  const onSubmit = async () => {
    // Anything still waiting to autosave goes in first, so submit checks what is on screen.
    if (!(await flushAll())) return;
    try {
      await submit.mutateAsync();
      toast.success(t("sent"));
    } catch (error) {
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
    <section className="bg-card border-border flex flex-col gap-3 rounded-xl border p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="font-display text-base font-semibold tracking-tight">{t("title")}</h3>
          <p className="text-muted-foreground text-[13px]">{ready ? t("ready") : t("notReady")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={onFinishLater} disabled={busy}>
            <Clock className="h-4 w-4" />
            {t("finishLater")}
          </Button>
          {request.stage === "draft" ? (
            <Button onClick={onSubmit} disabled={!ready || busy}>
              {ready ? <Send className="h-4 w-4 rtl:-scale-x-100" /> : null}
              {t("button")}
            </Button>
          ) : null}
        </div>
      </div>
      {!ready ? (
        <ul className="flex flex-wrap gap-1.5">
          {request.missing.map((field) => (
            <li key={field} className="bg-brand-yellow-soft text-brand-yellow-ink rounded-full px-2.5 py-0.5 text-xs">
              {label(field)}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-brand-green-ink flex items-center gap-1.5 text-sm">
          <CheckCircle2 className="h-4 w-4" />
          {t("complete")}
        </p>
      )}
    </section>
  );
}
