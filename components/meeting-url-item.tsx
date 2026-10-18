'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Copy, ExternalLink, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Item,
  ItemContent,
  ItemDescription,
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

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(savedUrl);
      toast.success(t('copied'));
    } catch {
      toast.error(t('copyFailed'));
    }
  };

  return (
    <Item className="px-0 py-0">
      <ItemContent className="min-w-0">
        <ItemTitle className="text-[15px] font-bold">{t('title')}</ItemTitle>
        <ItemDescription className="text-ink-2 line-clamp-none">
          {savedUrl
            ? t('descriptionSaved')
            : t('descriptionEmpty')}
        </ItemDescription>
      </ItemContent>
      {/* Its own row under the text, so the description is never squeezed.
          Phone: the field gets a full row, the buttons share the row under it;
          sm+: one row, indented to line up with the title. */}
      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:ps-[3.375rem]">
        <Input
          type="text"
          inputMode="url"
          autoComplete="url"
          autoCapitalize="none"
          spellCheck={false}
          enterKeyHint="done"
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
          className="w-full min-w-0 text-ellipsis sm:flex-1"
        />
        <div className="flex gap-2">
          <Button
            className="flex-1 sm:flex-none"
            onClick={() => save(trimmed || null)}
            disabled={!isDirty || updateMeetingUrl.isPending}
          >
            {updateMeetingUrl.isPending ? (
              <>
                <Loader2 className="animate-spin" />
                {tc('saving')}
              </>
            ) : (
              t('save')
            )}
          </Button>
          {savedUrl && (
            <>
              <Button variant="outline" size="icon" onClick={copyLink} title={t('copyLink')} aria-label={t('copyLink')}>
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" asChild>
                <a href={savedUrl} target="_blank" rel="noopener noreferrer" title={t('openLink')} aria-label={t('openLink')}>
                  <ExternalLink className="h-4 w-4 rtl:-scale-x-100" />
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
      </div>
    </Item>
  );
}
