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
import { useTranslations } from 'next-intl';

interface EventStatusItemProps {
  event: Event;
  isEventClosed: boolean;
  onStatusChange: () => void;
  getToken: () => Promise<string | null>;
}

export function EventStatusItem({ event, isEventClosed, onStatusChange, getToken }: EventStatusItemProps) {
  const t = useTranslations('attendance.statusItem');
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const openEventMutation = useOpenEvent(getToken);

  const handleOpenEvent = async () => {
    try {
      await openEventMutation.mutateAsync(event.id);
      toast.success(t('reopenSuccess'));
      onStatusChange();
    } catch (error) {
      toast.error(t('reopenFailed'), {
        description: error instanceof Error ? error.message : t('unknownError'),
      });
    }
  };

  return (
    <>
      <Item variant="outline">
        <ItemContent>
          <ItemTitle>{isEventClosed ? t('reopenTitle') : t('closeTitle')}</ItemTitle>
          <ItemDescription>
            {isEventClosed
              ? t('reopenDescription')
              : t('closeDescription')}
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
                  {t('opening')}
                </>
              ) : (
                <>
                  <DoorOpen className="h-4 w-4" />
                  {t('openEvent')}
                </>
              )}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setIsCloseModalOpen(true)}>
              <DoorClosed className="h-4 w-4" />
              {t('closeEvent')}
            </Button>
          )}
        </ItemActions>
      </Item>

      <CloseEventModal
        event={event}
        open={isCloseModalOpen}
        onOpenChange={setIsCloseModalOpen}
        onSuccess={onStatusChange}
        getToken={getToken}
      />
    </>
  );
}
