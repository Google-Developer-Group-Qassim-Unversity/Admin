"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccessDenied } from "@/components/ui/access-denied";
import { useHasPermission } from "@/hooks/use-rbac";

import type { CopyTabProps } from "./types";

export function CopyTab({
  dayCount,
  sourceDay,
  onSourceDayChange,
  targetDay,
  onTargetDayChange,
  preview,
}: CopyTabProps) {
  const hasAccess = useHasPermission(["super_admin"]);

  const sourceInt = parseInt(sourceDay, 10);
  const allDays = Array.from({ length: dayCount }, (_, i) => i + 1);
  const remainingDays = allDays.filter((d) => d !== sourceInt);

  React.useEffect(() => {
    if (remainingDays.length > 0 && !remainingDays.includes(parseInt(targetDay, 10))) {
      onTargetDayChange(String(remainingDays[0]));
    }
  }, [sourceDay, dayCount]);

  if (dayCount <= 1) {
    return (
      <AccessDenied
        title="Multi-day Event Required"
        description="Copying attendance requires an event with at least 2 days."
      />
    );
  }

  if (!hasAccess) {
    return (
      <AccessDenied
        title="Super Admin Access Required"
        description="Only super admins can copy attendance between days."
      />
    );
  }

  return (
    <div className="space-y-6 py-4">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium w-24">Source Day:</span>
          <Select value={sourceDay} onValueChange={onSourceDayChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allDays.map((day) => (
                <SelectItem key={day} value={String(day)}>
                  Day {day}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm font-medium w-24">Target Day:</span>
          <Select value={targetDay} onValueChange={onTargetDayChange}>
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
        </div>
      </div>

      <div className="border rounded-lg p-4 bg-muted/30">
        <h4 className="text-sm font-medium mb-2">Preview</h4>
        <p className="text-sm text-muted-foreground">
          {preview.sourceCount} members attended Day {sourceDay}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Members who already have attendance on the target day will be skipped.
        </p>
      </div>
    </div>
  );
}
