"use client";

import * as React from "react";
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
import type { ComboboxOption } from "@/components/ui/department-combobox";
import type { GroupedActions, PointRowType } from "@/lib/api-types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MemberSelectDialog } from "./member-select-dialog";

export interface MemberOption {
  id: number;
  label: string;
  uni_id: string;
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
}: PointDetailRowProps) {
  const isPointsLocked = data.action_id !== null;
  const [memberDialogOpen, setMemberDialogOpen] = React.useState(false);

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

  const entityLabel = data.row_type === "department" ? "Department" : "Member";
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
    if (count === 0) return "Select members...";
    if (count === 1) return selectedMemberNames[0] || "1 member";
    if (count <= 3) return selectedMemberNames.join(", ");
    return `${selectedMemberNames.slice(0, 2).join(", ")}, +${count - 2} more`;
  };

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px] max-w-[300px] space-y-1.5">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            {data.row_type === "department" ? (
              <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <User className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            {entityLabel}
          </Label>
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
              <MultiSelectTrigger className="h-9 w-full max-w-full">
                <MultiSelectValue
                  placeholder={`Select ${entityLabel.toLowerCase()}s...`}
                  overflowBehavior="cutoff"
                />
              </MultiSelectTrigger>
              <MultiSelectContent
                search={{
                  placeholder: `Search ${entityLabel.toLowerCase()}s...`,
                  emptyMessage: `No ${entityLabel.toLowerCase()}s found.`,
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
                className="h-9 w-full justify-start font-normal"
                onClick={() => setMemberDialogOpen(true)}
              >
                <Users className="h-4 w-4 mr-2 shrink-0 text-muted-foreground" />
                <span className={`truncate min-w-0 ${data.member_ids.length === 0 ? "text-muted-foreground" : ""}`}>
                  {getMemberDisplayText()}
                </span>
                {data.member_ids.length > 0 && (
                  <span className="ml-auto text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                    {data.member_ids.length}
                  </span>
                )}
              </Button>
              <MemberSelectDialog
                open={memberDialogOpen}
                onOpenChange={setMemberDialogOpen}
                memberOptions={memberOptions}
                selectedIds={data.member_ids}
                onSelectionChange={(ids) => updateField("member_ids", ids)}
              />
            </>
          )}
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm font-medium flex items-center gap-1">
            Points
            {isPointsLocked && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Lock className="h-3 w-3 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Points locked to selected action&apos;s value</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </Label>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-12 p-0 gap-0.5"
              onClick={() => adjustPoints(-5)}
              disabled={isPointsLocked}
            >
              <Minus className="h-3 w-3 shrink-0" />
              <span className="text-xs font-semibold">5</span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => adjustPoints(-1)}
              disabled={isPointsLocked}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <Input
              type="number"
              value={data.points}
              onChange={(e) =>
                !isPointsLocked &&
                updateField("points", parseInt(e.target.value) || 0)
              }
              disabled={isPointsLocked}
              className={`h-9 w-20 text-center font-mono text-sm ${
                data.points < 0 ? "text-destructive" : ""
              } ${isPointsLocked ? "bg-muted cursor-not-allowed" : ""}`}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => adjustPoints(1)}
              disabled={isPointsLocked}
            >
              <Plus className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-12 p-0 gap-0.5"
              onClick={() => adjustPoints(5)}
              disabled={isPointsLocked}
            >
              <Plus className="h-3 w-3 shrink-0" />
              <span className="text-xs font-semibold">5</span>
            </Button>
          </div>
        </div>

        <div className="flex-1 min-w-[200px] space-y-1.5">
          <Label className="text-sm font-medium text-muted-foreground">
            Reason{" "}
            <span className="text-xs font-normal">(optional)</span>
          </Label>
          <ActionReasonSelect
            actionOptions={actionOptions}
            selectedActionId={data.action_id}
            customActionName={data.action_id ? null : data.action_name}
            onChange={handleActionChange}
            className="border-dashed opacity-80 hover:opacity-100 focus-within:opacity-100"
          />
        </div>

        <div className="space-y-1.5 flex flex-col items-center">
          <Label className="text-sm font-medium text-transparent select-none">
            Del
          </Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(index)}
            disabled={!canRemove}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
