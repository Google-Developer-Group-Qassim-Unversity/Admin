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
import { Check, Upload, Loader2, ExternalLink } from 'lucide-react';
import { useAuth } from '@clerk/nextjs';
import { useUpdateEvent } from '@/hooks/use-event';
import { usePublishForm } from '@/hooks/use-form-data';
import { toast } from 'sonner';
import type { Event, GoogleFormData } from '@/lib/api-types';

interface PublishItemProps {
  event: Event;
  formData: GoogleFormData | null;
  onEventChange: () => void;
}

export function PublishItem({ event, formData, onEventChange }: PublishItemProps) {
  const { getToken } = useAuth();
  const updateEvent = useUpdateEvent(getToken);
  const publishForm = usePublishForm(event.id);

  const isLoading = updateEvent.isPending || publishForm.isPending;
  const isPublished = event.status === 'open';
  const hasGoogleForm = formData?.googleFormId;

  const handlePublish = async () => {
    try {
      // If event has a Google form, ensure it's published first
      if (hasGoogleForm && formData?.googleFormId) {
        await publishForm.mutateAsync(formData.googleFormId);
      }

      await updateEvent.mutateAsync({
        id: event.id,
        data: { ...event, status: 'open' },
      });

      toast.success('Event published successfully!');
      onEventChange();
    } catch {
      toast.error('Failed to publish event. Please try again.');
    }
  };

  const handleUnpublish = async () => {
    try {
      await updateEvent.mutateAsync({
        id: event.id,
        data: { ...event, status: 'announced' },
      });

      toast.success('Event unpublished successfully!');
      onEventChange();
    } catch {
      toast.error('Failed to unpublish event. Please try again.');
    }
  };

  return (
    <Item 
      variant="outline"
      className={isPublished ? 'bg-green-500/10 border-green-500/30' : ''}
    >
      <ItemMedia variant="image">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isPublished ? 'bg-green-500/20' : 'bg-muted'}`}>
          {isPublished ? (
            <Check className="w-6 h-6 text-green-500" />
          ) : (
            <Upload className="w-6 h-6 text-muted-foreground" />
          )}
        </div>
      </ItemMedia>
      <ItemContent>
        <ItemTitle>Publish Event</ItemTitle>
        <ItemDescription>
          {isPublished ? 'Event is open for registration' : 'Make event available for registration'}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        <div className="flex items-center gap-2">
          {isPublished && hasGoogleForm && formData?.googleRespondersUrl && (
            <Button variant="outline" size="sm" asChild>
              <a 
                href={formData.googleRespondersUrl} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                Open Form
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          )}
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
        </div>
      </ItemActions>
    </Item>
  );
}
