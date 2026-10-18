'use client';

import * as React from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, Presentation, Video } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ContentLinkAddDialog } from '@/components/content-link-add-dialog';
import { ContentLinkItem } from '@/components/content-link-item';
import { DriveStorageBadge } from '@/components/drive-storage-badge';
import { RecordingPickerDialog } from '@/components/recording-picker-dialog';
import { SlidesDropzone } from '@/components/slides-dropzone';
import { useEventContext } from '@/contexts/event-context';
import { useEventDetails } from '@/hooks/use-event';
import type { EventContentLink } from '@/lib/api-types';

export default function EventContentPage() {
  const t = useTranslations('eventContent');
  const { event } = useEventContext();
  const eventId = event?.id ?? 0;
  const { data: details, isLoading, error, refetch } = useEventDetails(eventId, eventId !== 0);
  const [driveConfigured, setDriveConfigured] = React.useState(true);

  React.useEffect(() => {
    setDriveConfigured(true);
  }, [event?.id]);

  // The details endpoint is the admin's own view: every link, published or not.
  const links: EventContentLink[] = details?.content_links ?? [];
  const slides = links.filter((link) => link.kind !== 'recording');
  const recordings = links.filter((link) => link.kind === 'recording');

  // Changing a link invalidates the caches this query reads, so the card
  // stays current without wiring callbacks through.

  if (!event) {
    return null;
  }

  return (
    <Card className="mx-auto max-w-3xl max-sm:gap-4 max-sm:bg-transparent max-sm:py-0 max-sm:shadow-none max-sm:ring-0">
      <CardHeader className="max-sm:px-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="font-display text-lg font-semibold tracking-tight">{t('title')}</CardTitle>
            <CardDescription>{t('subtitle')}</CardDescription>
          </div>
          <DriveStorageBadge />
        </div>
      </CardHeader>
      <CardContent className="space-y-8 max-sm:px-0">
        {/* Loading, error and empty look nothing alike: a failed call must
            never read as "there are no links here". */}
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
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
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Presentation className="h-4 w-4" />
                  {t('slidesSection')}
                </h2>
                {!driveConfigured && (
                  <ContentLinkAddDialog
                    eventId={event.id}
                    initialKind="slides"
                    buttonLabel={t('addSlideLink')}
                    size="sm"
                  />
                )}
              </div>

              {!driveConfigured && (
                <Alert className="border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <AlertDescription className="text-xs">
                    {t('driveUnconfiguredNotice')}
                  </AlertDescription>
                </Alert>
              )}

              <SlidesDropzone
                eventId={event.id}
                onDriveUnconfigured={() => setDriveConfigured(false)}
              />

              {slides.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('slidesEmpty')}</p>
              ) : (
                <div className="space-y-3">
                  {slides.map((link) => (
                    <ContentLinkItem key={link.id} eventId={event.id} link={link} />
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Video className="h-4 w-4" />
                  {t('recordingsSection')}
                </h2>
                <div className="flex items-center gap-2">
                  <RecordingPickerDialog eventId={event.id} />
                  <ContentLinkAddDialog
                    eventId={event.id}
                    initialKind="recording"
                    buttonLabel={t('addRecordingLink')}
                    size="sm"
                  />
                </div>
              </div>

              {recordings.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('recordingsEmpty')}</p>
              ) : (
                <div className="space-y-3">
                  {recordings.map((link) => (
                    <ContentLinkItem key={link.id} eventId={event.id} link={link} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </CardContent>
    </Card>
  );
}
