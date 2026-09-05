'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, ExternalLink, Loader2, Trash2, Video } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import { useUpdateEventMeetingUrl } from '@/hooks/use-event';
import type { Event } from '@/lib/api-types';

interface MeetingUrlItemProps {
  event: Event;
  onEventChange: () => void;
}

export function MeetingUrlItem({ event, onEventChange }: MeetingUrlItemProps) {
  const t = useTranslations('meetingUrlItem');
  const tc = useTranslations('common.states');
  const updateMeetingUrl = useUpdateEventMeetingUrl();
  const savedUrl = event.meeting_url ?? '';
  const [value, setValue] = useState(savedUrl);

  // The event refetches after a save (and after edits on other tabs), so follow
  // the server's value whenever it changes underneath us.
  useEffect(() => {
    setValue(savedUrl);
  }, [savedUrl]);

  const trimmed = value.trim();
  const isDirty = trimmed !== savedUrl;

  const save = (meetingUrl: string | null) => {
    updateMeetingUrl.mutate(
      { id: event.id, meetingUrl },
      {
        onSuccess: () => {
          toast.success(meetingUrl ? t('savedToast') : t('removedToast'));
          onEventChange();
        },
        onError: (error) => {
          toast.error(t('saveFailed'), { description: error.message });
        },
      }
    );
  };

  return (
    <Item variant="outline" className="flex-wrap">
      <ItemMedia variant="image">
        <div
          className={`w-12 h-12 rounded-lg flex items-center justify-center ${
            savedUrl ? 'bg-green-500/20' : 'bg-muted'
          }`}
        >
          {savedUrl ? (
            <Check className="w-6 h-6 text-green-500" />
          ) : (
            <Video className="w-6 h-6 text-muted-foreground" />
          )}
        </div>
      </ItemMedia>
      <ItemContent>
        <ItemTitle>{t('title')}</ItemTitle>
        <ItemDescription>
          {savedUrl
            ? t('descriptionSaved')
            : t('descriptionEmpty')}
        </ItemDescription>
      </ItemContent>
      <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
        <Input
          type="text"
          inputMode="url"
          dir="ltr"
          placeholder={t('placeholder')}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && isDirty) {
              save(trimmed || null);
            }
          }}
          disabled={updateMeetingUrl.isPending}
          aria-label={t('ariaLabel')}
          className="min-w-0 flex-1 sm:w-80"
        />
        <Button
          onClick={() => save(trimmed || null)}
          disabled={!isDirty || updateMeetingUrl.isPending}
        >
          {updateMeetingUrl.isPending ? (
            <>
              <Loader2 className="me-2 h-4 w-4 animate-spin" />
              {tc('saving')}
            </>
          ) : (
            t('save')
          )}
        </Button>
        {savedUrl && (
          <>
            <Button variant="outline" size="icon" asChild>
              <a href={savedUrl} target="_blank" rel="noopener noreferrer" title={t('openLink')} aria-label={t('openLink')}>
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
            <Button
              variant="outline"
              size="icon"
              title={t('removeLink')}
              aria-label={t('removeLink')}
              onClick={() => save(null)}
              disabled={updateMeetingUrl.isPending}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </Item>
  );
}
