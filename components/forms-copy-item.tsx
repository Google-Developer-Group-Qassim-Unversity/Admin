'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemMedia,
  ItemTitle,
} from '@/components/ui/item';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { GoogleFormsIcon } from '@/lib/google-icons';
import { MoreHorizontal, Loader2, ExternalLink, Trash2 } from 'lucide-react';
import { getSavedGoogleEmail, saveGoogleEmail } from '@/lib/google-email-storage';
import { useAttachForm, useUnattachForm } from '@/hooks/use-form-data';
import { RemoveGoogleFormDialog } from '@/components/remove-google-form-dialog';
import { toast } from 'sonner';
import type { GoogleFormData } from '@/lib/api-types';

interface FormsCopyItemProps {
  eventId: number;
  formData: GoogleFormData | null;
  onFormChange: () => void;
  disabled?: boolean;
}

export function FormsCopyItem({ eventId, formData, onFormChange, disabled = false }: FormsCopyItemProps) {
  const t = useTranslations('formsCopyItem');
  const tCommon = useTranslations('common.actions');
  const { getToken } = useAuth();
  // The server's admin_google_email is whoever the form was MOST RECENTLY shared
  // with - a single value that gets silently overwritten every time a different
  // admin requests access, even though earlier grants are never revoked. Whether
  // *this* browser has access has to be checked against the full grant list
  // (grantedEmails), not that one field, or every admin but the latest one sees a
  // false "request access" prompt for access they already have.
  const savedEmail = getSavedGoogleEmail();
  const [email, setEmail] = useState(savedEmail || '');
  const [requestingDifferentEmail, setRequestingDifferentEmail] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);

  const attachForm = useAttachForm(eventId, getToken);
  const unattachForm = useUnattachForm(eventId, getToken);

  const isLoading = attachForm.isPending || unattachForm.isPending;
  const hasExistingForm = !!formData?.googleFormId;
  const sharedWithEmail = formData?.adminGoogleEmail ?? null;
  const grantedEmails = formData?.grantedEmails ?? [];
  const youHaveAccess =
    hasExistingForm &&
    !!savedEmail &&
    grantedEmails.some((granted) => granted.toLowerCase() === savedEmail.toLowerCase());
  const showEmailInput = !youHaveAccess || requestingDifferentEmail;
  const fileId = formData?.googleFormId;

  const handleRequestAccess = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    saveGoogleEmail(trimmedEmail);
    attachForm.mutate(trimmedEmail, {
      onSuccess: () => {
        toast.success(t('attachedSuccess'));
        setRequestingDifferentEmail(false);
        onFormChange();
      },
      onError: () => {
        toast.error(t('attachFailed'));
      },
    });
  };

  const handleUnattach = () => {
    unattachForm.mutate(undefined, {
      onSuccess: () => {
        setConfirmRemoveOpen(false);
        onFormChange();
      },
      onError: () => toast.error(t('unattachFailed')),
    });
  };

  const isReady = youHaveAccess && !showEmailInput;

  const moreMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0"
          disabled={isLoading || disabled}
          aria-label={t('moreActions')}
        >
          {isLoading && !showEmailInput ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <MoreHorizontal className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setConfirmRemoveOpen(true)} variant="destructive">
          <Trash2 className="me-2 h-4 w-4" />
          {t('unattach')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  const itemContent = (
    <Item
      variant="outline"
      className={`bg-card ${isReady ? 'border-brand-green/40' : ''} ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <ItemMedia>
        {/* Green = done: the form exists and this browser can edit it. */}
        <div className={`flex size-10 items-center justify-center rounded-lg ${isReady ? 'bg-brand-green-soft text-brand-green-ink' : 'bg-muted'}`}>
          <GoogleFormsIcon className="h-5 w-5" />
        </div>
      </ItemMedia>
      <ItemContent className="min-w-0">
        <ItemTitle>
          {isReady ? t('attached') : t('attachForm')}
        </ItemTitle>
        <ItemDescription className="line-clamp-none sm:max-w-100">
          {isReady ? (
            <span className="flex flex-col gap-1">
              <span>{t('attachedDescription')}</span>
              <span className="text-[13px] text-muted-foreground">{t('attachedEditHint')}</span>
              <span className="text-[13px] text-muted-foreground break-all">{t('sharedWith', { email: savedEmail ?? '' })}</span>
              <button
                type="button"
                className="-my-1.5 w-fit py-1.5 text-start text-[13px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
                onClick={() => setRequestingDifferentEmail(true)}
              >
                {t('requestDifferentEmail')}
              </button>
            </span>
          ) : (
            <span className="flex flex-col gap-1">
              <span>{hasExistingForm ? t('requestAccessDescription') : t('createDescription')}</span>
              {hasExistingForm && sharedWithEmail && (
                <span className="text-[13px] text-muted-foreground break-all">{t('sharedWith', { email: sharedWithEmail })}</span>
              )}
            </span>
          )}
        </ItemDescription>
      </ItemContent>
      {/* Phone: the actions take their own full-width row under the text. */}
      <ItemActions className="w-full sm:w-auto">
        {showEmailInput ? (
          <form onSubmit={handleRequestAccess} className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
            <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              enterKeyHint="send"
              dir="ltr"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('emailPlaceholder')}
              disabled={isLoading || disabled}
              aria-label={t('emailPlaceholder')}
              className="w-full sm:w-56"
            />
            <div className="flex gap-2">
              <Button type="submit" className="flex-1 sm:flex-none" disabled={isLoading || disabled || !email.trim()}>
                {attachForm.isPending ? (
                  <>
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    {hasExistingForm ? t('requestingAccess') : t('creatingForm')}
                  </>
                ) : hasExistingForm ? (
                  t('requestAccess')
                ) : (
                  t('createForm')
                )}
              </Button>
              {youHaveAccess && requestingDifferentEmail && (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isLoading}
                  onClick={() => {
                    setEmail(savedEmail || '');
                    setRequestingDifferentEmail(false);
                  }}
                >
                  {tCommon('cancel')}
                </Button>
              )}
              {hasExistingForm && moreMenu}
            </div>
          </form>
        ) : (
          <div className="flex w-full gap-2 sm:w-auto">
            <Button variant="outline" className="flex-1 sm:flex-none" asChild disabled={disabled}>
              <a
                href={`https://docs.google.com/forms/d/${fileId}/edit`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('openForm')}
                <ExternalLink className="ms-2 h-4 w-4 rtl:-scale-x-100" />
              </a>
            </Button>
            {moreMenu}
          </div>
        )}
      </ItemActions>
    </Item>
  );

  const removeDialog = (
    <RemoveGoogleFormDialog
      sharedWithEmail={sharedWithEmail}
      open={confirmRemoveOpen}
      onOpenChange={setConfirmRemoveOpen}
      onConfirm={handleUnattach}
      isLoading={unattachForm.isPending}
    />
  );

  // Wrap in tooltip when disabled to explain why
  if (disabled) {
    return (
      <>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-not-allowed">{itemContent}</div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('disabledTooltip')}</p>
          </TooltipContent>
        </Tooltip>
        {removeDialog}
      </>
    );
  }

  return (
    <>
      {itemContent}
      {removeDialog}
    </>
  );
}
