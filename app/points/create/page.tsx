"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { PointsEditorShell } from "@/components/points-editor-shell";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CustomEventForm,
  type CustomEventFormData,
} from "@/components/custom-event-form";
import { rowsToGrantInputs, useBonusEditorOptions } from "@/hooks/use-bonus-editor-options";
import { useApi } from "@/lib/api/client";
import { ApiRequestError, shouldContactSupport } from "@/lib/api/errors";
import { formatLocalDateTime } from "@/lib/utils";

export default function CreateCustomEventPage() {
  const t = useTranslations("createCustomEvent");
  const router = useRouter();
  const api = useApi();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const endDate = React.useMemo(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  }, []);

  const {
    departmentOptions,
    memberOptions,
    actionOptions,
    isLoadingOptions,
    handleMemberCreated,
  } = useBonusEditorOptions({ endDate });

  const handleSubmit = async (data: CustomEventFormData) => {
    setIsSubmitting(true);

    try {
      await api.bonuses.create({
        title: data.event_name,
        given_at: formatLocalDateTime(data.date),
        is_public: data.is_visible,
        grants: rowsToGrantInputs(data.point_details, false),
      });

      toast.success(t("createdSuccess"));
      router.push("/points");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (shouldContactSupport(err)) {
          toast.error(t("createFailedContactSupport"), {
            description: t("errorDetail", { message: err.message }),
            duration: 10000,
          });
        } else {
          toast.error(err.message);
        }
      } else {
        toast.error(t("unexpectedError"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PointsEditorShell title={t("title")} description={t("description")}>
      {isLoadingOptions ? (
        <div className="space-y-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-10 w-full" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
          <Skeleton className="h-px w-full" />
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      ) : (
        <CustomEventForm
          mode="create"
          departmentOptions={departmentOptions}
          memberOptions={memberOptions}
          actionOptions={actionOptions}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          onMemberCreated={handleMemberCreated}
        />
      )}
    </PointsEditorShell>
  );
}
