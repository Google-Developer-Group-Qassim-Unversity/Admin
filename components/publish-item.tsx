'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Check, Upload, Loader2, ExternalLink, Lock } from 'lucide-react';
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

  // Colour = state: blue while open for signup, neutral when draft or locked.
  const getStatusIcon = () => {
    if (isLocked) {
      return <Lock className="h-5 w-5" />;
    }
    if (isPublished) {
      return <Check className="h-5 w-5" />;
    }
    return <Upload className="h-5 w-5" />;
  };

  return (
    <Item
      variant="outline"
      className={isLocked ? 'bg-muted/40' : isPublished ? 'bg-card border-brand-blue/40' : 'bg-card'}
    >
      <ItemMedia>
        <div className={`flex size-10 items-center justify-center rounded-lg ${
          isPublished && !isLocked ? 'bg-brand-blue-soft text-brand-blue-ink' : 'bg-muted text-muted-foreground'
        }`}>
          {getStatusIcon()}
        </div>
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle>{t('title')}</ItemTitle>
        <ItemDescription className="line-clamp-none">
          <span className="flex flex-col gap-1">
            <span>{getStatusDescription()}</span>
            {hasGoogleForm && !isLocked && (
              <span className="text-[13px] text-muted-foreground">{t('googleFormNote')}</span>
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
                <ExternalLink className="ms-2 h-4 w-4 rtl:-scale-x-100" />
              </a>
            </Button>
          </>
        )}
        {isLocked ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span tabIndex={0} className="flex-1 sm:flex-none">
                <Button disabled variant="outline" className="w-full">
                  <Lock className="me-2 h-4 w-4" />
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
            variant={isPublished ? 'outline' : 'default'}
          >
            {isLoading ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" />
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
