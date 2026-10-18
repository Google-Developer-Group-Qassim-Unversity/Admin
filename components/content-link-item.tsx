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
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
} from '@/components/ui/item';
import { Switch } from '@/components/ui/switch';
import { StatePill } from '@/components/status-badge';
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
    <Item variant="outline" className="bg-card flex-col flex-nowrap gap-2 sm:gap-2">
      <div className="flex w-full flex-nowrap items-start gap-3">
        <ItemMedia>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <Icon className="h-5 w-5" />
          </div>
        </ItemMedia>
        <ItemContent className="min-w-0 flex-1 gap-1.5">
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
            className="w-full min-w-0"
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
            className="w-full min-w-0 text-sm text-muted-foreground"
          />
          {isDirty && !canSave && !pending && (
            <p className="text-xs text-destructive" dir="auto">
              {label.trim() === '' ? t('labelInvalid') : t('rowInvalid')}
            </p>
          )}
        </ItemContent>
        <ItemActions className="shrink-0 flex-col sm:flex-row">
          {updateLink.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Switch
            checked={link.published}
            onCheckedChange={togglePublished}
            disabled={pending}
            aria-label={t('publishAria')}
          />
          <Button variant="outline" size="icon" onClick={copyUrl} title={t('copyLink')} aria-label={t('copyLink')}>
            <Copy className="h-4 w-4" />
          </Button>
          <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
            <Button
              variant="outline"
              size="icon"
              className="text-destructive hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
              disabled={pending}
              title={t('deleteLink')}
              aria-label={t('deleteLink')}
            >
              {deleteLink.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
                  onClick={(e) => {
                    e.preventDefault();
                    remove();
                  }}
                  disabled={deleteLink.isPending}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  {deleteLink.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : t('deleteLink')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </ItemActions>
      </div>
      <div className="flex items-center gap-2 ps-13">
        {canSave && (
          <Button size="sm" variant="outline" onClick={save} disabled={pending}>
            {updateLink.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {t('save')}
          </Button>
        )}
        {link.published ? (
          <StatePill tone="green">{t('publishedBadge')}</StatePill>
        ) : (
          <StatePill tone="neutral">{t('unpublishedBadge')}</StatePill>
        )}
      </div>
    </Item>
  );
}
