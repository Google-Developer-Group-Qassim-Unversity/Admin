'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ClipboardList, Copy, Loader2, Presentation, Save, Trash2, Video } from 'lucide-react';
import { toast } from 'sonner';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Plate } from '@/components/najdi';
import { CONTENT_LINK_TONE, StatePill } from '@/components/status-badge';
import { useDeleteContentLink, useUpdateContentLink } from '@/hooks/use-event';
import { looksLikeUrl } from '@/lib/content-links';
import type { ContentLinkKind, EventContentLink } from '@/lib/api-types';

const KIND_ICON: Record<ContentLinkKind, typeof Presentation> = {
  slides: Presentation,
  recording: Video,
  other: ClipboardList,
};

interface ContentLinkItemProps {
  eventId: number;
  link: EventContentLink;
}

/**
 * One content link as a row on the wall: a plate in its publish state, the
 * label and URL editable in place, and under them the state pill, the publish
 * switch and the copy / delete actions.
 */
export function ContentLinkItem({ eventId, link }: ContentLinkItemProps) {
  const t = useTranslations('eventContent');
  const common = useTranslations('common');
  const updateLink = useUpdateContentLink(eventId);
  const deleteLink = useDeleteContentLink(eventId);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const savedLabel = link.label;
  const savedUrl = link.url;
  const [label, setLabel] = useState(savedLabel);
  const [url, setUrl] = useState(savedUrl);
  const [saved, setSaved] = useState({ label: savedLabel, url: savedUrl });

  // The details query refetches after any change on this tab (and after
  // reloads), so follow the server's values whenever they change underneath
  // us - adjusted during render, the way unbuilt props are meant to land.
  if (saved.label !== savedLabel || saved.url !== savedUrl) {
    setSaved({ label: savedLabel, url: savedUrl });
    setLabel(savedLabel);
    setUrl(savedUrl);
  }

  const isDirty = label.trim() !== savedLabel || url.trim() !== savedUrl;
  // The same gate the add dialog holds: a saved row can never hold an empty
  // label or a paste that was never a link.
  const canSave = isDirty && label.trim() !== '' && looksLikeUrl(url.trim());
  const pending = updateLink.isPending || deleteLink.isPending;
  const Icon = KIND_ICON[link.kind];
  const tone = CONTENT_LINK_TONE[link.published ? 'published' : 'unpublished'];
  const switchId = `content-link-published-${link.id}`;

  const save = () => {
    if (!canSave) return;
    updateLink.mutate(
      { linkId: link.id, data: { label: label.trim(), url: url.trim() } },
      {
        // The mutation returns the stored row - the server may have trimmed or
        // normalized the paste, so reset from it now; waiting for the refetch
        // to redefine "saved" would flicker Save back into view.
        onSuccess: (stored) => {
          setSaved({ label: stored.label, url: stored.url });
          setLabel(stored.label);
          setUrl(stored.url);
          toast.success(t('savedToast'));
        },
        onError: (error) => toast.error(t('saveFailed'), { description: error.message }),
      }
    );
  };

  const togglePublished = (published: boolean) => {
    updateLink.mutate(
      { linkId: link.id, data: { published } },
      {
        onError: (error) => {
          toast.error(t('saveFailed'), { description: error.message });
        },
      }
    );
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(savedUrl);
      toast.success(t('copied'));
    } catch {
      toast.error(t('copyFailed'));
    }
  };

  const remove = () => {
    deleteLink.mutate(link.id, {
      onSuccess: () => {
        setConfirmDelete(false);
        toast.success(t('deletedToast'));
      },
      onError: (error) => toast.error(t('deleteFailed'), { description: error.message }),
    });
  };

  return (
    <li className="border-rule flex items-start gap-3 border-b px-1 py-3">
      <Plate tone={tone} icon={Icon} className="mt-0.5" />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <Input
          type="text"
          dir="auto"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
          }}
          disabled={pending}
          aria-label={t('labelAria')}
          enterKeyHint="done"
          className="font-bold"
        />
        <Input
          type="text"
          inputMode="url"
          autoComplete="url"
          autoCapitalize="none"
          spellCheck={false}
          dir="ltr"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
          }}
          disabled={pending}
          aria-label={t('urlAria')}
          enterKeyHint="done"
          className="text-ink-2 text-[13px] md:text-[13px]"
        />
        {isDirty && !canSave && !pending && (
          <p className="text-door-madder-ink text-[13px]" dir="auto">
            {label.trim() === '' ? t('labelInvalid') : t('rowInvalid')}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <StatePill tone={tone}>{link.published ? t('publishedBadge') : t('unpublishedBadge')}</StatePill>
          {canSave && (
            <Button size="sm" onClick={save} disabled={pending}>
              {updateLink.isPending ? <Loader2 className="animate-spin" /> : <Save />}
              {t('save')}
            </Button>
          )}

          <div className="ms-auto flex items-center gap-1">
            {updateLink.isPending && !canSave && <Loader2 className="text-ink-2 size-4 animate-spin" aria-hidden="true" />}
            <label htmlFor={switchId} className="flex min-h-11 cursor-pointer items-center px-2">
              <span className="sr-only">{t('publishAria')}</span>
              <Switch id={switchId} checked={link.published} onCheckedChange={togglePublished} disabled={pending} />
            </label>
            <Button variant="ghost" size="icon" onClick={copyUrl} title={t('copyLink')} aria-label={t('copyLink')}>
              <Copy />
            </Button>
            <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
              <Button
                variant="ghost"
                size="icon"
                className="text-door-madder-ink hover:text-door-madder-ink"
                onClick={() => setConfirmDelete(true)}
                disabled={pending}
                title={t('deleteLink')}
                aria-label={t('deleteLink')}
              >
                {deleteLink.isPending ? <Loader2 className="animate-spin" /> : <Trash2 />}
              </Button>
              <AlertDialogContent
                closeLabel={common('actions.close')}
                closeDisabled={deleteLink.isPending}
              >
                <AlertDialogHeader>
                  <AlertDialogTitle dir="auto">{t('deleteTitle')}</AlertDialogTitle>
                  <AlertDialogDescription dir="auto">{t('deleteDescription')}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleteLink.isPending}>{t('deleteCancel')}</AlertDialogCancel>
                  <AlertDialogAction
                    variant="madder"
                    onClick={(e) => {
                      e.preventDefault();
                      remove();
                    }}
                    disabled={deleteLink.isPending}
                  >
                    {deleteLink.isPending ? <Loader2 className="animate-spin" /> : t('deleteLink')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </div>
    </li>
  );
}
