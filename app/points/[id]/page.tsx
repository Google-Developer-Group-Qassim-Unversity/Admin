"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { PointsEditorShell } from "@/components/points-editor-shell";
import { PointsEmpty, PointsLoadError } from "@/components/points-list-states";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CustomEventForm,
  type CustomEventFormData,
} from "@/components/custom-event-form";
import type { ComboboxOption } from "@/components/ui/department-combobox";
import type { MemberOption } from "@/components/point-detail-row";
import type { BonusDetail, BonusGrantInput, GroupedActions, Member } from "@/lib/api-types";
import {
  getBonus,
  updateBonus,
  deleteBonus,
  getDepartments,
  getMembers,
  getActions,
  shouldContactSupport,
} from "@/lib/api";
import { formatLocalDateTime } from "@/lib/utils";
import { useTranslations } from "next-intl";

export default function EditBonusPage() {
  const t = useTranslations("editCustomEvent");
  const tc = useTranslations("createCustomEvent");
  const tl = useTranslations("eventLayout");
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const bonusId = params.id as string;

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [bonus, setBonus] = React.useState<BonusDetail | null>(null);
  const [departmentOptions, setDepartmentOptions] = React.useState<ComboboxOption[]>([]);
  const [memberOptions, setMemberOptions] = React.useState<MemberOption[]>([]);
  const [actionOptions, setActionOptions] = React.useState<GroupedActions>({
    department: [],
    member: [],
    bonus: [],
  });

  const handleMemberCreated = React.useCallback((member: Member) => {
    setMemberOptions((prev) => [
      ...prev,
      { id: member.id, label: member.name, uni_id: member.uni_id, email: member.email },
    ]);
  }, []);

  React.useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);

      const [bonusRes, deptsRes, membersRes, actionsRes] = await Promise.all([
        getBonus(bonusId, getToken),
        getDepartments(),
        getMembers(getToken),
        getActions(),
      ]);

      if (!bonusRes.success) {
        setError(bonusRes.error.message || t("loadFailed"));
        setIsLoading(false);
        return;
      }

      setBonus(bonusRes.data);

      if (deptsRes.success) {
        setDepartmentOptions(
          deptsRes.data.map((d) => ({
            id: d.id,
            label: d.ar_name || d.name,
          }))
        );
      }

      if (membersRes.success) {
        setMemberOptions(
          membersRes.data.map((m) => ({
            id: m.id,
            label: m.name,
            uni_id: m.uni_id,
            email: m.email,
          }))
        );
      }

      if (actionsRes.success) {
        setActionOptions({
          department: actionsRes.data.department_actions,
          member: actionsRes.data.member_actions,
          bonus: actionsRes.data.custom_actions,
        });
      }

      setIsLoading(false);
    }
    fetchData();
  }, [bonusId, getToken, t]);

  const handleSubmit = async (data: CustomEventFormData) => {
    if (!bonus) return;
    setIsSubmitting(true);

    try {
      const givenAt = new Date(data.date);
      givenAt.setHours(10, 0, 0, 0);

      const grants: BonusGrantInput[] = data.point_details.map((pd) => ({
        id: pd.grant_id ?? null,
        recipient_type: pd.row_type,
        points: pd.points,
        source_action_id: pd.action_id,
        label_en: pd.action_name,
        label_ar: pd.label_ar ?? pd.action_name,
        member_ids: pd.row_type === "member" ? pd.member_ids : [],
        department_ids: pd.row_type === "department" ? pd.departments_id : [],
      }));

      const res = await updateBonus(
        bonus.id,
        {
          title: data.event_name,
          given_at: formatLocalDateTime(givenAt),
          is_public: data.is_visible,
          grants,
        },
        getToken
      );

      if (!res.success) {
        if (shouldContactSupport(res.error)) {
          toast.error(t("updateEventInfoFailedContactSupport"), {
            description: tc("errorDetail", { message: res.error.message }),
            duration: 10000,
          });
        } else {
          toast.error(res.error.message);
        }
        return;
      }

      toast.success(t("updatedSuccess"));
      router.push("/points");
    } catch {
      toast.error(tc("unexpectedError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!bonus) return;
    setIsDeleting(true);
    try {
      const res = await deleteBonus(bonus.id, getToken);
      if (!res.success) {
        toast.error(res.error.message);
        return;
      }
      toast.success(t("updatedSuccess"));
      router.push("/points");
    } catch {
      toast.error(tc("unexpectedError"));
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
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
