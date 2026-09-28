"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useSubmitRequest } from "@/hooks/use-pipeline";
import type { EventRequestDetail } from "@/lib/pipeline-types";

/** What submit still needs, and the button that sends the request to Design and Logistics. */
export function SubmitBar({ request }: { request: EventRequestDetail }) {
  const t = useTranslations("pipeline.submit");
  const tf = useTranslations("pipeline.fields");
  const submit = useSubmitRequest(request.id);
  const ready = request.missing.length === 0;

  const label = (field: string) => {
    const key = field.replace(".", "_");
    return tf.has(key) ? tf(key) : field;
  };

  const onSubmit = async () => {
    try {
      await submit.mutateAsync();
      toast.success(t("sent"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("failed"));
    }
  };

  return (
    <section className="bg-card border-border flex flex-col gap-3 rounded-xl border p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 className="font-display text-base font-semibold tracking-tight">{t("title")}</h3>
          <p className="text-muted-foreground text-[13px]">{ready ? t("ready") : t("notReady")}</p>
        </div>
        <Button onClick={onSubmit} disabled={!ready || submit.isPending}>
          {ready ? <Send className="h-4 w-4 rtl:-scale-x-100" /> : null}
          {t("button")}
        </Button>
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
