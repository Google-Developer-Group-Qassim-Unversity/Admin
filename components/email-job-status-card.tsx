"use client";

import * as React from "react";
import { AlertTriangle, CheckCircle2, Loader2, Mail, XCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEmailJob } from "@/hooks/use-email-jobs";
import { useTranslations } from "next-intl";

import { URGENCY_STYLES, type Urgency } from "@/components/status-badge";

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
    <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={onGoToLogs}>
      <Mail className="h-3.5 w-3.5" />
      {t("viewLogs")}
    </Button>
  ) : null;

  if (!jobId || !job || job.status === "queued" || job.status === "running") {
    return (
      <StatusShell
        tone="info"
        icon={<Loader2 className="h-4 w-4 animate-spin" />}
        title={
          job?.status === "running"
            ? t("sending", { done: job.succeeded + job.failed, total, noun: noun(total) })
            : t("started", { total, noun: noun(total) })
        }
      >
        <p className="text-[13px] text-muted-foreground sm:text-xs">{description ?? t("sendingDescription")}</p>
        {viewLogs}
      </StatusShell>
    );
  }

  if (job.status === "succeeded") {
    return (
      <StatusShell
        tone="done"
        icon={<CheckCircle2 className="h-4 w-4" />}
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
        icon={<AlertTriangle className="h-4 w-4" />}
        title={t("partialTitle", { succeeded: job.succeeded, failed: job.failed })}
      >
        <p className="text-[13px] text-muted-foreground sm:text-xs">{t("partialHint", { noun: noun(1) })}</p>
        {viewLogs}
      </StatusShell>
    );
  }

  return (
    <StatusShell tone="overdue" icon={<XCircle className="h-4 w-4" />} title={t("sendFailed")}>
      {job.error && <p className="text-[13px] text-muted-foreground break-words sm:text-xs">{job.error}</p>}
    </StatusShell>
  );
}

// Colour = state: in flight is info (blue), done is green, a partial send
// waits on an admin to check who was missed (yellow), failed is red.
const TONE: Record<Urgency, { card: string; title: string }> = {
  info: { card: "ring-brand-blue/30", title: "text-brand-blue-ink" },
  done: { card: "ring-brand-green/30", title: "text-brand-green-ink" },
  waiting: { card: "ring-brand-yellow/50", title: "text-brand-yellow-ink" },
  overdue: { card: "ring-brand-red/30", title: "text-brand-red-ink" },
};

function StatusShell({
  tone,
  icon,
  title,
  children,
}: {
  tone: Urgency;
  icon: React.ReactNode;
  title: string;
  children?: React.ReactNode;
}) {
  const hasBody = React.Children.toArray(children).some(Boolean);
  return (
    <Card className={`gap-0 py-0 sm:gap-0 sm:py-0 ${TONE[tone].card}`}>
      <CardHeader className="p-4 sm:p-4">
        <CardTitle className="flex items-start gap-2.5 text-sm font-semibold">
          <span
            className={`flex size-7 shrink-0 items-center justify-center rounded-full ${URGENCY_STYLES[tone].pill}`}
          >
            {icon}
          </span>
          <span className={`min-w-0 self-center ${TONE[tone].title}`}>{title}</span>
        </CardTitle>
      </CardHeader>
      {hasBody && (
        <CardContent className="flex flex-col items-start gap-3 px-4 pt-0 pb-4 sm:px-4 sm:ps-[3.375rem]">{children}</CardContent>
      )}
    </Card>
  );
}
