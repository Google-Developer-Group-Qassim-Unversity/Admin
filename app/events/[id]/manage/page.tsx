"use client";

import { useAuth } from "@clerk/nextjs";
import * as React from "react";
import { Check, Loader2, UserCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { FormsCopyItem } from "@/components/forms-copy-item";
import { EventRegistrationControls } from "@/components/event-registration-controls";
import { MeetingUrlItem } from "@/components/meeting-url-item";
import { PublishItem } from "@/components/publish-item";
import { Mortar, SectionHead } from "@/components/najdi";
import { RegistrationBadge } from "@/components/status-badge";
import { useFormData, useUpdateFormType } from "@/hooks/use-form-data";
import { useEventContext } from "@/contexts/event-context";
import { resolveEventPhase } from "@/lib/event-lifecycle";

export default function EventManagePage() {
  const t = useTranslations("eventManage");
  const { event, refetch } = useEventContext();
  // `useUpdateFormType` is on the older forms resource in `lib/api.ts` which still takes `getToken`.
  const { getToken } = useAuth();
  const { data: formData = null, refetch: refetchForm } = useFormData(event?.id ?? 0);
  const updateFormType = useUpdateFormType(event?.id ?? 0, getToken);

  if (!event) {
    return null;
  }

  const phase = resolveEventPhase(event);
  const isRegistrationLocked =
    event.status === "cancelled" || (event.status === "published" && phase === "ended");
  const requiresRegistration = (formData?.formType ?? event.form_type ?? "registration") !== "none";
  const hasSavedGoogleForm = Boolean(formData?.googleFormId);

  const handleFormChange = async () => {
    await refetchForm();
    refetch?.();
  };

  const handleRegistrationMode = (nextRequireRegistration: boolean) => {
    if (!formData || isRegistrationLocked || updateFormType.isPending || nextRequireRegistration === requiresRegistration) {
      return;
    }

    updateFormType.mutate(
      { formData, requireRegistration: nextRequireRegistration },
      {
        onSuccess: () => {
          toast.success(nextRequireRegistration ? t("registrationRequired") : t("registrationNotRequired"));
          handleFormChange();
        },
        onError: (error) => {
          toast.error(t("updateFailed"), {
            description: error.message,
          });
        },
      },
    );
  };

  const modeDisabled = !formData || isRegistrationLocked || updateFormType.isPending;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      {/* Region 1: Event Visibility, Publication & Permanent Share Link */}
      <PublishItem event={event} formData={formData} onEventChange={handleFormChange} />

      {/* Region 2: Registration (Read-only summary when ended/cancelled; clean progressive controls when active/draft) */}
      <section aria-labelledby="manage-registration" className="panel flex flex-col gap-5">
        <SectionHead
          id="manage-registration"
          title={t("sections.registration")}
          as="h2"
          action={
            <RegistrationBadge
              event={event}
              status={formData?.effectiveRegistrationStatus}
              variant="pill"
            />
          }
        />

        {isRegistrationLocked ? (
          <div className="flex flex-col gap-4">
            <div className="text-ink-2 flex items-center gap-2 text-sm">
              {requiresRegistration ? (
                <UserCheck className="size-4 shrink-0" aria-hidden="true" />
              ) : (
                <Users className="size-4 shrink-0" aria-hidden="true" />
              )}
              <span className="text-foreground font-bold">
                {requiresRegistration ? t("modeRequiredTitle") : t("modeOpenTitle")}
              </span>
            </div>

            {requiresRegistration ? (
              <EventRegistrationControls event={event} formData={formData} onChanged={handleFormChange} />
            ) : null}

            {/* When ended/cancelled: only show a read-only Open Form link if a Google Form was attached */}
            {requiresRegistration && hasSavedGoogleForm ? (
              <div className="border-rule border-t pt-4">
                <FormsCopyItem
                  eventId={event.id}
                  formData={formData}
                  onFormChange={handleFormChange}
                  readOnly
                />
              </div>
            ) : null}
          </div>
        ) : (
          <>
            {/* Tactile 2-brick Mud & Doors mode selector */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <span id="registration-mode-label" className="text-ink-2 text-[13px] font-bold">
                  {t("modeLabel")}
                </span>
                {updateFormType.isPending ? (
                  <Loader2 className="text-ink-2 size-4 animate-spin" aria-hidden="true" />
                ) : null}
              </div>

              <Mortar
                role="radiogroup"
                aria-labelledby="registration-mode-label"
                className="grid-cols-1 sm:grid-cols-2"
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={requiresRegistration}
                  disabled={modeDisabled}
                  onClick={() => handleRegistrationMode(true)}
                  className={`focus-visible:outline-ring flex min-h-14 items-start gap-3 rounded-lg p-3 text-start transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60 ${
                    requiresRegistration
                      ? "bg-card text-foreground shadow-[inset_0_0_0_1px_var(--foreground)]"
                      : "text-ink-2 hover:text-foreground hover:bg-card/50"
                  }`}
                >
                  <UserCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-sm font-bold">{t("modeRequiredTitle")}</span>
                    <span className="text-ink-2 text-[12.5px] leading-snug">{t("modeRequiredHint")}</span>
                  </span>
                  {requiresRegistration ? <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : null}
                </button>

                <button
                  type="button"
                  role="radio"
                  aria-checked={!requiresRegistration}
                  disabled={modeDisabled}
                  onClick={() => handleRegistrationMode(false)}
                  className={`focus-visible:outline-ring flex min-h-14 items-start gap-3 rounded-lg p-3 text-start transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60 ${
                    !requiresRegistration
                      ? "bg-card text-foreground shadow-[inset_0_0_0_1px_var(--foreground)]"
                      : "text-ink-2 hover:text-foreground hover:bg-card/50"
                  }`}
                >
                  <Users className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-sm font-bold">{t("modeOpenTitle")}</span>
                    <span className="text-ink-2 text-[12.5px] leading-snug">{t("modeOpenHint")}</span>
                  </span>
                  {!requiresRegistration ? <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> : null}
                </button>
              </Mortar>
            </div>

            {/* Progressive disclosure: when registration is OFF, hide both gate controls AND Google Form */}
            {requiresRegistration ? (
              <>
                <EventRegistrationControls event={event} formData={formData} onChanged={handleFormChange} />

                <div className="border-rule flex flex-col gap-2 border-t pt-4">
                  <FormsCopyItem
                    eventId={event.id}
                    formData={formData}
                    onFormChange={handleFormChange}
                  />
                </div>
              </>
            ) : hasSavedGoogleForm ? (
              <p className="text-ink-2 text-[13px]">{t("savedGoogleFormPreserved")}</p>
            ) : null}
          </>
        )}
      </section>

      {/* Region 3: Online Meeting Link & Visibility Policy */}
      {event.location_type === "online" ? (
        <section aria-labelledby="manage-meeting" className="panel flex flex-col gap-4">
          <SectionHead id="manage-meeting" title={t("sections.meeting")} as="h2" />
          <MeetingUrlItem
            event={event}
            requiresRegistration={requiresRegistration}
            onEventChange={handleFormChange}
          />
        </section>
      ) : null}
    </div>
  );
}
