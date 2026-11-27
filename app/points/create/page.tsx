"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";

import { PointsEditorShell } from "@/components/points-editor-shell";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CustomEventForm,
  type CustomEventFormData,
} from "@/components/custom-event-form";
import type { ComboboxOption } from "@/components/ui/department-combobox";
import type { MemberOption } from "@/components/point-detail-row";
import {
  getDepartments,
  getMembers,
  getActions,
  createBonus,
  shouldContactSupport,
} from "@/lib/api";
import { formatLocalDateTime } from "@/lib/utils";
import type { BonusGrantInput, GroupedActions, Member } from "@/lib/api-types";
import { useTranslations } from "next-intl";

export default function CreateCustomEventPage() {
  const t = useTranslations("createCustomEvent");
  const router = useRouter();
  const { getToken } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [departmentOptions, setDepartmentOptions] = React.useState<ComboboxOption[]>([]);
  const [memberOptions, setMemberOptions] = React.useState<MemberOption[]>([]);
  const [actionOptions, setActionOptions] = React.useState<GroupedActions>({
    department: [],
    member: [],
    bonus: [],
  });
  const [isLoadingData, setIsLoadingData] = React.useState(true);

  const handleMemberCreated = React.useCallback((member: Member) => {
    setMemberOptions((prev) => [
      ...prev,
      { id: member.id, label: member.name, uni_id: member.uni_id, email: member.email },
    ]);
  }, []);

  React.useEffect(() => {
    async function fetchData() {
      setIsLoadingData(true);
      const today = new Date();
      const endDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const [deptsRes, membersRes, actionsRes] = await Promise.all([
        getDepartments({ endDate }),
        getMembers(getToken),
        getActions(),
      ]);

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

      setIsLoadingData(false);
    }
    fetchData();
  }, [getToken]);

  const handleSubmit = async (data: CustomEventFormData) => {
    setIsSubmitting(true);

    try {
      const givenAt = new Date(data.date);
      givenAt.setHours(10, 0, 0, 0);

      const grants: BonusGrantInput[] = data.point_details.map((pd) => ({
        recipient_type: pd.row_type,
        points: pd.points,
        source_action_id: pd.action_id,
        label_en: pd.action_name,
        label_ar: pd.label_ar ?? pd.action_name,
        member_ids: pd.row_type === "member" ? pd.member_ids : [],
        department_ids: pd.row_type === "department" ? pd.departments_id : [],
      }));

      const result = await createBonus(
        {
          title: data.event_name,
          given_at: formatLocalDateTime(givenAt),
          is_public: data.is_visible,
          grants,
        },
        getToken
      );

      if (!result.success) {
        if (shouldContactSupport(result.error)) {
          toast.error(t("createFailedContactSupport"), {
            description: t("errorDetail", { message: result.error.message }),
            duration: 10000,
          });
        } else {
          toast.error(result.error.message);
        }
        return;
      }

      toast.success(t("createdSuccess"));
      router.push("/points");
    } catch {
      toast.error(t("unexpectedError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PointsEditorShell title={t("title")} description={t("description")}>
      {isLoadingData ? (
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
