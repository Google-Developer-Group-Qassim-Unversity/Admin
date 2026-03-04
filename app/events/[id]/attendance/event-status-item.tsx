'use client';

import { useState } from 'react';
import { DoorClosed, DoorOpen, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/components/ui/item';
import { CloseEventModal } from '@/components/close-event-modal';
import { useOpenEvent } from '@/hooks/use-event';
import type { Event } from '@/lib/api-types';

interface EventStatusItemProps {
  event: Event;
  isEventClosed: boolean;
  onStatusChange: () => void;
  getToken: () => Promise<string | null>;
}

export function EventStatusItem({ event, isEventClosed, onStatusChange, getToken }: EventStatusItemProps) {
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const openEventMutation = useOpenEvent(getToken);

  const handleOpenEvent = async () => {
    try {
      await openEventMutation.mutateAsync(event.id);
      toast.success('Event re-opened successfully');
      onStatusChange();
    } catch (error) {
      toast.error('Failed to open event', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  return (
    <>
      <Item variant="outline">
        <ItemContent>
          <ItemTitle>{isEventClosed ? 'Re-open Event' : 'Close Event'}</ItemTitle>
          <ItemDescription>
            {isEventClosed
              ? 'Re-open the event to resume accepting attendance.'
              : 'When attendance is complete, close the event to finalize and optionally send certificates.'}
          </ItemDescription>
        </ItemContent>
        <ItemActions>
          {isEventClosed ? (
            <Button
              variant="outline"
              onClick={handleOpenEvent}
              disabled={openEventMutation.isPending}
            >
              {openEventMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Opening...
                </>
              ) : (
                <>
                  <DoorOpen className="h-4 w-4" />
                  Open Event
                </>
              )}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setIsCloseModalOpen(true)}>
              <DoorClosed className="h-4 w-4" />
              Close Event
            </Button>
          )}
        </ItemActions>
      </Item>

      <CloseEventModal
        event={event}
        open={isCloseModalOpen}
        onOpenChange={setIsCloseModalOpen}
        onSuccess={onStatusChange}
      />
    </>
  );
}
