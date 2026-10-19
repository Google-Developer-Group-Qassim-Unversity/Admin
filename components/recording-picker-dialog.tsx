'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, Check, Clock, ExternalLink, Globe, Loader2, Lock, RefreshCw, Video } from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useCreateContentLink, useMakeRecordingPublic, useRecordingCandidates } from '@/hooks/use-event';
import type { DriveRecordingCandidate } from '@/lib/api-types';

interface RecordingPickerDialogProps {
  eventId: number;
}

function cleanCandidateLabel(filename: string | undefined): string {
  if (!filename) return 'Meeting Recording';
  const base = filename.replace(/\.[^/.]+$/, '');
  const cleaned = base.replace(/[_]/g, ' ').trim();
  return cleaned || 'Meeting Recording';
}

function formatCandidateDate(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return dateStr;
  }
}

interface CandidateRowProps {
  eventId: number;
  candidate: DriveRecordingCandidate;
  onApproved: (fileId: string) => void;
}

function CandidateRow({ eventId, candidate, onApproved }: CandidateRowProps) {
  const t = useTranslations('eventContent');
  const [label, setLabel] = React.useState(() => cleanCandidateLabel(candidate.name));
  const [justMadePublic, setJustMadePublic] = React.useState(false);
  const makePublicMutation = useMakeRecordingPublic(eventId);
  const createLinkMutation = useCreateContentLink(eventId);

  const isPublic = candidate.is_public || justMadePublic;

  React.useEffect(() => {
    if (candidate.is_public && justMadePublic) {
      setJustMadePublic(false);
    }
  }, [candidate.is_public, justMadePublic]);

  const handleMakePublic = async () => {
    try {
      await makePublicMutation.mutateAsync(candidate.file_id);
      setJustMadePublic(true);
      toast.success(t('madePublicSuccess'));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('makePublicFailed');
      toast.error(message);
    }
  };

  const handleApprove = async () => {
    const trimmedLabel = label.trim() || cleanCandidateLabel(candidate.name);
    try {
      await createLinkMutation.mutateAsync({
        label: trimmedLabel,
        url: candidate.web_view_link,
        kind: 'recording',
        published: true,
        drive_file_id: candidate.file_id,
      });
      toast.success(t('approvedToast'));
      onApproved(candidate.file_id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : t('createFailed');
      toast.error(message);
    }
  };

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3 transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground truncate" dir="auto" title={candidate.name}>
            {candidate.name}
          </p>
          {candidate.created_time && (
            <p className="text-xs text-muted-foreground/80 mt-0.5">
              {formatCandidateDate(candidate.created_time)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isPublic ? (
            <Badge variant="secondary" className="flex items-center gap-1 text-emerald-700 bg-emerald-500/10 dark:text-emerald-300">
              <Globe className="h-3 w-3" />
              {t('recordingPublicBadge')}
            </Badge>
          ) : (
            <Badge variant="outline" className="flex items-center gap-1 text-amber-700 bg-amber-500/10 dark:text-amber-300">
              <Lock className="h-3 w-3" />
              {t('recordingPrivateBadge')}
            </Badge>
          )}
          <a
            href={candidate.web_view_link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
            title={t('openLink')}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {!isPublic && (
        <div className="flex items-center justify-between gap-2 rounded-md bg-muted/50 p-2 text-xs">
          <span className="text-muted-foreground">
            {t('privateRecordingHint')}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs shrink-0"
            onClick={handleMakePublic}
            disabled={makePublicMutation.isPending}
          >
            {makePublicMutation.isPending ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin me-1.5" />
                {t('makingPublic')}
              </>
            ) : (
              t('makePublicNow')
            )}
          </Button>
        </div>
      )}

      <div className="flex items-end gap-2 pt-1">
        <div className="flex-1 space-y-1">
          <Label className="text-xs text-muted-foreground">{t('labelField')}</Label>
          <Input
            dir="auto"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t('labelPlaceholderRecording')}
            className="h-8 text-sm"
          />
        </div>
        <Button
          size="sm"
          onClick={handleApprove}
          disabled={createLinkMutation.isPending || !label.trim()}
          className="h-8 shrink-0"
        >
          {createLinkMutation.isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin me-1.5" />
              {t('approvingRecording')}
            </>
          ) : (
            <>
              <Check className="h-3.5 w-3.5 me-1.5" />
              {t('approveRecording')}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export function RecordingPickerDialog({ eventId }: RecordingPickerDialogProps) {
  const t = useTranslations('eventContent');
  const [open, setOpen] = React.useState(false);
  const { data, isLoading, error, refetch, isFetching } = useRecordingCandidates(eventId, open);
  const [approvedFileIds, setApprovedFileIds] = React.useState<Set<string>>(new Set());

  // Filter out approved candidates locally
  const rawCandidates = data?.candidates ?? [];
  const candidates = rawCandidates.filter((c) => !approvedFileIds.has(c.file_id));

  const handleApproved = (fileId: string) => {
    setApprovedFileIds((prev) => new Set([...prev, fileId]));
  };

  const isUnconfigured = error?.message?.toLowerCase().includes('not configured');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Video className="h-4 w-4" />
          {t('findRecordings')}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col gap-4 overflow-hidden">
        <DialogHeader>
          <DialogTitle>{t('findRecordingsTitle')}</DialogTitle>
          <DialogDescription>{t('findRecordingsDescription')}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 py-2 pe-1">
          {isLoading ? (
            <div className="space-y-3 py-4">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <div className="flex justify-center items-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{t('refreshRecordings')}...</span>
              </div>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="flex flex-col gap-2">
                <span>{isUnconfigured ? t('driveUnconfiguredNotice') : error.message}</span>
                <Button size="sm" variant="outline" className="w-fit" onClick={() => void refetch()}>
                  {t('retry')}
                </Button>
              </AlertDescription>
            </Alert>
          ) : data?.state === 'processing' ? (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-5 text-center space-y-3">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                <Clock className="h-5 w-5" />
              </div>
              <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                {t('recordingStateProcessing')}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => void refetch()}
                disabled={isFetching}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                {t('refreshRecordings')}
              </Button>
            </div>
          ) : data?.state === 'absent' || (data?.state === 'ready' && candidates.length === 0) ? (
            <div className="rounded-lg border bg-muted/30 p-5 text-center space-y-3">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
                <AlertCircle className="h-5 w-5" />
              </div>
              <p className="text-sm text-muted-foreground">
                {t('recordingStateAbsent')}
              </p>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => void refetch()}
                disabled={isFetching}
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
                {t('refreshRecordings')}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground pb-1">
                <span>{t('recordingStateReadyHint')}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs gap-1"
                  onClick={() => void refetch()}
                  disabled={isFetching}
                >
                  <RefreshCw className={`h-3 w-3 ${isFetching ? 'animate-spin' : ''}`} />
                  {t('refreshRecordings')}
                </Button>
              </div>

              {candidates.map((candidate) => (
                <CandidateRow
                  key={candidate.file_id}
                  eventId={eventId}
                  candidate={candidate}
                  onApproved={handleApproved}
                />
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
