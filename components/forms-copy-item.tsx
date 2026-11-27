"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Ellipsis, ExternalLink, Loader2, Mail, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FieldHelp } from "@/components/field-help";
import { Plate } from "@/components/najdi";
import { GoogleFormsIcon } from "@/lib/google-icons";
import { getSavedGoogleEmail, saveGoogleEmail } from "@/lib/google-email-storage";
import { useAttachForm, useUnattachForm } from "@/hooks/use-form-data";
import { RemoveGoogleFormDialog } from "@/components/remove-google-form-dialog";
import type { GoogleFormData } from "@/lib/api-types";

interface FormsCopyItemProps {
  eventId: number;
  formData: GoogleFormData | null;
  onFormChange: () => void;
  disabled?: boolean;
  /** Ended / cancelled events lock form mutations: hide if none attached, show Open Form only if attached. */
  readOnly?: boolean;
}

export function FormsCopyItem({
  eventId,
  formData,
  onFormChange,
  disabled = false,
  readOnly = false,
}: FormsCopyItemProps) {
  const t = useTranslations("formsCopyItem");
  const tCommon = useTranslations("common.actions");
  const { getToken } = useAuth();
  const savedEmail = getSavedGoogleEmail();
  const [email, setEmail] = useState(savedEmail || "");
  const [requestingDifferentEmail, setRequestingDifferentEmail] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);

  const attachForm = useAttachForm(eventId, getToken);
  const unattachForm = useUnattachForm(eventId, getToken);

  const isLoading = attachForm.isPending || unattachForm.isPending;
  const hasExistingForm = Boolean(formData?.googleFormId);
  const sharedWithEmail = formData?.adminGoogleEmail ?? null;
  const grantedEmails = formData?.grantedEmails ?? [];
  const youHaveAccess =
    hasExistingForm &&
    Boolean(savedEmail) &&
    grantedEmails.some((granted) => granted.toLowerCase() === (savedEmail ?? "").toLowerCase());
  const showEmailInput = !youHaveAccess || requestingDifferentEmail;
  const fileId = formData?.googleFormId;

  const handleRequestAccess = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    saveGoogleEmail(trimmedEmail);
    attachForm.mutate(trimmedEmail, {
      onSuccess: () => {
        toast.success(t("attachedSuccess"));
        setRequestingDifferentEmail(false);
        onFormChange();
      },
      onError: () => {
        toast.error(t("attachFailed"));
      },
    });
  };

  const handleUnattach = () => {
    unattachForm.mutate(undefined, {
      onSuccess: () => {
        setConfirmRemoveOpen(false);
        onFormChange();
      },
      onError: () => toast.error(t("unattachFailed")),
    });
  };

  if (readOnly) {
    if (!hasExistingForm || !fileId) return null;
    return (
      <div className="border-rule flex min-h-16 flex-col gap-3 border-b px-1 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Plate tone="neutral" size="sm">
            <GoogleFormsIcon className="size-4" aria-hidden="true" />
          </Plate>
          <span className="text-[14.5px] font-bold">{t("label")}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {sharedWithEmail ? (
            <span dir="ltr" className="text-ink-2 break-all text-[13px]">
              {t("sharedWith", { email: sharedWithEmail })}
            </span>
          ) : null}
          <Button variant="outline" size="sm" asChild>
            <a
              href={`https://docs.google.com/forms/d/${fileId}/edit`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t("openForm")}
              <ExternalLink className="rtl:-scale-x-100" />
            </a>
          </Button>
        </div>
      </div>
    );
  }

  const moreMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="shrink-0"
          disabled={isLoading || disabled}
          aria-label={t("moreActions")}
          title={t("moreActions")}
        >
          {isLoading && !showEmailInput ? <Loader2 className="animate-spin" /> : <Ellipsis />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {youHaveAccess && !requestingDifferentEmail ? (
          <>
            <DropdownMenuItem onClick={() => setRequestingDifferentEmail(true)}>
              <Mail />
              {t("requestDifferentEmail")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        ) : null}
        <DropdownMenuItem onClick={() => setConfirmRemoveOpen(true)} variant="destructive">
          <Trash2 />
          {t("unattach")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <>
      <div
        className={`border-rule flex min-h-16 flex-col gap-3 border-b px-1 py-3.5 sm:flex-row sm:items-center sm:justify-between ${
          disabled ? "pointer-events-none opacity-50" : ""
        }`}
      >
        <div className="flex shrink-0 items-center gap-2">
          <Plate tone="neutral" size="sm">
            <GoogleFormsIcon className="size-4" aria-hidden="true" />
          </Plate>
          <span className="ms-1 text-[14.5px] font-bold">{t("label")}</span>
          <FieldHelp label={t("helpLabel")}>{t("help")}</FieldHelp>
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:justify-end">
          {showEmailInput ? (
            <form
              onSubmit={handleRequestAccess}
              className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center"
            >
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
                placeholder={t("emailPlaceholder")}
                disabled={isLoading || disabled}
                aria-label={t("emailPlaceholder")}
                className="w-full sm:w-60"
              />
              <div className="flex items-center gap-2">
                <Button
                  type="submit"
                  size="sm"
                  className="flex-1 sm:flex-none"
                  disabled={isLoading || disabled || !email.trim()}
                >
                  {attachForm.isPending ? (
                    <>
                      <Loader2 className="animate-spin" />
                      {hasExistingForm ? t("requestingAccess") : t("creatingForm")}
                    </>
                  ) : hasExistingForm ? (
                    t("requestAccess")
                  ) : (
                    t("createForm")
                  )}
                </Button>
                {youHaveAccess && requestingDifferentEmail ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isLoading}
                    onClick={() => {
                      setEmail(savedEmail || "");
                      setRequestingDifferentEmail(false);
                    }}
                  >
                    {tCommon("cancel")}
                  </Button>
                ) : null}
                {hasExistingForm ? moreMenu : null}
              </div>
            </form>
          ) : (
            <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
              {savedEmail ? (
                <span dir="ltr" className="text-ink-2 break-all text-[13px]">
                  {t("sharedWith", { email: savedEmail })}
                </span>
              ) : null}
              <Button variant="outline" size="sm" className="flex-1 sm:flex-none" asChild disabled={disabled}>
                <a
                  href={`https://docs.google.com/forms/d/${fileId}/edit`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t("openForm")}
                  <ExternalLink className="rtl:-scale-x-100" />
                </a>
              </Button>
              {moreMenu}
            </div>
          )}
        </div>
      </div>

      <RemoveGoogleFormDialog
        sharedWithEmail={sharedWithEmail}
        open={confirmRemoveOpen}
        onOpenChange={setConfirmRemoveOpen}
        onConfirm={handleUnattach}
        isLoading={unattachForm.isPending}
      />
    </>
  );
}
