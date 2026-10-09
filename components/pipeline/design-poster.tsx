"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { CircleCheck, ExternalLink, ImageIcon, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useCompleteTask, useUploadPoster } from "@/hooks/use-pipeline";
import type { EventRequestDetail } from "@/lib/pipeline-types";

const ACCEPT = "image/png,image/jpeg,image/webp";
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Design's deliverable: the poster. Design uploads it (and can replace it
 * until the event is published), then finishes its part. Everyone who can see
 * the request sees the poster; publish makes it the event's image.
 */
export function DesignPoster({ request }: { request: EventRequestDetail }) {
  const t = useTranslations("pipeline.poster");
  const task = request.tasks.find((x) => x.team === "design");
  const upload = useUploadPoster(request.id);
  const complete = useCompleteTask(request.id);
  const input = React.useRef<HTMLInputElement>(null);
  const posterUrl = (task?.deliverable?.poster_url as string | undefined) ?? null;
  const canUpload = request.actions.can_upload_poster;
  const canFinish = request.actions.complete.includes("design");

  if (!task || task.status === "brief" || (!canUpload && !posterUrl)) return null;

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPT.split(",").includes(file.type)) {
      toast.error(t("wrongType"));
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error(t("tooLarge"));
      return;
    }
    try {
      await upload.mutateAsync(file);
      toast.success(t("uploaded"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("failed"));
    }
  };

  const onFinish = async () => {
    try {
      await complete.mutateAsync("design");
      toast.success(t("finished"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("failed"));
    }
  };

  return (
    <section
      className={`bg-card flex flex-col gap-4 rounded-xl border p-4 sm:p-5 ${canFinish ? "border-brand-blue/30" : "border-border"}`}
    >
      <div className="flex items-start gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
            task.status === "done" ? "bg-brand-green-soft text-brand-green-ink" : "bg-brand-blue-soft text-brand-blue-ink"
          }`}
        >
          <ImageIcon className="h-[18px] w-[18px]" />
        </span>
        <div className="flex flex-col gap-0.5">
          <h2 className="font-display text-base font-semibold tracking-tight">{t("title")}</h2>
          <p className="text-muted-foreground text-[13px]">
            {canUpload ? t("hint") : task.completed_by ? t("by", { name: task.completed_by.name }) : t("viewHint")}
          </p>
        </div>
      </div>

      {posterUrl ? (
        <div className="flex flex-col items-start gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- an R2 URL, shown as uploaded */}
          <img
            src={posterUrl}
            alt={t("alt", { title: request.title ?? "" })}
            className="bg-muted max-h-80 w-auto max-w-full rounded-lg border object-contain"
          />
          <a
            href={posterUrl}
            target="_blank"
            rel="noreferrer"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs underline-offset-2 hover:underline"
          >
            {t("openFull")}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      ) : canUpload ? (
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={upload.isPending}
          className="border-border hover:bg-muted/50 text-muted-foreground flex min-h-36 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-sm transition-colors"
        >
          {upload.isPending ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
          <span className="text-foreground font-medium">{t("pick")}</span>
          <span className="text-xs">{t("formats")}</span>
        </button>
      ) : null}

      {canUpload ? (
        <input
          ref={input}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => {
            void onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      ) : null}

      {canUpload && (posterUrl || canFinish) ? (
        <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center">
          {posterUrl ? (
            <Button variant="outline" onClick={() => input.current?.click()} disabled={upload.isPending}>
              {upload.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {t("replace")}
            </Button>
          ) : null}
          {canFinish ? (
            <>
              <span className="text-muted-foreground flex-1 text-xs sm:text-end">{posterUrl ? "" : t("needsPoster")}</span>
              <Button onClick={onFinish} disabled={!posterUrl || complete.isPending || upload.isPending}>
                <CircleCheck className="h-4 w-4" />
                {t("finish")}
              </Button>
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
