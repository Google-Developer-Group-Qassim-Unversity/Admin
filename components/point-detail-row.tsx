"use client";

import * as React from "react";
import { Minus, Plus, Trash2, Lock } from "lucide-react";

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
import type { GroupedActions } from "@/lib/api-types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface PointDetailRowData {
  /** Existing log_id for edit mode, undefined for new rows */
  log_id?: number;
  departments_id: number[];
  points: number;
  action_id: number | null;
  action_name: string | null;
}

interface PointDetailRowProps {
  data: PointDetailRowData;
  index: number;
  departmentOptions: ComboboxOption[];
  actionOptions: GroupedActions;
  onChange: (index: number, data: PointDetailRowData) => void;
  onRemove: (index: number) => void;
  canRemove: boolean;
}

export function PointDetailRow({
  data,
  index,
  departmentOptions,
  actionOptions,
  onChange,
  onRemove,
  canRemove,
}: PointDetailRowProps) {
  // Check if a predefined action is selected (points should be locked)
  const isPointsLocked = data.action_id !== null;

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
      // Predefined action selected - lock points to action's value
      updateMultipleFields({
        action_id: actionId,
        action_name: actionName,
        points: actionPoints,
      });
    } else {
      // Custom action or cleared - allow manual points entry
      updateMultipleFields({
        action_id: null,
        action_name: actionName,
        // Keep current points when switching to custom/cleared
      });
    }
  };

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-start gap-4 flex-wrap">
        {/* Department Selector */}
        <div className="flex-1 min-w-[200px] max-w-[300px] space-y-1.5">
          <Label className="text-sm font-medium">Department</Label>
          <MultiSelect
            values={data.departments_id.map(String)}
            onValuesChange={(values) =>
              updateField("departments_id", values.map(Number))
            }
          >
            <MultiSelectTrigger className="h-9 w-full max-w-full">
              <MultiSelectValue 
                placeholder="Select departments..." 
                overflowBehavior="cutoff" 
              />
            </MultiSelectTrigger>
            <MultiSelectContent 
              search={{ 
                placeholder: "Search departments...", 
                emptyMessage: "No departments found." 
              }}
            >
              <MultiSelectGroup>
                {departmentOptions.map((dept) => (
                  <MultiSelectItem key={dept.id} value={String(dept.id)}>
                    {dept.label}
                  </MultiSelectItem>
                ))}
              </MultiSelectGroup>
            </MultiSelectContent>
          </MultiSelect>
        </div>

        {/* Points Adjuster */}
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
                !isPointsLocked && updateField("points", parseInt(e.target.value) || 0)
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

        {/* Reason (Optional) - Action selector with groups */}
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

        {/* Remove Button */}
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
