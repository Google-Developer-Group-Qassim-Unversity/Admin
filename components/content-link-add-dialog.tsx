'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { FolderUp, MonitorPlay, Presentation, ShieldCheck, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateContentLink } from '@/hooks/use-event';
import { looksLikeUrl } from '@/lib/content-links';
import type { ContentLinkKind } from '@/lib/api-types';

interface ContentLinkAddDialogProps {
  eventId: number;
}

// `other` stays valid in the schema (Phase 2 resurfaces it); the dialog here
// only offers the two choices admins always know.
const KIND_OPTIONS: ContentLinkKind[] = ['slides', 'recording'];

export function ContentLinkAddDialog({ eventId }: ContentLinkAddDialogProps) {
  const t = useTranslations('eventContent');
  const createLink = useCreateContentLink(eventId);
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const [kind, setKind] = useState<ContentLinkKind | ''>('');

  const isUrlValid = url.trim() === '' || looksLikeUrl(url);
  const canCreate = useMemo(
    () => label.trim().length > 0 && url.trim().length > 0 && kind !== '' && looksLikeUrl(url.trim()),
    [label, url, kind]
  );
  // One gate inside create(): the footer button and both Enter handlers read
  // the same guard, and a second Enter while the first POST is in flight
  // cannot double-insert (and then 409 on the duplicate label).
  const create = () => {
    if (!canCreate || createLink.isPending || kind === '') return;
    createLink.mutate(
      { label: label.trim(), url: url.trim(), kind },
      {
        onSuccess: () => {
          toast.success(t('createdToast'));
          reset();
          setOpen(false);
        },
        onError: (error) => toast.error(t('createFailed'), { description: error.message }),
      }
    );
  };

  const reset = () => {
    setLabel('');
    setUrl('');
    setKind('');
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          createLink.reset();
          reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="shrink-0">
          <Plus />
          {t('addLink')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('dialogTitle')}</DialogTitle>
          <DialogDescription>{t('dialogDescription')}</DialogDescription>
        </DialogHeader>

        {/* The fixed guidance from the issue discussion: members hear the
            sharing rules here, so the manual-add dialog carries them. */}
        <ul className="bg-sunk text-ink-2 flex flex-col gap-2 rounded-lg p-3 text-sm">
          <li className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span dir="auto">{t.rich('hints.setting', { em: (chunks) => <em>{chunks}</em> })}</span>
          </li>
          <li className="flex items-start gap-2">
            <FolderUp className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span dir="auto">{t('hints.personal')}</span>
          </li>
        </ul>

        <div className="grid gap-3 py-1">
          <div className="grid gap-1.5">
            <Label htmlFor="content-link-label">{t('labelField')}</Label>
            <Input
              id="content-link-label"
              type="text"
              dir="auto"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={
                t(
                  (kind === ''
                    ? 'labelPlaceholder'
                    : `labelPlaceholder${kind.charAt(0).toUpperCase()}${kind.slice(1)}`) as Parameters<typeof t>[0]
                )
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') create();
              }}
              enterKeyHint="go"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="content-link-url">{t('urlField')}</Label>
            <Input
              id="content-link-url"
              type="text"
              inputMode="url"
              autoComplete="url"
              autoCapitalize="none"
              spellCheck={false}
              dir="ltr"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t('urlPlaceholder')}
              aria-invalid={!isUrlValid}
              onKeyDown={(e) => {
                if (e.key === 'Enter') create();
              }}
            />
            {!isUrlValid && <p className="text-door-madder-ink text-[13px]">{t('urlInvalid')}</p>}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="content-link-kind">{t('kindField')}</Label>
            <Select
              value={kind || undefined}
              onValueChange={(value: ContentLinkKind) => setKind(value)}
            >
              <SelectTrigger id="content-link-kind" className="w-full">
                <SelectValue placeholder={t('kindPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {KIND_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    <span className="inline-flex items-center gap-2">
                      {option === 'recording' ? (
                        <MonitorPlay className="size-4" />
                      ) : (
                        <Presentation className="size-4" />
                      )}
                      {t(`kind${option.charAt(0).toUpperCase()}${option.slice(1)}` as Parameters<typeof t>[0])}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={create} disabled={!canCreate || createLink.isPending}>
            {t('create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
