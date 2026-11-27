"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { isSameDay } from "date-fns";
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
import type { BonusDetail } from "@/lib/api-types";
import { formatLocalDateTime, parseLocalDateTime } from "@/lib/utils";

export default function EditBonusPage() {
  const t = useTranslations("editCustomEvent");
  const tc = useTranslations("createCustomEvent");
  const tl = useTranslations("eventLayout");
  const params = useParams();
  const router = useRouter();
  const api = useApi();
  const bonusId = params.id as string;

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isLoadingBonus, setIsLoadingBonus] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [bonus, setBonus] = React.useState<BonusDetail | null>(null);

  const {
    departmentOptions,
    memberOptions,
    actionOptions,
    isLoadingOptions,
    handleMemberCreated,
  } = useBonusEditorOptions();

  React.useEffect(() => {
    let cancelled = false;

    async function fetchBonus() {
      setIsLoadingBonus(true);
      setError(null);
      try {
        const data = await api.bonuses.get(bonusId);
        if (cancelled) return;
        if (data.event_id !== null) {
          router.replace(`/points/events/${data.event_id}`);
          return;
        }
        setBonus(data);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiRequestError ? err.message : t("loadFailed"));
        }
      } finally {
        if (!cancelled) setIsLoadingBonus(false);
      }
    }

    fetchBonus();
    return () => {
      cancelled = true;
    };
  }, [api, bonusId, router, t]);

  const handleSubmit = async (data: CustomEventFormData) => {
    if (!bonus) return;
    setIsSubmitting(true);

    try {
      await api.bonuses.update(bonus.id, {
        title: data.event_name,
        given_at: isSameDay(data.date, parseLocalDateTime(bonus.given_at))
          ? undefined
          : formatLocalDateTime(data.date),
        is_public: data.is_visible,
        grants: rowsToGrantInputs(data.point_details, true),
      });

      toast.success(t("updatedSuccess"));
      router.push("/points");
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

  const handleDelete = async () => {
    if (!bonus) return;
    setIsDeleting(true);
    try {
      await api.bonuses.remove(bonus.id);
      toast.success(t("deletedSuccess"));
      router.push("/points");
    } catch (err) {
      toast.error(err instanceof ApiRequestError ? err.message : tc("unexpectedError"));
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoadingBonus || isLoadingOptions) {
    return (
      <PointsEditorShell title={null}>
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
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </PointsEditorShell>
    );
  }

  if (error || !bonus) {
    return (
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <Button variant="ghost" size="sm" asChild className="-ms-2 w-fit">
          <Link href="/points">
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
    <PointsEditorShell title={t("titleCustom")} description={t("descriptionCustom")}>
      <CustomEventForm
        mode="edit"
        initialBonus={bonus}
        departmentOptions={departmentOptions}
        memberOptions={memberOptions}
        actionOptions={actionOptions}
        onSubmit={handleSubmit}
        onDelete={handleDelete}
        isDeleting={isDeleting}
        isSubmitting={isSubmitting}
        onMemberCreated={handleMemberCreated}
      />
    </PointsEditorShell>
  );
}
