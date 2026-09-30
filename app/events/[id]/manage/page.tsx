'use client';

import { useAuth } from '@clerk/nextjs';
import { Copy, Loader2, QrCode } from 'lucide-react';
import { toast } from 'sonner';

import { FormsCopyItem } from '@/components/forms-copy-item';
import { EventQrCodeDialog } from '@/components/event-qr-code-dialog';
import { config } from '@/lib/config';
import { MeetingUrlItem } from '@/components/meeting-url-item';
import { Button } from '@/components/ui/button';
import { PublishItem } from '@/components/publish-item';
import { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent } from '@/components/ui/card';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@/components/ui/item';
import { Switch } from '@/components/ui/switch';
import { useFormData, useUpdateFormType } from '@/hooks/use-form-data';
import { useEventContext } from '@/contexts/event-context';
import { useTranslations } from 'next-intl';

export default function EventManagePage() {
  const t = useTranslations('eventManage');
  const tPublish = useTranslations('publishItem');
  const { event, refetch } = useEventContext();
  const { getToken } = useAuth();
  const { data: formData = null, refetch: refetchForm } = useFormData(event?.id ?? 0);
  const updateFormType = useUpdateFormType(event?.id ?? 0, getToken);

  if (!event) {
    return null;
  }

  const requiresRegistration = formData?.formType !== 'none';
  const isFormTypeNone = formData?.formType === 'none';
  const eventUrl = `${config.memberAppUrl}/events/${event.id}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(eventUrl);
      toast.success(tPublish('linkCopied'));
    } catch {
      toast.error(tPublish('copyFailed'));
    }
  };

  const handleFormChange = async () => {
    await refetchForm();
    refetch?.();
  };

  const handleRegistrationToggle = (checked: boolean) => {
    if (!formData) return;

    updateFormType.mutate(
      { formData, requireRegistration: checked },
      {
        onSuccess: () => {
          toast.success(
            checked
              ? t('registrationRequired')
              : t('registrationNotRequired')
          );
          handleFormChange();
        },
        onError: (error) => {
          toast.error(t('updateFailed'), {
            description: error.message,
          });
        },
      }
    );
  };

  return (
    // On a phone the rows are the cards: the outer card's chrome drops away so
    // each row gets the full width instead of nesting a box inside a box.
    <Card className="mx-auto max-w-3xl max-sm:gap-4 max-sm:bg-transparent max-sm:py-0 max-sm:shadow-none max-sm:ring-0">
      <CardHeader className="max-sm:px-0">
        <CardTitle className="font-display text-lg font-semibold tracking-tight">{t('title')}</CardTitle>
        <CardDescription>
          {t('subtitle')}
        </CardDescription>
        <CardAction className="flex items-center gap-1.5">
          <EventQrCodeDialog
            url={eventUrl}
            eventName={event.name}
            trigger={
              <Button variant="outline" size="icon" className="shrink-0" title={tPublish('showQr')} aria-label={tPublish('showQr')}>
                <QrCode className="h-4 w-4" />
              </Button>
            }
          />
          <Button
            variant="outline"
            className="shrink-0"
            onClick={handleCopyLink}
            title={tPublish('copyLink')}
          >
            <Copy className="h-4 w-4" />
            {tPublish('copyLink')}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-3 max-sm:px-0 sm:space-y-4">
        <Item variant="outline" className="bg-card flex-nowrap">
          <ItemContent className="min-w-0">
            <ItemTitle>
              <label htmlFor="require-registration" className="cursor-pointer">
                {t('requireRegistration')}
              </label>
            </ItemTitle>
            <ItemDescription className="line-clamp-none">
              {requiresRegistration
                ? t('requiredHint')
                : t('notRequiredHint')}
            </ItemDescription>
          </ItemContent>
          <ItemActions className="shrink-0">
            {updateFormType.isPending && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            <Switch
              id="require-registration"
              checked={requiresRegistration}
              onCheckedChange={handleRegistrationToggle}
              disabled={!formData || updateFormType.isPending}
            />
          </ItemActions>
        </Item>

        <FormsCopyItem
          eventId={event.id}
          formData={formData}
          onFormChange={handleFormChange}
          disabled={isFormTypeNone}
        />
        {event.location_type === 'online' && (
          <MeetingUrlItem event={event} onEventChange={handleFormChange} />
        )}

        <PublishItem
          event={event}
          formData={formData}
          onEventChange={handleFormChange}
        />
      </CardContent>
    </Card>
  );
}
