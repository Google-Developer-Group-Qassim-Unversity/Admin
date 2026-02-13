"use client";

import * as React from "react";
import { Minus, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  MultiSelect,
  MultiSelectTrigger,
  MultiSelectValue,
  MultiSelectContent,
  MultiSelectGroup,
  MultiSelectItem,
} from "@/components/ui/multi-select";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import type { ComboboxOption } from "@/components/ui/department-combobox";
import type { Action } from "@/lib/api-types";

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
  actionOptions: Action[];
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
  const updateField = <K extends keyof PointDetailRowData>(
    field: K,
    value: PointDetailRowData[K]
  ) => {
    onChange(index, { ...data, [field]: value });
  };

  const adjustPoints = (delta: number) => {
    updateField("points", data.points + delta);
  };

  return (
    <div className="rounded-lg border bg-card p-4 space-y-4">
      <div className="flex items-start gap-4 flex-wrap">
        {/* Department Selector */}
        <div className="flex-1 min-w-[200px] space-y-1.5">
          <Label className="text-sm font-medium">Department</Label>
          <MultiSelect
            values={data.departments_id.map(String)}
            onValuesChange={(values) =>
              updateField("departments_id", values.map(Number))
            }
          >
            <MultiSelectTrigger className="h-9 w-full">
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
          <Label className="text-sm font-medium">Points</Label>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-12 p-0 gap-0.5"
              onClick={() => adjustPoints(-5)}
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
            >
              <Minus className="h-3 w-3" />
            </Button>
            <Input
              type="number"
              value={data.points}
              onChange={(e) =>
                updateField("points", parseInt(e.target.value) || 0)
              }
              className={`h-9 w-20 text-center font-mono text-sm ${
                data.points < 0 ? "text-destructive" : ""
              }`}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => adjustPoints(1)}
            >
              <Plus className="h-3 w-3" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-12 p-0 gap-0.5"
              onClick={() => adjustPoints(5)}
            >
              <Plus className="h-3 w-3 shrink-0" />
              <span className="text-xs font-semibold">5</span>
            </Button>
          </div>
        </div>

        {/* Reason (Optional) - TEMPORARILY HIDDEN FOR PATCH */}
        {/* TODO: Fix Reason field functionality in future release */}
        {/* <div className="flex-1 min-w-[180px] space-y-1.5">
          <Label className="text-sm font-medium text-muted-foreground">
            Reason{" "}
            <span className="text-xs font-normal">(optional)</span>
          </Label>
          <CreatableCombobox
            options={actionOptions.map(
              (action) => `${action.action_name}    +${action.points}`
            )}
            value={
              data.action_id
                ? (() => {
                    const matchedAction = actionOptions.find(
                      (a) => a.id === data.action_id
                    );
                    return matchedAction
                      ? `${matchedAction.action_name}    +${matchedAction.points}`
                      : data.action_name ?? "";
                  })()
                : data.action_name ?? ""
            }
            onChange={(val) => {
              // Check if selected value matches an existing action
              const matchedAction = actionOptions.find(
                (action) =>
                  `${action.action_name}    +${action.points}` === val
              );

              if (matchedAction) {
                // Pre-existing action selected
                updateField("action_id", matchedAction.id);
                updateField("action_name", matchedAction.action_name);
              } else {
                // Custom action typed or cleared
                updateField("action_id", null);
                updateField("action_name", val === "" ? null : val);
              }
            }}
            placeholder="Leave empty or add reason..."
            searchPlaceholder="Search or type reason..."
            emptyMessage="Type to create custom reason"
            className="border-dashed opacity-80 hover:opacity-100 focus-within:opacity-100"
          />
        </div> */}

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
