'use client';

import { useAuth } from '@clerk/nextjs';
import * as React from 'react';
import { Check, Copy, Loader2, QrCode } from 'lucide-react';
import { toast } from 'sonner';

import { FormsCopyItem } from '@/components/forms-copy-item';
import { EventQrCodeDialog } from '@/components/event-qr-code-dialog';
import { config } from '@/lib/config';
import { MeetingUrlItem } from '@/components/meeting-url-item';
import { Button } from '@/components/ui/button';
import { PublishItem } from '@/components/publish-item';
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

  const formReady = !!formData && (formData.formType !== 'google' || !!formData.googleFormId);
  const steps: { key: string; done: boolean; content: React.ReactNode }[] = [
    {
      key: 'registration',
      done: !!formData,
      content: (
        <Item className="flex-nowrap px-0 py-0">
          <ItemContent className="min-w-0">
            <ItemTitle className="text-[15px] font-bold">
              <label htmlFor="require-registration" className="cursor-pointer">
                {t('requireRegistration')}
              </label>
            </ItemTitle>
            <ItemDescription className="text-ink-2 line-clamp-none">
              {requiresRegistration ? t('requiredHint') : t('notRequiredHint')}
            </ItemDescription>
          </ItemContent>
          <ItemActions className="shrink-0">
            {updateFormType.isPending && <Loader2 className="text-ink-2 size-4 animate-spin" />}
            <Switch
              id="require-registration"
              checked={requiresRegistration}
              onCheckedChange={handleRegistrationToggle}
              disabled={!formData || updateFormType.isPending}
            />
          </ItemActions>
        </Item>
      ),
    },
    {
      key: 'form',
      done: formReady,
      content: (
        <FormsCopyItem eventId={event.id} formData={formData} onFormChange={handleFormChange} disabled={isFormTypeNone} />
      ),
    },
    ...(event.location_type === 'online'
      ? [{ key: 'meeting', done: !!event.meeting_url, content: <MeetingUrlItem event={event} onEventChange={handleFormChange} /> }]
      : []),
    {
      key: 'publish',
      done: event.status !== 'draft',
      content: <PublishItem event={event} formData={formData} onEventChange={handleFormChange} />,
    },
  ];
  const current = steps.findIndex((step) => !step.done);

  return (
    <section aria-labelledby="manage-title" className="mx-auto flex w-full max-w-3xl flex-col gap-4">
      <div className="border-foreground flex flex-wrap items-end justify-between gap-3 border-b pb-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="manage-title" className="text-base font-bold">
            {t('title')}
          </h2>
          <p className="text-ink-2 text-sm">{t('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <EventQrCodeDialog
            url={eventUrl}
            eventName={event.name}
            trigger={
              <Button variant="outline" size="icon" className="shrink-0" title={tPublish('showQr')} aria-label={tPublish('showQr')}>
                <QrCode />
              </Button>
            }
          />
          <Button variant="outline" className="shrink-0" onClick={handleCopyLink}>
            <Copy />
            {tPublish('copyLink')}
          </Button>
        </div>
      </div>

      {/* The steps from a draft to an event members can sign up for, in order.
          Each marker turns green when its step is done; the first one that is
          not is the one waiting on you. */}
      <ol className="flex flex-col">
        {steps.map((step, index) => (
          <li key={step.key} className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3 pb-5 last:pb-0">
            {index < steps.length - 1 ? (
              <span aria-hidden="true" className="bg-rule absolute start-4 top-9 bottom-1 w-px" />
            ) : null}
            <span
              className={`tabular relative z-10 mt-0.5 grid size-8 place-items-center rounded-sm text-sm font-bold ${
                step.done
                  ? 'bg-door-green text-on-door'
                  : index === current
                    ? 'bg-door-ochre text-on-door-ochre plate-depth'
                    : 'bg-sunk text-ink-2 shadow-[inset_0_0_0_1px_var(--rule)]'
              }`}
            >
              {step.done ? <Check className="size-4" aria-label={t('stepDone')} /> : index + 1}
            </span>
            <div className="border-rule min-w-0 border-b pb-5 [li:last-child_&]:border-b-0">{step.content}</div>
          </li>
        ))}
      </ol>
    </section>
  );
}
