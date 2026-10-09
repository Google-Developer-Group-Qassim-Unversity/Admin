'use client';

import { useState } from 'react';
import { DoorClosed, DoorOpen, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/status-badge';
import { Door, Plate } from '@/components/najdi';
import { eventTone } from '@/components/event-bits';
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

  const [now] = useState(() => Date.now());
  const overdue = !isEventClosed && eventTone(event, now) === 'madder';

  const reopenButton = (
    <Button variant="outline" onClick={handleOpenEvent} disabled={openEventMutation.isPending} className="w-full shrink-0 sm:w-auto">
      {openEventMutation.isPending ? (
        <>
          <Loader2 className="animate-spin" />
          {t('opening')}
        </>
      ) : (
        <>
          <DoorOpen />
          {t('openEvent')}
        </>
      )}
    </Button>
  );

  return (
    <>
      {overdue ? (
        // Ended without closing: the one thing on this page waiting on you.
        <Door tone="madder" innerClassName="sm:flex-row sm:items-center sm:gap-6">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <h2 className="font-display text-[21px] leading-tight font-semibold">{t('overdueTitle')}</h2>
            <p className="text-sm font-medium opacity-90">{t('closeDescription')}</p>
          </div>
          <Button
            onClick={() => setIsCloseModalOpen(true)}
            className="w-full shrink-0 bg-[var(--door-panel)] text-[var(--door-panel-ink)] hover:bg-[var(--door-panel)]/90 sm:w-auto"
          >
            <DoorClosed />
            {t('closeEvent')}
          </Button>
        </Door>
      ) : (
        <section className="border-rule flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:gap-6">
          <Plate tone={isEventClosed ? 'umber' : 'green'} icon={isEventClosed ? DoorClosed : DoorOpen} />
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
              <h2 className="text-base font-bold">{isEventClosed ? t('reopenTitle') : t('closeTitle')}</h2>
              <StatusBadge status={event.status} />
            </div>
            <p className="text-ink-2 text-[13.5px]">{isEventClosed ? t('reopenDescription') : t('closeDescription')}</p>
          </div>
          {isEventClosed ? (
            reopenButton
          ) : (
            <Button variant="green" onClick={() => setIsCloseModalOpen(true)} className="w-full shrink-0 sm:w-auto">
              <DoorClosed />
              {t('closeEvent')}
            </Button>
          )}
        </section>
      )}

      <CloseEventModal
        event={event}
        open={isCloseModalOpen}
        onOpenChange={setIsCloseModalOpen}
        onSuccess={onStatusChange}
      />
    </>
  );
}
