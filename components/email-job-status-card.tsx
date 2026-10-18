"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Loader2, Mail, XCircle, type LucideIcon } from "lucide-react";

import { Courses, INK, Plate, type DoorTone } from "@/components/najdi";
import { Button } from "@/components/ui/button";
import { useEmailJob } from "@/hooks/use-email-jobs";
import { useTranslations } from "next-intl";

import type { Urgency } from "@/components/status-badge";

interface EmailJobStatusCardProps {
  jobId: number | null | undefined;
  getToken: () => Promise<string | null>;
  /** What one unit of the job is called - looks up manageEmails.jobStatus.nouns.{itemKey}. */
  itemKey: "certificate" | "email";
  /** recipient_count from the initial queue response, shown before the first poll resolves. */
  totalHint: number;
  /** Overrides the default "sending in the background" line while queued/running, e.g. to break down recipients. */
  description?: string;
  onGoToLogs?: () => void;
}

export function EmailJobStatusCard({
  jobId,
  getToken,
  itemKey,
  totalHint,
  description,
  onGoToLogs,
}: EmailJobStatusCardProps) {
  const t = useTranslations("jobStatus");
  const { data: job } = useEmailJob(jobId, getToken);

  const total = job?.total ?? totalHint;
  const noun = (n: number) => t(`nouns.${itemKey}`, { count: n });

  const viewLogs = onGoToLogs ? (
    <Button type="button" variant="outline" size="sm" onClick={onGoToLogs}>
      <Mail />
      {t("viewLogs")}
    </Button>
  ) : null;

  if (!jobId || !job || job.status === "queued" || job.status === "running") {
    return (
      <StatusShell
        tone="info"
        icon={Loader2}
        title={
          job?.status === "running"
            ? t("sending", { done: job.succeeded + job.failed, total, noun: noun(total) })
            : t("started", { total, noun: noun(total) })
        }
      >
        {job?.status === "running" ? (
          <JobCourse done={job.succeeded + job.failed} total={total} label={t("sending", { done: job.succeeded + job.failed, total, noun: noun(total) })} />
        ) : null}
        <p className="text-ink-2 text-[13px]">{description ?? t("sendingDescription")}</p>
        {viewLogs}
      </StatusShell>
    );
  }

  if (job.status === "succeeded") {
    return (
      <StatusShell
        tone="done"
        icon={CheckCircle2}
        title={t("allSent", { count: job.succeeded, noun: noun(job.succeeded) })}
      >
        {viewLogs}
      </StatusShell>
    );
  }

  if (job.status === "partial") {
    return (
      <StatusShell
        tone="waiting"
        icon={AlertTriangle}
        title={t("partialTitle", { succeeded: job.succeeded, failed: job.failed })}
      >
        <p className="text-ink-2 text-[13px]">{t("partialHint", { noun: noun(1) })}</p>
        {viewLogs}
      </StatusShell>
    );
  }

  return (
    <StatusShell tone="overdue" icon={XCircle} title={t("sendFailed")}>
      {job.error && <p className="text-ink-2 text-[13px] break-words">{job.error}</p>}
    </StatusShell>
  );
}

// Colour = state: in flight is indigo (the server has it), done is green, a
// partial send waits on an admin to check who was missed (ochre), failed is madder.
const TONE: Record<Urgency, DoorTone> = { info: "indigo", done: "green", waiting: "ochre", overdue: "madder" };

/** A job's progress as a course of twelve bricks. */
export function JobCourse({ done, total, label }: { done: number; total: number; label: string }) {
  const BRICKS = 12;
  const filled = total > 0 ? Math.min(BRICKS, Math.round((done / total) * BRICKS)) : 0;
  return <Courses done={filled} total={BRICKS} label={label} className="w-full max-w-sm" />;
}

function StatusShell({
  tone,
  icon,
  title,
  children,
}: {
  tone: Urgency;
  icon: LucideIcon;
  title: string;
  children?: React.ReactNode;
}) {
  const hasBody = React.Children.toArray(children).some(Boolean);
  const door = TONE[tone];
  return (
    <section role="status" className="bg-card ring-rule flex items-start gap-3 rounded-xl p-4 ring-1">
      <Plate tone={door} icon={icon} size="sm" className={tone === "info" ? "[&_svg]:motion-safe:animate-spin" : undefined} />
      <div className="flex min-w-0 flex-1 flex-col items-start gap-2.5">
        <p className={`self-stretch text-sm font-bold ${INK[door]}`}>{title}</p>
        {hasBody ? children : null}
      </div>
    </section>
  );
}
