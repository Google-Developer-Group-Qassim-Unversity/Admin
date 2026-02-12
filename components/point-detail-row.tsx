"use client";

import * as React from "react";
import { Minus, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  DepartmentCombobox,
  type ComboboxOption,
} from "@/components/ui/department-combobox";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";

export interface PointDetailRowData {
  /** Existing log_id for edit mode, undefined for new rows */
  log_id?: number;
  departments_id: number[];
  points: number;
  action_id: number | null;
  action_name: string | null;
  /** Client-side only: visibility toggle (not connected to API) */
  visible: boolean;
}

interface PointDetailRowProps {
  data: PointDetailRowData;
  index: number;
  departmentOptions: ComboboxOption[];
  actionOptions: string[];
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
          <DepartmentCombobox
            options={departmentOptions}
            value={data.departments_id[0] ?? null}
            onChange={(id) =>
              updateField("departments_id", id !== null ? [id] : [])
            }
            placeholder="Select department..."
            searchPlaceholder="Search departments..."
          />
        </div>

        {/* Points Adjuster */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Points</Label>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 w-9 p-0 text-xs font-bold"
              onClick={() => adjustPoints(-5)}
            >
              <Minus className="h-3 w-3" />5
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
              className="h-9 w-9 p-0 text-xs font-bold"
              onClick={() => adjustPoints(5)}
            >
              <Plus className="h-3 w-3" />5
            </Button>
          </div>
        </div>

        {/* Reason (Optional) */}
        <div className="flex-1 min-w-[180px] space-y-1.5">
          <Label className="text-sm font-medium text-muted-foreground">
            Reason{" "}
            <span className="text-xs font-normal">(optional)</span>
          </Label>
          <CreatableCombobox
            options={actionOptions}
            value={data.action_name ?? ""}
            onChange={(val) => {
              updateField("action_name", val || null);
              // Clear action_id when user types a custom reason
              updateField("action_id", null);
            }}
            placeholder="Add reason..."
            searchPlaceholder="Search reasons..."
            emptyMessage="No matching reasons."
            className="border-dashed opacity-80 hover:opacity-100 focus-within:opacity-100"
          />
        </div>

        {/* Visibility Toggle */}
        <div className="space-y-1.5 flex flex-col items-center min-w-[70px]">
          <Label className="text-sm font-medium text-muted-foreground">
            Visible
          </Label>
          <div className="flex items-center h-9">
            <Switch
              checked={data.visible}
              onCheckedChange={(checked) =>
                updateField("visible", !!checked)
              }
            />
          </div>
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
