'use client';

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

interface PublishItemProps {
  event: Event;
  formData: GoogleFormData | null;
  onEventChange: () => void;
}

export function PublishItem({ event, formData, onEventChange }: PublishItemProps) {
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
      toast.success('Event published successfully!');
      onEventChange();
    } catch {
      toast.error('Failed to publish event. Please try again.');
    }
  };

  const handleUnpublish = async () => {
    try {
      await unpublishEvent.mutateAsync(event.id);
      toast.success('Event unpublished successfully!');
      onEventChange();
    } catch {
      toast.error('Failed to unpublish event. Please try again.');
    }
  };

  const handleCopyLink = async () => {
    const eventUrl = `${process.env.NEXT_PUBLIC_MEMBER_APP_URL}/events/${event.id}`;
    try {
      await navigator.clipboard.writeText(eventUrl);
      toast.success('Event link copied to clipboard!');
    } catch {
      toast.error('Failed to copy link. Please try again.');
    }
  };

  const getStatusDescription = () => {
    if (isLocked) {
      return event.status === 'active' 
        ? 'Event is active - publish status cannot be changed'
        : 'Event is closed - publish status cannot be changed';
    }
    return isPublished ? 'Event is open for registration' : 'Make event available for registration';
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
        <ItemTitle>Publish Event</ItemTitle>
        <ItemDescription>
          {getStatusDescription()}
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
                  href={`${process.env.NEXT_PUBLIC_MEMBER_APP_URL}/events/${event.id}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  Open Event
                  <ExternalLink className="ml-2 h-4 w-4" />
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
                    <Lock className="mr-2 h-4 w-4" />
                    Locked
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Cannot control publish status anymore because the event is either active or closed
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isPublished ? 'Unpublishing...' : 'Publishing...'}
                </>
              ) : (
                isPublished ? 'Unpublish' : 'Publish'
              )}
            </Button>
          )}
        </div>
      </ItemActions>
    </Item>
  );
}
