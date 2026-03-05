"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { RequireRole } from "@/hooks/use-rbac";

import type { CopyTabProps } from "./types";

export function CopyTab({
  dayCount,
  sourceDay,
  onSourceDayChange,
  targetMode,
  onTargetModeChange,
  targetDay,
  onTargetDayChange,
  preview,
}: CopyTabProps) {
  const sourceInt = parseInt(sourceDay, 10);
  const remainingDays = Array.from({ length: dayCount - sourceInt }, (_, i) => sourceInt + 1 + i);

  return (
    <RequireRole role="super_admin">
      <div className="space-y-6 py-4">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium w-24">Source Day:</span>
            <Select value={sourceDay} onValueChange={onSourceDayChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: dayCount }, (_, i) => i + 1).map((day) => (
                  <SelectItem key={day} value={String(day)}>
                    Day {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-start gap-4">
            <span className="text-sm font-medium w-24">Target:</span>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={targetMode === "single"}
                  onChange={() => onTargetModeChange("single")}
                  className="h-4 w-4"
                />
                <span className="text-sm">Single day:</span>
                <Select
                  value={targetDay}
                  onValueChange={onTargetDayChange}
                  disabled={targetMode !== "single"}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {remainingDays.map((day) => (
                      <SelectItem key={day} value={String(day)}>
                        Day {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              {remainingDays.length > 1 && (
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={targetMode === "all"}
                    onChange={() => onTargetModeChange("all")}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">
                    All remaining days (Day {remainingDays[0]} -{" "}
                    {remainingDays[remainingDays.length - 1]})
                  </span>
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="border rounded-lg p-4 bg-muted/30">
          <h4 className="text-sm font-medium mb-2">Preview</h4>
          <p className="text-sm text-muted-foreground">
            {preview.sourceCount} members attended Day {sourceDay}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Members who already have attendance on target days will be skipped.
          </p>
        </div>
      </div>
    </RequireRole>
  );
}
