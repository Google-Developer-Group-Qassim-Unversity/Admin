'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ContentLinkAddDialog } from '@/components/content-link-add-dialog';
import { ContentLinkItem } from '@/components/content-link-item';
import { DriveStorageBadge } from '@/components/drive-storage-badge';
import { RecordingPickerDialog } from '@/components/recording-picker-dialog';
import { SlidesDropzone } from '@/components/slides-dropzone';
import { EmptyLine, RowsSkeleton, SectionHead } from '@/components/najdi';
import { useEventContext } from '@/contexts/event-context';
import { useDriveStorageQuota, useEventDetails } from '@/hooks/use-event';
import { ApiRequestError } from '@/lib/api';
import type { EventContentLink } from '@/lib/api-types';

/**
 * The Content tab: the links members open from the event page, as rows on
 * the wall under two section heads (slides & files, recordings). The tab's
 * own head carries the one action, adding a link.
 */
export default function EventContentPage() {
  const t = useTranslations('eventContent');
  const { event } = useEventContext();
  const eventId = event?.id ?? 0;
  const { data: details, isLoading, error, refetch } = useEventDetails(eventId, eventId !== 0);
  const { data: quota, error: quotaError } = useDriveStorageQuota();
  const [driveUnconfiguredOverride, setDriveUnconfiguredOverride] = React.useState(false);

  React.useEffect(() => {
    setDriveUnconfiguredOverride(false);
  }, [event?.id]);

  const isQuotaUnconfigured =
    Boolean(quotaError?.message?.toLowerCase().includes('not configured')) ||
    (quotaError instanceof ApiRequestError && quotaError.status === 503) ||
    (quota != null && !quota.configured);

  const driveConfigured = !isQuotaUnconfigured && !driveUnconfiguredOverride;

  // The details endpoint is the admin's own view: every link, published or not.
  const links: EventContentLink[] = details?.content_links ?? [];
  const slides = links.filter((link) => link.kind !== 'recording');
  const recordings = links.filter((link) => link.kind === 'recording');

  // Changing a link invalidates the caches this query reads, so the lists
  // stay current without wiring callbacks through.

  if (!event) {
    return null;
  }

  return (
    <section aria-labelledby="content-title" className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="border-foreground flex flex-wrap items-end justify-between gap-3 border-b pb-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="content-title" className="text-base font-bold">
            {t('title')}
          </h2>
          <p className="text-ink-2 text-sm">{t('subtitle')}</p>
        </div>
        <DriveStorageBadge />
      </div>

      {/* Loading, error and empty look nothing alike: a failed call must
          never read as "there are no links here". */}
      {isLoading ? (
        <RowsSkeleton rows={3} />
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>{t('loadFailed')}</AlertTitle>
          <AlertDescription className="flex flex-col gap-2">
            <span>{error.message}</span>
            <Button size="sm" variant="outline" className="w-fit" onClick={() => void refetch()}>
              {t('retry')}
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <section aria-labelledby="content-slides" className="flex flex-col gap-3">
            <SectionHead
              as="h3"
              id="content-slides"
              title={t('slidesSection')}
              count={slides.length}
              action={
                !driveConfigured ? (
                  <ContentLinkAddDialog
                    eventId={event.id}
                    initialKind="slides"
                    buttonLabel={t('addSlideLink')}
                    size="sm"
                  />
                ) : undefined
              }
            />

            {!driveConfigured && (
              <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200">
                <AlertCircle className="size-4 text-amber-600 dark:text-amber-400" />
                <AlertDescription className="text-xs">
                  {t('driveUnconfiguredNotice')}
                </AlertDescription>
              </Alert>
            )}

            <SlidesDropzone
              eventId={event.id}
              onDriveUnconfigured={() => setDriveUnconfiguredOverride(true)}
            />

            {slides.length === 0 ? (
              <EmptyLine>{t('slidesEmpty')}</EmptyLine>
            ) : (
              <ul className="flex flex-col">
                {slides.map((link) => (
                  <ContentLinkItem key={link.id} eventId={event.id} link={link} />
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="content-recordings" className="flex flex-col gap-3">
            <SectionHead
              as="h3"
              id="content-recordings"
              title={t('recordingsSection')}
              count={recordings.length}
              action={
                <div className="flex items-center gap-2">
                  <RecordingPickerDialog eventId={event.id} />
                  <ContentLinkAddDialog
                    eventId={event.id}
                    initialKind="recording"
                    buttonLabel={t('addRecordingLink')}
                    size="sm"
                  />
                </div>
              }
            />

            {recordings.length === 0 ? (
              <EmptyLine>{t('recordingsEmpty')}</EmptyLine>
            ) : (
              <ul className="flex flex-col">
                {recordings.map((link) => (
                  <ContentLinkItem key={link.id} eventId={event.id} link={link} />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </section>
  );
}
