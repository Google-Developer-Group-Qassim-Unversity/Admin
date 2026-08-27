"use client";

import * as React from "react";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@clerk/nextjs";
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  Megaphone,
  PenLine,
  Send,
  XCircle,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useEmailJobs, useUnfinishedEmailJobs } from "@/hooks/use-email-jobs";
import type { EmailJobModel, EmailJobStatus, EmailJobType } from "@/lib/api-types";

const TYPE_CONFIG: Record<EmailJobType, { label: string; icon: React.ElementType; badgeClass: string }> = {
  "event-certificate": {
    label: "Event Certificate",
    icon: Award,
    badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  "manual-certificate": {
    label: "Manual Certificate",
    icon: PenLine,
    badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
  "custom-email": {
    label: "Custom Email",
    icon: Mail,
    badgeClass: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
  },
  "direct-email": {
    label: "Direct Email",
    icon: Send,
    badgeClass: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
  },
  blast: {
    label: "Blast",
    icon: Megaphone,
    badgeClass: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
  },
};

const STATUS_CONFIG: Record<
  EmailJobStatus,
  { label: string; icon: React.ElementType; badgeClass: string; spin?: boolean }
> = {
  queued: {
    label: "Queued",
    icon: Clock,
    badgeClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
  },
  running: {
    label: "Running",
    icon: Loader2,
    badgeClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    spin: true,
  },
  succeeded: {
    label: "Succeeded",
    icon: CheckCircle2,
    badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  partial: {
    label: "Partial",
    icon: AlertTriangle,
    badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    badgeClass: "bg-destructive/10 text-destructive border-destructive/20",
  },
};

function JobRow({ job }: { job: EmailJobModel }) {
  const type = TYPE_CONFIG[job.job_type];
  const status = STATUS_CONFIG[job.status];
  const TypeIcon = type.icon;
  const StatusIcon = status.icon;

  return (
    <div className="flex items-start gap-3 px-3 py-2.5">
      <div className="mt-0.5 shrink-0 text-muted-foreground">
        <TypeIcon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`text-[10px] ${type.badgeClass}`}>
            {type.label}
          </Badge>
          <Badge variant="outline" className={`text-[10px] gap-1 ${status.badgeClass}`}>
            <StatusIcon className={`h-3 w-3 ${status.spin ? "animate-spin" : ""}`} />
            {status.label}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {job.succeeded}/{job.total} sent{job.failed > 0 ? `, ${job.failed} failed` : ""}
          </span>
        </div>
        {job.error && <p className="text-xs text-destructive mt-1 truncate">{job.error}</p>}
      </div>
      <div className="text-right shrink-0">
        <div className="text-xs text-muted-foreground">
          {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
        </div>
        <div className="text-[10px] text-muted-foreground/70">#{job.id}</div>
      </div>
    </div>
  );
}

export function EmailJobsTab() {
  const { getToken } = useAuth();
  const [statusFilter, setStatusFilter] = React.useState<EmailJobStatus | "all">("all");

  const jobsQuery = useEmailJobs(
    { limit: 100, status: statusFilter === "all" ? undefined : statusFilter },
    getToken
  );
  const unfinishedQuery = useUnfinishedEmailJobs(getToken);

  const jobs = jobsQuery.data ?? [];
  const unfinished = unfinishedQuery.data ?? [];

  return (
    <div className="space-y-3">
      {unfinished.length > 0 && (
        <Alert className="border-amber-500/30 bg-amber-500/5">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="text-amber-700 dark:text-amber-400">
            {unfinished.length} job{unfinished.length !== 1 ? "s" : ""} still queued or running
          </AlertTitle>
          <AlertDescription className="text-xs text-muted-foreground">
            These are background tasks — a server restart strands them with nothing left to resume them. If one has
            been stuck for a while, it likely never finished.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {jobs.length > 0 ? `${jobs.length} job${jobs.length !== 1 ? "s" : ""}` : "No jobs"}
        </span>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as EmailJobStatus | "all")}>
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {(Object.keys(STATUS_CONFIG) as EmailJobStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_CONFIG[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-muted/30">
        <ScrollArea className="h-[480px]">
          {jobsQuery.isLoading ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading jobs...
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
              No email jobs found.
            </div>
          ) : (
            <div className="divide-y">
              {jobs.map((job) => (
                <JobRow key={job.id} job={job} />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
