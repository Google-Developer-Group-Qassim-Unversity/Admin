"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Minus, Plus, Trash2, Lock, Building2, User, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  MultiSelect,
  MultiSelectTrigger,
  MultiSelectValue,
  MultiSelectContent,
  MultiSelectGroup,
  MultiSelectItem,
} from "@/components/ui/multi-select";
import { ActionReasonSelect } from "@/components/ui/action-reason-select";
import { Count, Plate } from "@/components/najdi";
import type { ComboboxOption } from "@/components/ui/department-combobox";
import type { GroupedActions, Member, PointRowType } from "@/lib/api-types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MemberSelectDialog } from "./member-select-dialog";
import { useAccess } from "@/hooks/use-access";

export interface MemberOption {
  id: number;
  label: string;
  uni_id: string | null;
  email: string;
}

export interface PointDetailRowData {
  log_id?: number;
  row_type: PointRowType;
  departments_id: number[];
  member_ids: number[];
  points: number;
  action_id: number | null;
  action_name: string | null;
}

interface PointDetailRowProps {
  data: PointDetailRowData;
  index: number;
  departmentOptions: ComboboxOption[];
  memberOptions: MemberOption[];
  actionOptions: GroupedActions;
  onChange: (index: number, data: PointDetailRowData) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
  onMemberCreated?: (member: Member) => void;
}

export function PointDetailRow({
  data,
  index,
  departmentOptions,
  memberOptions,
  actionOptions,
  onChange,
  onRemove,
  canRemove,
  onMemberCreated,
}: PointDetailRowProps) {
  const t = useTranslations("pointDetailRow");
  const { isSuperAdmin } = useAccess();
  const isPointsLocked = data.action_id !== null;
  const [memberDialogOpen, setMemberDialogOpen] = React.useState(false);

  const allActions = [...actionOptions.department, ...actionOptions.member, ...actionOptions.bonus];
  const isDiscountRow = data.action_name?.toLowerCase() === "discount";
  const isCompositeAction = !isDiscountRow && !!(data.action_id !== null && !allActions.find((a) => a.id === data.action_id) && data.action_name);

  // Only super admins give points outside the point actions.
  const isRestrictedMode = !isSuperAdmin;

  const updateField = <K extends keyof PointDetailRowData>(
    field: K,
    value: PointDetailRowData[K]
  ) => {
    onChange(index, { ...data, [field]: value });
  };

  const updateMultipleFields = (updates: Partial<PointDetailRowData>) => {
    onChange(index, { ...data, ...updates });
  };

  const adjustPoints = (delta: number) => {
    if (isPointsLocked) return;
    updateField("points", data.points + delta);
  };

  const handleActionChange = (
    actionId: number | null,
    actionName: string | null,
    actionPoints: number | null
  ) => {
    if (actionId !== null && actionPoints !== null) {
      updateMultipleFields({
        action_id: actionId,
        action_name: actionName,
        points: actionPoints,
      });
    } else {
      updateMultipleFields({
        action_id: null,
        action_name: actionName,
      });
    }
  };

  const entityLabel = data.row_type === "department" ? t("department") : t("member");
  const entityIds = data.row_type === "department" ? data.departments_id : data.member_ids;
  const entityField = data.row_type === "department" ? "departments_id" : "member_ids";

  const selectedMemberNames = React.useMemo(() => {
    if (data.row_type !== "member") return [];
    return memberOptions
      .filter((m) => data.member_ids.includes(m.id))
      .map((m) => m.label);
  }, [data.row_type, data.member_ids, memberOptions]);

  const getMemberDisplayText = () => {
    const count = data.member_ids.length;
    if (count === 0) return t("selectMembers");
    if (count === 1) return selectedMemberNames[0] || t("oneMember");
    if (count <= 3) return selectedMemberNames.join(", ");
    return `${selectedMemberNames.slice(0, 2).join(", ")}, ${t("moreCount", { count: count - 2 })}`;
  };

  const stepButton = "h-10 shrink-0 p-0 pointer-coarse:h-11";

  // One panel per point detail: a header strip (who it is for, remove), then
  // who, points and reason. On a phone the fields stack; from sm they share a
  // wrapping row.
  return (
    <div className="bg-card ring-rule flex flex-col rounded-xl ring-1">
      <div className="border-rule flex items-center gap-2.5 border-b py-2 ps-3 pe-1.5">
        <Plate tone="umber" size="sm" icon={data.row_type === "department" ? Building2 : User} />
        <span className="flex-1 text-sm font-bold">
          {entityLabel}
          <span className="tabular text-ink-3 ms-1.5 font-medium">#{index + 1}</span>
        </span>
        {isCompositeAction ? (
          <span className="text-ink-2 flex items-center gap-1 text-[12.5px] font-medium">
            <Lock className="size-3.5" />
            {t("compositeLocked")}
          </span>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-ink-2 hover:text-door-madder-ink hover:bg-door-madder-soft"
          onClick={() => onRemove(index)}
          disabled={!canRemove || isCompositeAction}
          aria-label={t("removeRow")}
        >
          <Trash2 />
        </Button>
      </div>

      <div className="flex flex-col gap-4 p-3 sm:flex-row sm:flex-wrap sm:items-start sm:p-4">
        <div className="min-w-0 space-y-1.5 sm:max-w-[320px] sm:min-w-[220px] sm:flex-1">
          <Label className="text-ink-2 text-[13px] font-bold">{entityLabel}</Label>
          {data.row_type === "department" ? (
            <MultiSelect
              values={entityIds.map(String)}
              onValuesChange={(values) =>
                updateField(
                  entityField as keyof PointDetailRowData,
                  values.map(Number)
                )
              }
            >
              <MultiSelectTrigger className="h-10 w-full max-w-full pointer-coarse:h-11" disabled={isCompositeAction}>
                <MultiSelectValue
                  placeholder={t("selectDepartments")}
                  overflowBehavior="cutoff"
                />
              </MultiSelectTrigger>
              <MultiSelectContent
                search={{
                  placeholder: t("searchDepartments"),
                  emptyMessage: t("noDepartmentsFound"),
                }}
              >
                <MultiSelectGroup>
                  {departmentOptions.map((opt) => (
                    <MultiSelectItem key={opt.id} value={String(opt.id)}>
                      {opt.label}
                    </MultiSelectItem>
                  ))}
                </MultiSelectGroup>
              </MultiSelectContent>
            </MultiSelect>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                className={`bg-card h-10 w-full justify-start font-medium shadow-[inset_0_0_0_1px_var(--input)] pointer-coarse:h-11 ${isCompositeAction ? "cursor-not-allowed opacity-80" : ""}`}
                onClick={() => !isCompositeAction && setMemberDialogOpen(true)}
                disabled={isCompositeAction}
              >
                <Users className="text-ink-2 shrink-0" />
                <span className={`min-w-0 truncate ${data.member_ids.length === 0 ? "text-ink-3" : ""}`} dir="auto">
                  {getMemberDisplayText()}
                </span>
                {data.member_ids.length > 0 && <Count className="ms-auto">{data.member_ids.length}</Count>}
              </Button>
              <MemberSelectDialog
                open={memberDialogOpen}
                onOpenChange={setMemberDialogOpen}
                memberOptions={memberOptions}
                selectedIds={data.member_ids}
                onSelectionChange={(ids) => updateField("member_ids", ids)}
                onMemberCreated={onMemberCreated}
              />
            </>
          )}
        </div>

        {!isRestrictedMode && (
          <div className="space-y-1.5">
            <Label className="text-ink-2 flex items-center gap-1 text-[13px] font-bold">
              {t("points")}
              {isPointsLocked && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Lock className="text-ink-2 size-3.5" aria-label={t("pointsLockedTooltip")} />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t("pointsLockedTooltip")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </Label>
            {/* Phone: the stepper spans the panel, the number in the middle
                taking what is left. The steppers always read minus-to-plus
                left to right, like a number line, in both languages. */}
            <div dir="ltr" className="grid grid-cols-[3rem_2.75rem_minmax(0,1fr)_2.75rem_3rem] items-center gap-1.5 sm:flex sm:gap-1">
              <Button
                type="button"
                variant="outline"
                className={`${stepButton} gap-0.5 sm:w-12`}
                onClick={() => adjustPoints(-5)}
                disabled={isPointsLocked}
                aria-label="-5"
              >
                <Minus className="size-3 shrink-0" />
                <span className="tabular text-xs font-bold">5</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className={`${stepButton} sm:w-10`}
                onClick={() => adjustPoints(-1)}
                disabled={isPointsLocked}
                aria-label="-1"
              >
                <Minus className="size-3" />
              </Button>
              <Input
                type="number"
                inputMode="numeric"
                enterKeyHint="done"
                aria-label={t("points")}
                value={data.points}
                onChange={(e) =>
                  !isPointsLocked &&
                  updateField("points", parseInt(e.target.value) || 0)
                }
                disabled={isPointsLocked}
                className={`tabular h-10 w-full text-center text-base font-bold pointer-coarse:h-11 sm:w-20 ${
                  data.points < 0 ? "text-door-madder-ink" : ""
                } ${isPointsLocked ? "bg-sunk cursor-not-allowed" : ""}`}
              />
              <Button
                type="button"
                variant="outline"
                className={`${stepButton} sm:w-10`}
                onClick={() => adjustPoints(1)}
                disabled={isPointsLocked}
                aria-label="+1"
              >
                <Plus className="size-3" />
              </Button>
              <Button
                type="button"
                variant="outline"
                className={`${stepButton} gap-0.5 sm:w-12`}
                onClick={() => adjustPoints(5)}
                disabled={isPointsLocked}
                aria-label="+5"
              >
                <Plus className="size-3 shrink-0" />
                <span className="tabular text-xs font-bold">5</span>
              </Button>
            </div>
          </div>
        )}

        <div className="min-w-0 space-y-1.5 sm:min-w-[220px] sm:flex-1">
          <Label className="text-ink-2 text-[13px] font-bold">
            {isRestrictedMode ? (
              <>
                {t("action")} <span className="text-door-madder-ink">*</span>
              </>
            ) : (
              <>
                {t("reason")} <span className="text-ink-3 text-xs font-medium">{t("optional")}</span>
              </>
            )}
          </Label>
          <ActionReasonSelect
            actionOptions={actionOptions}
            selectedActionId={data.action_id}
            customActionName={data.action_name}
            onChange={handleActionChange}
            restricted={isRestrictedMode}
            error={isRestrictedMode && data.action_id === null}
            className="w-full pointer-coarse:min-h-11"
          />
        </div>
      </div>
    </div>
  );
}
