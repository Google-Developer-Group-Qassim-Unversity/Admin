"use client";

import { useAuth } from "@clerk/nextjs";
import * as React from "react";
import { Loader2, UserCheck, Users } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { FieldHelp } from "@/components/field-help";
import { FormsCopyItem } from "@/components/forms-copy-item";
import { MeetingUrlItem } from "@/components/meeting-url-item";
import { PublishItem } from "@/components/publish-item";
import { Plate, SectionHead } from "@/components/najdi";
import { RegistrationBadge } from "@/components/status-badge";
import { SegmentedControl } from "@/components/ui/segmented-control";
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

  const handleRegistrationMode = (nextValue: string) => {
    const nextRequireRegistration = nextValue === "required";
    if (
      !formData ||
      isRegistrationLocked ||
      updateFormType.isPending ||
      nextRequireRegistration === requiresRegistration
    ) {
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
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      {/* Region 1: 4-step lifecycle track + single status/action Door */}
      <PublishItem event={event} formData={formData} onEventChange={handleFormChange} />

      {/* Region 2: Registration setup (flat rows on the wall, zero hint paragraphs) */}
      <section aria-labelledby="manage-registration" className="flex flex-col">
        <SectionHead
          id="manage-registration"
          title={t("sections.registration")}
          as="h2"
          action={
            event.status !== "draft" ? (
              <RegistrationBadge
                event={event}
                status={formData?.effectiveRegistrationStatus}
                variant="pill"
              />
            ) : undefined
          }
        />

        {/* Attendance mode row */}
        <div className="border-rule flex min-h-16 flex-col gap-3 border-b px-1 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Plate tone="neutral" size="sm" icon={requiresRegistration ? UserCheck : Users} />
            <span className="ms-1 text-[14.5px] font-bold">{t("modeLabel")}</span>
            <FieldHelp label={t("helpLabel", { field: t("modeLabel") })}>{t("modeHelp")}</FieldHelp>
            {updateFormType.isPending ? (
              <Loader2 className="text-ink-2 size-4 animate-spin" aria-hidden="true" />
            ) : null}
          </div>

          {isRegistrationLocked ? (
            <span className="text-sm font-bold">
              {requiresRegistration ? t("modeRequiredTitle") : t("modeOpenTitle")}
            </span>
          ) : (
            <div className="w-full sm:w-auto sm:min-w-88">
              <SegmentedControl
                label={t("modeLabel")}
                value={requiresRegistration ? "required" : "open"}
                onValueChange={handleRegistrationMode}
                disabled={modeDisabled}
                options={[
                  { value: "required", label: t("modeRequiredTitle") },
                  { value: "open", label: t("modeOpenTitle") },
                ]}
              />
            </div>
          )}
        </div>

        {/* Inline Google Form row */}
        {requiresRegistration ? (
          <FormsCopyItem
            eventId={event.id}
            formData={formData}
            onFormChange={handleFormChange}
            readOnly={isRegistrationLocked}
          />
        ) : hasSavedGoogleForm && !isRegistrationLocked ? (
          <p className="text-ink-3 px-1 pt-2.5 text-[13px]">{t("savedGoogleFormPreserved")}</p>
        ) : null}
      </section>

      {/* Region 3: Online meeting link & visibility (hide if ended/cancelled with no saved link) */}
      {event.location_type === "online" && (!isRegistrationLocked || Boolean(event.meeting_url)) ? (
        <section aria-labelledby="manage-meeting" className="flex flex-col">
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
