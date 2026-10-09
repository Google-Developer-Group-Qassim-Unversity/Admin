"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { CircleCheck, CornerUpLeft, ExternalLink, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

import { Door, DoorPanel, Mark, SectionHead } from "@/components/najdi";
import { TeamActionButtons } from "@/components/pipeline/team-actions";
import { Button } from "@/components/ui/button";
import { useCompleteTask, useUploadPoster } from "@/hooks/use-pipeline";
import type { EventRequestDetail } from "@/lib/pipeline-types";
import { isolate, useFormatters } from "@/lib/format";
import { cn } from "@/lib/utils";

const ACCEPT = "image/png,image/jpeg,image/webp";
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Design's deliverable: the poster. Design uploads it (and can replace it
 * until the event is published), then finishes its part. Everyone who can see
 * the request sees the poster; publish makes it the event's image.
 */
export function DesignPoster({ request }: { request: EventRequestDetail }) {
  const t = useTranslations("pipeline.poster");
  const tr = useTranslations("pipeline.review");
  const fmt = useFormatters();
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

  const image = posterUrl ? (
    <div className="flex flex-col items-start gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element -- an R2 URL, shown as uploaded */}
      <img
        src={posterUrl}
        alt={t("alt", { title: request.title ?? "" })}
        className={cn(
          "bg-sunk w-auto max-w-full rounded-sm object-contain shadow-[0_0_0_1px_var(--rule)]",
          canUpload ? "max-h-80" : "max-h-56",
        )}
      />
      <a
        href={posterUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex min-h-8 items-center gap-1 text-[13px] font-bold underline underline-offset-2"
      >
        {t("openFull")}
        <ExternalLink className="size-3.5" />
      </a>
    </div>
  ) : canUpload ? (
    <button
      type="button"
      onClick={() => input.current?.click()}
      disabled={upload.isPending}
      className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-sm border-2 border-dashed border-current/35 px-4 py-6 text-sm transition-colors hover:bg-black/5 disabled:opacity-60"
    >
      {upload.isPending ? <Loader2 className="size-6 animate-spin" /> : <Upload className="size-6" />}
      <span className="font-bold">{t("pick")}</span>
      <span className="text-[13px] opacity-75">{t("formats")}</span>
    </button>
  ) : null;

  const fileInput = canUpload ? (
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
  ) : null;

  // Design's turn: the poster is the thing waiting on them, so it gets the door.
  if (canFinish) {
    return (
      <Door tone="ochre" aria-labelledby="poster-title">
        <h2 id="poster-title" className="font-display text-[21px] leading-tight font-semibold">
          {t("title")}
        </h2>
        <p className="text-sm font-medium">{t("hint")}</p>
        <DoorPanel className="gap-3">{image}</DoorPanel>
        {fileInput}
        <div className="grid gap-2 sm:flex sm:flex-wrap sm:items-center">
          <Button variant="green" size="lg" onClick={onFinish} disabled={!posterUrl || complete.isPending || upload.isPending}>
            <CircleCheck />
            {t("finish")}
          </Button>
          {posterUrl ? (
            <Button
              variant="outline"
              size="lg"
              className="text-on-door-ochre shadow-[inset_0_0_0_1.5px_currentColor] hover:bg-black/8"
              onClick={() => input.current?.click()}
              disabled={upload.isPending}
            >
              {upload.isPending ? <Loader2 className="animate-spin" /> : <Upload />}
              {t("replace")}
            </Button>
          ) : (
            <span className="text-[13px] font-bold">{t("needsPoster")}</span>
          )}
        </div>
        {/* Design may still send the request back early on; the button lives here
            so Design's turn is one door (TeamActions steps aside). */}
        {request.actions.can_return ? (
          <div className="flex flex-col gap-2 border-t border-current/20 pt-3">
            {request.return_deadline ? (
              <p className="flex items-center gap-1.5 text-[13px] font-bold">
                <CornerUpLeft className="size-4 shrink-0" />
                {tr("returnUntil", { date: fmt.dateTime(request.return_deadline) })}
              </p>
            ) : null}
            <TeamActionButtons request={request} />
          </div>
        ) : null}
      </Door>
    );
  }

  // Everyone else (and Design after finishing, until publish): the poster on the wall.
  return (
    <section aria-labelledby="poster-title" className="flex flex-col gap-3">
      <SectionHead
        id="poster-title"
        title={
          <>
            <Mark tone={task.status === "done" ? "green" : "indigo"} />
            {t("title")}
          </>
        }
        action={
          canUpload && posterUrl ? (
            <Button variant="outline" size="sm" onClick={() => input.current?.click()} disabled={upload.isPending}>
              {upload.isPending ? <Loader2 className="animate-spin" /> : <Upload />}
              {t("replace")}
            </Button>
          ) : null
        }
      />
      <p className="text-ink-2 text-[13px]">
        {canUpload ? t("hint") : task.done_by ? t("by", { name: isolate(task.done_by.name) }) : t("viewHint")}
      </p>
      {image}
      {fileInput}
    </section>
  );
}
