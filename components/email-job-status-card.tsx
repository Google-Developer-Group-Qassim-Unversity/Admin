"use client";

import { AlertTriangle, CheckCircle2, Loader2, Mail, XCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEmailJob } from "@/hooks/use-email-jobs";
import { useTranslations } from "next-intl";

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

  if (!jobId || !job || job.status === "queued" || job.status === "running") {
    return (
      <Card className="bg-sky-500/5 border-sky-500/20">
        <CardHeader className="p-4">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-sky-700 dark:text-sky-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            {job?.status === "running"
              ? t("sending", { done: job.succeeded + job.failed, total, noun: noun(total) })
              : t("started", { total, noun: noun(total) })}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <p className="text-xs text-muted-foreground mb-3">
            {description ?? t("sendingDescription")}
          </p>
          {onGoToLogs && (
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={onGoToLogs}>
              <Mail className="h-3.5 w-3.5" />
              {t("viewLogs")}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (job.status === "succeeded") {
    return (
      <Card className="bg-emerald-500/5 border-emerald-500/20">
        <CardHeader className="p-4">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
            {t("allSent", { count: job.succeeded, noun: noun(job.succeeded) })}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          {onGoToLogs && (
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={onGoToLogs}>
              <Mail className="h-3.5 w-3.5" />
              {t("viewLogs")}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (job.status === "partial") {
    return (
      <Card className="bg-amber-500/5 border-amber-500/20">
        <CardHeader className="p-4">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
            {t("partialTitle", { succeeded: job.succeeded, failed: job.failed })}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <p className="text-xs text-muted-foreground mb-3">
            {t("partialHint", { noun: noun(1) })}
          </p>
          {onGoToLogs && (
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={onGoToLogs}>
              <Mail className="h-3.5 w-3.5" />
              {t("viewLogs")}
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-destructive/5 border-destructive/20">
      <CardHeader className="p-4">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-destructive">
          <XCircle className="h-4 w-4" />
          {t("sendFailed")}
        </CardTitle>
      </CardHeader>
      {job.error && (
        <CardContent className="px-4 pb-4 pt-0">
          <p className="text-xs text-muted-foreground">{job.error}</p>
        </CardContent>
      )}
    </Card>
  );
}
