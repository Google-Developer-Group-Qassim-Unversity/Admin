"use client";

import { AlertTriangle, CheckCircle2, Loader2, Mail, XCircle } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useEmailJob } from "@/hooks/use-email-jobs";

interface EmailJobStatusCardProps {
  jobId: number | null | undefined;
  getToken: () => Promise<string | null>;
  /** What one unit of the job is called, e.g. "certificate", "email". Pluralized with a trailing "s". */
  itemLabel: string;
  /** recipient_count from the initial queue response, shown before the first poll resolves. */
  totalHint: number;
  /** Overrides the default "sending in the background" line while queued/running, e.g. to break down recipients. */
  description?: string;
  onGoToLogs?: () => void;
}

export function EmailJobStatusCard({
  jobId,
  getToken,
  itemLabel,
  totalHint,
  description,
  onGoToLogs,
}: EmailJobStatusCardProps) {
  const { data: job } = useEmailJob(jobId, getToken);

  const total = job?.total ?? totalHint;
  const plural = (n: number) => `${itemLabel}${n !== 1 ? "s" : ""}`;

  if (!jobId || !job || job.status === "queued" || job.status === "running") {
    return (
      <Card className="bg-sky-500/5 border-sky-500/20">
        <CardHeader className="p-4">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-sky-700 dark:text-sky-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            {job?.status === "running"
              ? `Sending — ${job.succeeded + job.failed}/${total} ${plural(total)} processed`
              : `Job started — ${total} ${plural(total)} queued`}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <p className="text-xs text-muted-foreground mb-3">
            {description ?? "Sending in the background — a log entry will appear in Email Logs as each one completes."}
          </p>
          {onGoToLogs && (
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={onGoToLogs}>
              <Mail className="h-3.5 w-3.5" />
              View Email Logs
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
            All {job.succeeded} {plural(job.succeeded)} sent
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          {onGoToLogs && (
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={onGoToLogs}>
              <Mail className="h-3.5 w-3.5" />
              View Email Logs
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
            {job.succeeded} sent, {job.failed} failed
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <p className="text-xs text-muted-foreground mb-3">
            Some recipients didn&apos;t get their {itemLabel}. Check Email Logs for which ones.
          </p>
          {onGoToLogs && (
            <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={onGoToLogs}>
              <Mail className="h-3.5 w-3.5" />
              View Email Logs
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
          Send failed
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
