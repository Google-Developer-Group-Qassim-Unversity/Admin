"use client";

import * as React from "react";
import { useApi } from "@/lib/api/client";
import type { ComboboxOption } from "@/components/ui/department-combobox";
import type { MemberOption, PointDetailRowData } from "@/components/point-detail-row";
import type { BonusGrantInput, GroupedActions, Member } from "@/lib/api-types";

export function rowsToGrantInputs(rows: PointDetailRowData[], includeGrantId: boolean): BonusGrantInput[] {
  return rows.map((pd) => ({
    ...(includeGrantId ? { id: pd.grant_id ?? null } : {}),
    recipient_type: pd.row_type,
    points: pd.points,
    source_action_id: pd.action_id,
    label_en: pd.action_name,
    label_ar: pd.label_ar ?? pd.action_name,
    member_ids: pd.row_type === "member" ? pd.member_ids : [],
    department_ids: pd.row_type === "department" ? pd.departments_id : [],
  }));
}

export function useBonusEditorOptions(options?: { endDate?: string }) {
  const api = useApi();
  const endDate = options?.endDate;

  const [departmentOptions, setDepartmentOptions] = React.useState<ComboboxOption[]>([]);
  const [memberOptions, setMemberOptions] = React.useState<MemberOption[]>([]);
  const [actionOptions, setActionOptions] = React.useState<GroupedActions>({
    department: [],
    member: [],
    bonus: [],
  });
  const [isLoadingOptions, setIsLoadingOptions] = React.useState(true);

  const handleMemberCreated = React.useCallback((member: Member) => {
    setMemberOptions((prev) => [
      ...prev,
      { id: member.id, label: member.name, uni_id: member.uni_id, email: member.email },
    ]);
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setIsLoadingOptions(true);
      const [deptsRes, membersRes, actionsRes] = await Promise.allSettled([
        api.departments.list(endDate ? { endDate } : undefined),
        api.members.list(),
        api.actions.list(),
      ]);

      if (cancelled) return;

      if (deptsRes.status === "fulfilled") {
        setDepartmentOptions(
          deptsRes.value.map((d) => ({
            id: d.id,
            label: d.ar_name || d.name,
          }))
        );
      }

      if (membersRes.status === "fulfilled") {
        setMemberOptions(
          membersRes.value.map((m) => ({
            id: m.id,
            label: m.name,
            uni_id: m.uni_id,
            email: m.email,
          }))
        );
      }

      if (actionsRes.status === "fulfilled") {
        setActionOptions({
          department: actionsRes.value.department_actions,
          member: actionsRes.value.member_actions,
          bonus: actionsRes.value.custom_actions,
        });
      }

      setIsLoadingOptions(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [api, endDate]);

  return {
    departmentOptions,
    memberOptions,
    actionOptions,
    isLoadingOptions,
    handleMemberCreated,
  };
}
