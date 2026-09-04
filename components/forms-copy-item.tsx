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
  // The server's admin_google_email is whoever the form was last shared with -
  // not necessarily whoever is viewing this page. Only this browser's own
  // localStorage-saved email means "I successfully requested access before",
  // so the input defaults to that, never to the server's value.
  const savedEmail = getSavedGoogleEmail();
  const [email, setEmail] = useState(savedEmail || '');
  const [requestingDifferentEmail, setRequestingDifferentEmail] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);

  const attachForm = useAttachForm(eventId, getToken);
  const unattachForm = useUnattachForm(eventId, getToken);

  const isLoading = attachForm.isPending || unattachForm.isPending;
  const hasExistingForm = !!formData?.googleFormId;
  const sharedWithEmail = formData?.adminGoogleEmail ?? null;
  const youHaveAccess =
    hasExistingForm &&
    !!sharedWithEmail &&
    !!savedEmail &&
    sharedWithEmail.toLowerCase() === savedEmail.toLowerCase();
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

  const itemContent = (
    <Item
      variant="outline"
      className={`${youHaveAccess && !showEmailInput ? 'bg-green-500/10 border-green-500/30' : ''} ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
    >
      <ItemMedia variant="image">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${youHaveAccess && !showEmailInput ? 'bg-green-500/20' : 'bg-muted'}`}>
          <GoogleFormsIcon className={`w-6 h-6 ${youHaveAccess && !showEmailInput ? 'text-green-500' : ''}`} />
        </div>
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          {youHaveAccess && !showEmailInput ? t('attached') : t('attachForm')}
        </ItemTitle>
        <ItemDescription className="max-w-100">
          {youHaveAccess && !showEmailInput ? (
            <div className="flex flex-col gap-1">
              <span>{t('attachedDescription')}</span>
              <span className="text-xs text-muted-foreground">{t('attachedEditHint')}</span>
              <span className="text-xs text-muted-foreground">{t('sharedWith', { email: sharedWithEmail ?? '' })}</span>
              <button
                type="button"
                className="text-xs text-muted-foreground underline underline-offset-2 text-start w-fit"
                onClick={() => setRequestingDifferentEmail(true)}
              >
                {t('requestDifferentEmail')}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <span>{hasExistingForm ? t('requestAccessDescription') : t('createDescription')}</span>
              {hasExistingForm && sharedWithEmail && (
                <span className="text-xs text-muted-foreground">{t('sharedWith', { email: sharedWithEmail })}</span>
              )}
            </div>
          )}
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        {showEmailInput ? (
          <form onSubmit={handleRequestAccess} className="flex items-center gap-2">
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('emailPlaceholder')}
              disabled={isLoading || disabled}
              className="h-9 w-56"
            />
            <Button type="submit" disabled={isLoading || disabled || !email.trim()}>
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
                size="sm"
                disabled={isLoading}
                onClick={() => {
                  setEmail(savedEmail || '');
                  setRequestingDifferentEmail(false);
                }}
              >
                {tCommon('cancel')}
              </Button>
            )}
            {hasExistingForm && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="icon" disabled={isLoading || disabled}>
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setConfirmRemoveOpen(true)} variant="destructive">
                    <Trash2 className="me-2 h-4 w-4" />
                    {t('unattach')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </form>
        ) : (
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" asChild disabled={disabled}>
              <a
                href={`https://docs.google.com/forms/d/${fileId}/edit`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('openForm')}
                <ExternalLink className="ms-2 h-4 w-4" />
              </a>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" disabled={isLoading || disabled}>
                  {isLoading ? (
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
