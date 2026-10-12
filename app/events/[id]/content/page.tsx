'use client';

import { useTranslations } from 'next-intl';
import { Presentation, Video } from 'lucide-react';

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ContentLinkAddDialog } from '@/components/content-link-add-dialog';
import { ContentLinkItem } from '@/components/content-link-item';
import { useEventContext } from '@/contexts/event-context';
import { useEventDetails } from '@/hooks/use-event';
import type { EventContentLink } from '@/lib/api-types';

export default function EventContentPage() {
  const t = useTranslations('eventContent');
  const { event } = useEventContext();
  const eventId = event?.id ?? 0;
  const { data: details } = useEventDetails(eventId, eventId !== 0);

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
        <CardTitle className="font-display text-lg font-semibold tracking-tight">{t('title')}</CardTitle>
        <CardDescription>{t('subtitle')}</CardDescription>
        <CardAction>
          <ContentLinkAddDialog eventId={event.id} />
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-6 max-sm:px-0">
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Presentation className="h-4 w-4" />
            {t('slidesSection')}
          </h2>
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

        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Video className="h-4 w-4" />
            {t('recordingsSection')}
          </h2>
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
      </CardContent>
    </Card>
  );
}
