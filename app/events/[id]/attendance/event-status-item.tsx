'use client';

import { useState } from 'react';
import { DoorClosed, DoorOpen, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/status-badge';
import { CloseEventModal } from '@/components/close-event-modal';
import { useOpenEvent } from '@/hooks/use-event';
import type { Event } from '@/lib/api-types';
import { useTranslations } from 'next-intl';

interface EventStatusItemProps {
  event: Event;
  isEventClosed: boolean;
  onStatusChange: () => void;
}

export function EventStatusItem({ event, isEventClosed, onStatusChange }: EventStatusItemProps) {
  const t = useTranslations('attendance.statusItem');
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const openEventMutation = useOpenEvent();

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
      <section className="bg-card ring-foreground/10 flex flex-col gap-3 rounded-xl p-4 shadow-xs ring-1 sm:flex-row sm:items-center sm:gap-6 sm:px-6">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h2 className="font-display text-base font-semibold tracking-tight">
              {isEventClosed ? t('reopenTitle') : t('closeTitle')}
            </h2>
            <StatusBadge status={event.status} />
          </div>
          <p className="text-muted-foreground text-[13px] sm:text-sm">
            {isEventClosed ? t('reopenDescription') : t('closeDescription')}
          </p>
        </div>
        {isEventClosed ? (
          <Button
            onClick={handleOpenEvent}
            disabled={openEventMutation.isPending}
            className="w-full shrink-0 sm:w-auto"
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
          <Button
            variant="outline"
            onClick={() => setIsCloseModalOpen(true)}
            className="w-full shrink-0 sm:w-auto"
          >
            <DoorClosed className="h-4 w-4" />
            {t('closeEvent')}
          </Button>
        )}
      </section>

      <CloseEventModal
        event={event}
        open={isCloseModalOpen}
        onOpenChange={setIsCloseModalOpen}
        onSuccess={onStatusChange}
      />
    </>
  );
}
