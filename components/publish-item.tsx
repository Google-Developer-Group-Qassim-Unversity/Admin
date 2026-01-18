'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { Check, Upload, Loader2 } from 'lucide-react';
import { updateEvent } from '@/lib/api';
import { useAuth } from '@clerk/nextjs';
import { toast } from 'sonner';
import type { Event } from '@/lib/api-types';

interface FormData {
  id?: number;
  googleFormId: string | null;
  formName: string | null;
}

interface PublishItemProps {
  event: Event;
  formData: FormData | null;
  onEventChange: () => void;
}

export function PublishItem({ event, formData, onEventChange }: PublishItemProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { getToken } = useAuth();
  const isPublished = event.status === 'open';
  const hasGoogleForm = formData?.googleFormId;

  const handlePublish = async () => {
    setIsLoading(true);
    try {
      // If event has a Google form, ensure it's published
      if (hasGoogleForm && formData?.googleFormId) {
        try {
          // Call API to check and publish the Google form
          const response = await fetch('/api/drive/publish', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              eventId: event.id,
              formId: formData.googleFormId 
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to publish Google Form');
          }
        } catch (formError) {
          console.error('Error publishing Google Form:', formError);
          toast.error('Failed to publish Google Form. Please try again.');
          setIsLoading(false);
          return;
        }
      }

      // Update event status to 'open'
      const result = await updateEvent(
        event.id,
        { ...event, status: 'open' },
        getToken
      );

      if (result.success) {
        toast.success('Event published successfully!');
        onEventChange();
      } else {
        toast.error(result.error.message || 'Failed to publish event');
      }
    } catch (error) {
      console.error('Error publishing event:', error);
      toast.error('Failed to publish event. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnpublish = async () => {
    setIsLoading(true);
    try {
      // Update event status to 'announced'
      const result = await updateEvent(
        event.id,
        { ...event, status: 'announced' },
        getToken
      );

      if (result.success) {
        toast.success('Event unpublished successfully!');
        onEventChange();
      } else {
        toast.error(result.error.message || 'Failed to unpublish event');
      }
    } catch (error) {
      console.error('Error unpublishing event:', error);
      toast.error('Failed to unpublish event. Please try again.');
    } finally {
      setIsLoading(false);
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
      </ItemActions>
    </Item>
  );
}
