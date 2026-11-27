"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { PointsEditorShell } from "@/components/points-editor-shell";
import { PointsEmpty, PointsLoadError } from "@/components/points-list-states";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CustomEventForm,
  type CustomEventFormData,
} from "@/components/custom-event-form";
import { rowsToGrantInputs, useBonusEditorOptions } from "@/hooks/use-bonus-editor-options";
import { useApi } from "@/lib/api/client";
import { ApiRequestError, shouldContactSupport } from "@/lib/api/errors";
import type { EventBonusDetail } from "@/lib/api-types";

export default function EditEventBonusesPage() {
  const t = useTranslations("editCustomEvent");
  const tc = useTranslations("createCustomEvent");
  const tl = useTranslations("eventLayout");
  const params = useParams();
  const router = useRouter();
  const api = useApi();
  const rawEventId = params.id as string;
  const parsedEventId = /^\d+$/.test(rawEventId) ? Number(rawEventId) : null;

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isLoadingBonus, setIsLoadingBonus] = React.useState(parsedEventId !== null);
  const [error, setError] = React.useState<string | null>(null);
  const [eventBonus, setEventBonus] = React.useState<EventBonusDetail | null>(null);

  const {
    departmentOptions,
    memberOptions,
    actionOptions,
    isLoadingOptions,
    handleMemberCreated,
  } = useBonusEditorOptions();

  React.useEffect(() => {
    if (parsedEventId === null) {
      setEventBonus(null);
      setIsLoadingBonus(false);
      return;
    }

    let cancelled = false;

    async function fetchEventBonus(id: number) {
      setIsLoadingBonus(true);
      setError(null);
      try {
        const data = await api.bonuses.byEvent(id);
        if (!cancelled) setEventBonus(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiRequestError ? err.message : t("loadFailed"));
        }
      } finally {
        if (!cancelled) setIsLoadingBonus(false);
      }
    }

    fetchEventBonus(parsedEventId);
    return () => {
      cancelled = true;
    };
  }, [api, parsedEventId, t]);

  const handleSubmit = async (data: CustomEventFormData) => {
    if (!eventBonus) return;
    setIsSubmitting(true);

    try {
      await api.bonuses.upsertByEvent(eventBonus.event_id, {
        grants: rowsToGrantInputs(data.point_details, true),
      });

      toast.success(t("updatedSuccess"));
      router.push("/points/full");
    } catch (err) {
      if (err instanceof ApiRequestError) {
        if (shouldContactSupport(err)) {
          toast.error(t("updateEventInfoFailedContactSupport"), {
            description: tc("errorDetail", { message: err.message }),
            duration: 10000,
          });
        } else {
          toast.error(err.message);
        }
      } else {
        toast.error(tc("unexpectedError"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingBonus || isLoadingOptions) {
    return (
      <PointsEditorShell title={null} backHref="/points/full">
        <div className="space-y-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-px w-full" />
          <div className="space-y-4">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </PointsEditorShell>
    );
  }

  if (error || !eventBonus) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <Button variant="ghost" size="sm" asChild className="-ms-2 w-fit">
          <Link href="/points/full">
            <ArrowLeft className="rtl:-scale-x-100" />
            {tl("backToPoints")}
          </Link>
        </Button>
        {error ? (
          <PointsLoadError message={tl("errorPrefix", { message: error })} />
        ) : (
          <PointsEmpty icon={SearchX} title={tl("eventNotFound")} description={tl("eventNotFoundDescription")} />
        )}
      </div>
    );
  }

  return (
    <PointsEditorShell title={t("titleFull")} description={t("descriptionFull")} backHref="/points/full">
      <CustomEventForm
        mode="edit"
        initialEventBonus={eventBonus}
        departmentOptions={departmentOptions}
        memberOptions={memberOptions}
        actionOptions={actionOptions}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        isFullEvent={true}
        onMemberCreated={handleMemberCreated}
      />
    </PointsEditorShell>
  );
}
