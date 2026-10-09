'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/components/ui/item';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Loader2, ExternalLink, Lock } from 'lucide-react';
import { usePublishEvent, useUnpublishEvent } from '@/hooks/use-event';
import { toast } from 'sonner';
import type { Event, GoogleFormData } from '@/lib/api-types';
import { config } from '@/lib/config';

interface PublishItemProps {
  event: Event;
  formData: GoogleFormData | null;
  onEventChange: () => void;
}

export function PublishItem({ event, formData, onEventChange }: PublishItemProps) {
  const t = useTranslations('publishItem');
  const publishEvent = usePublishEvent();
  const unpublishEvent = useUnpublishEvent();

  const isLoading = publishEvent.isPending || unpublishEvent.isPending;
  const isPublished = event.status === 'open';
  const hasGoogleForm = formData?.googleFormId;
  // Disable publish/unpublish when event is active or closed
  const isLocked = event.status === 'active' || event.status === 'closed';
  const eventUrl = `${config.memberAppUrl}/events/${event.id}`;

  const handlePublish = async () => {
    try {
      await publishEvent.mutateAsync(event.id);
      toast.success(t('publishedSuccess'));
      onEventChange();
    } catch {
      toast.error(t('publishFailed'));
    }
  };

  const handleUnpublish = async () => {
    try {
      await unpublishEvent.mutateAsync(event.id);
      toast.success(t('unpublishedSuccess'));
      onEventChange();
    } catch {
      toast.error(t('unpublishFailed'));
    }
  };

  const getStatusDescription = () => {
    if (isLocked) {
      return event.status === 'active'
        ? t('activeLocked')
        : t('closedLocked');
    }
    return isPublished ? t('openDescription') : t('closedDescription');
  };


  return (
    <Item className="px-0 py-0">
      <ItemContent className="min-w-0">
        <ItemTitle className="text-[15px] font-bold">{t('title')}</ItemTitle>
        <ItemDescription className="text-ink-2 line-clamp-none">
          <span className="flex flex-col gap-1">
            <span>{getStatusDescription()}</span>
            {hasGoogleForm && !isLocked && (
              <span className="text-[13px] text-ink-2">{t('googleFormNote')}</span>
            )}
          </span>
        </ItemDescription>
      </ItemContent>
      {/* Phone: actions take a full-width row, placed after the link below. */}
      <ItemActions className="w-full max-sm:order-last sm:w-auto">
        {isPublished && (
          <>
            <Button variant="outline" className="flex-1 sm:flex-none" asChild>
              <a href={eventUrl} target="_blank" rel="noopener noreferrer">
                {t('openEvent')}
                <ExternalLink className="rtl:-scale-x-100" />
              </a>
            </Button>
          </>
        )}
        {isLocked ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0} className="flex-1 sm:flex-none">
                <Button disabled variant="outline" className="w-full">
                  <Lock />
                  {t('locked')}
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>
              {t('lockedTooltip')}
            </TooltipContent>
          </Tooltip>
        ) : (
          <Button
            className="flex-1 sm:flex-none"
            onClick={isPublished ? handleUnpublish : handlePublish}
            disabled={isLoading}
            variant={isPublished ? 'outline' : 'green'}
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin" />
                {isPublished ? t('unpublishing') : t('publishing')}
              </>
            ) : (
              isPublished ? t('unpublish') : t('publish')
            )}
          </Button>
        )}
      </ItemActions>
    </Item>
  );
}
