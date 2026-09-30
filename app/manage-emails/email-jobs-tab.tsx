"use client";

import * as React from "react";
import { useAuth } from "@clerk/nextjs";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  Mail,
  MailCheck,
  Megaphone,
  PenLine,
  Send,
  XCircle,
} from "lucide-react";

import { URGENCY_STYLES, type Urgency } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useEmailJobs, useUnfinishedEmailJobs } from "@/hooks/use-email-jobs";
import type { EmailJobModel, EmailJobStatus, EmailJobType } from "@/lib/api-types";
import { useFormatter, useNow, useTranslations } from "next-intl";

// A job's type is a category, not a state: the icon tells them apart and the
// brand colours are kept for the status pill.
const TYPE_ICON: Record<EmailJobType, React.ElementType> = {
  "event-certificate": Award,
  "manual-certificate": PenLine,
  "custom-email": Mail,
  "direct-email": Send,
  blast: Megaphone,
  acceptance: MailCheck,
};

// Maps a job type to the key under manageEmails.jobs.types.
const TYPE_LABEL_KEY: Record<EmailJobType, string> = {
  "event-certificate": "eventCertificate",
  "manual-certificate": "manualCertificate",
  "custom-email": "customEmail",
  "direct-email": "directEmail",
  blast: "blast",
  acceptance: "acceptance",
};

// Colour = state (DESIGN.md): queued/running are in flight on the server, not
// waiting on an admin, so they read as info (blue); a partial send needs an
// admin to check who was missed (yellow); failed is red; succeeded is done.
const STATUS_CONFIG: Record<
  EmailJobStatus,
  { icon: React.ElementType; urgency: Urgency; spin?: boolean }
> = {
  queued: { icon: Clock, urgency: "info" },
  running: { icon: Loader2, urgency: "info", spin: true },
  succeeded: { icon: CheckCircle2, urgency: "done" },
  partial: { icon: AlertTriangle, urgency: "waiting" },
  failed: { icon: XCircle, urgency: "overdue" },
};

function JobRow({ job }: { job: EmailJobModel }) {
  const t = useTranslations("manageEmails.jobs");
  const format = useFormatter();
  const now = useNow({ updateInterval: 60_000 });
  const TypeIcon = TYPE_ICON[job.job_type] ?? Mail;
  const status = STATUS_CONFIG[job.status];
  const StatusIcon = status.icon;

  return (
    <div className="flex items-start gap-3 px-3 py-3">
      <span className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg">
        <TypeIcon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-sm font-medium">
            {t(`types.${TYPE_LABEL_KEY[job.job_type]}`)}
          </p>
          <span
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold ${URGENCY_STYLES[status.urgency].pill}`}
          >
            <StatusIcon className={`h-3 w-3 ${status.spin ? "animate-spin" : ""}`} />
            {t(`statuses.${job.status}`)}
          </span>
        </div>
        <p className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[13px] sm:text-xs">
          <span className="tabular">
            {t("sentCount", { succeeded: job.succeeded, total: job.total })}
            {job.failed > 0 ? t("failedSuffix", { failed: job.failed }) : ""}
          </span>
          <span aria-hidden="true">·</span>
          <time dateTime={job.created_at} className="tabular">
            {format.relativeTime(new Date(job.created_at), now)}
          </time>
          <span aria-hidden="true">·</span>
          <span className="tabular text-muted-foreground/70">#{job.id}</span>
        </p>
        {job.error && (
          <p className="text-brand-red-ink mt-1 line-clamp-2 text-[13px] break-words sm:text-xs">{job.error}</p>
        )}
      </div>
    </div>
  );
}

const JOBS_PAGE_SIZE = 50;

export function EmailJobsTab() {
  const t = useTranslations("manageEmails.jobs");
  const tp = useTranslations("manageEmails.pagination");
  const { getToken } = useAuth();
  const [statusFilter, setStatusFilter] = React.useState<EmailJobStatus | "all">("all");
  const [page, setPage] = React.useState(1);

  // A new filter is a new result set - start back at page one.
  React.useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  const jobsQuery = useEmailJobs(
    {
      limit: JOBS_PAGE_SIZE,
      offset: (page - 1) * JOBS_PAGE_SIZE,
      status: statusFilter === "all" ? undefined : statusFilter,
    },
    getToken
  );
  const unfinishedQuery = useUnfinishedEmailJobs(getToken);

  const jobs = jobsQuery.data ?? [];
  const unfinished = unfinishedQuery.data ?? [];

  return (
    <div className="space-y-3">
      {unfinished.length > 0 && (
        <Alert className="border-brand-yellow/40 bg-brand-yellow-soft">
          <AlertTriangle className="h-4 w-4 text-brand-yellow-ink" />
          <AlertTitle className="text-brand-yellow-ink">
            {t("unfinishedTitle", { count: unfinished.length })}
          </AlertTitle>
          <AlertDescription className="text-[13px] text-brand-yellow-ink/80 sm:text-xs">
            {t("unfinishedDescription")}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between gap-3">
        <span className="tabular text-xs text-muted-foreground">
          {t("jobsCount", { count: jobs.length })}
        </span>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as EmailJobStatus | "all")}>
          <SelectTrigger aria-label={t("filterByStatus")} className="w-[160px] sm:h-8 sm:text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allStatuses")}</SelectItem>
            {(Object.keys(STATUS_CONFIG) as EmailJobStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {t(`statuses.${s}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <ScrollArea className="md:h-[480px] [&_[data-slot=scroll-area-viewport]>div]:block!">
          {jobsQuery.isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t("loading")}
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              {t("noneFound")}
            </div>
          ) : (
            <div className="divide-y">
              {jobs.map((job) => (
                <JobRow key={job.id} job={job} />
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="flex items-center justify-between border-t px-3 py-2">
          <span className="tabular text-xs text-muted-foreground">{tp("page", { page })}</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || jobsQuery.isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="rtl:-scale-x-100" />
              {tp("prev")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={jobs.length < JOBS_PAGE_SIZE || jobsQuery.isFetching}
              onClick={() => setPage((p) => p + 1)}
            >
              {tp("next")}
              <ChevronRight className="rtl:-scale-x-100" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
