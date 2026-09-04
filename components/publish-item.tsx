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
import { Check, Upload, Loader2, ExternalLink, Lock, Copy } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
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
  const { getToken } = useAuth();
  const publishEvent = usePublishEvent(getToken);
  const unpublishEvent = useUnpublishEvent(getToken);

  const isLoading = publishEvent.isPending || unpublishEvent.isPending;
  const isPublished = event.status === 'open';
  const hasGoogleForm = formData?.googleFormId;
  // Disable publish/unpublish when event is active or closed
  const isLocked = event.status === 'active' || event.status === 'closed';

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

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${config.memberAppUrl}/events/${event.id}`);
      toast.success(t('linkCopied'));
    } catch {
      toast.error(t('copyFailed'));
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

  const getStatusIcon = () => {
    if (isLocked) {
      return <Lock className="w-6 h-6 text-muted-foreground" />;
    }
    if (isPublished) {
      return <Check className="w-6 h-6 text-green-500" />;
    }
    return <Upload className="w-6 h-6 text-muted-foreground" />;
  };

  const getItemClassName = () => {
    if (isLocked) {
      return 'bg-muted/30 border-muted';
    }
    if (isPublished) {
      return 'bg-green-500/10 border-green-500/30';
    }
    return '';
  };

  return (
    <Item 
      variant="outline"
      className={getItemClassName()}
    >
      <ItemMedia variant="image">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
          isLocked ? 'bg-muted' : isPublished ? 'bg-green-500/20' : 'bg-muted'
        }`}>
          {getStatusIcon()}
        </div>
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{t('title')}</ItemTitle>
        <ItemDescription>
          <div className="flex flex-col gap-1">
            <span>{getStatusDescription()}</span>
            {hasGoogleForm && !isLocked && (
              <span className="text-xs text-muted-foreground">{t('googleFormNote')}</span>
            )}
          </div>
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <div className="flex items-center gap-2">
          {isPublished && (
            <>
              <Button variant="outline" size="sm" onClick={handleCopyLink}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a 
                  href={`${config.memberAppUrl}/events/${event.id}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  {t('openEvent')}
                  <ExternalLink className="ms-2 h-4 w-4" />
                </a>
              </Button>
            </>
          )}
          {isLocked ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <Button
                    disabled
                    variant="outline"
                  >
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
        </div>
      </ItemActions>
    </Item>
  );
}
