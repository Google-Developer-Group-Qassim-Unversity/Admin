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
import { useTranslations } from "next-intl";

export function CopyTab({
  dayCount,
  sourceDay,
  onSourceDayChange,
  targetDay,
  onTargetDayChange,
  preview,
}: CopyTabProps) {
  const t = useTranslations("attendance.copyTab");
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
        title={t("multiDayTitle")}
        description={t("multiDayDescription")}
      />
    );
  }

  if (!hasAccess) {
    return (
      <AccessDenied
        title={t("superAdminTitle")}
        description={t("superAdminDescription")}
      />
    );
  }

  return (
    <div className="space-y-6 py-4">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium w-24">{t("sourceDay")}</span>
          <Select value={sourceDay} onValueChange={onSourceDayChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allDays.map((day) => (
                <SelectItem key={day} value={String(day)}>
                  {t("day", { number: day })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-sm font-medium w-24">{t("targetDay")}</span>
          <Select value={targetDay} onValueChange={onTargetDayChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {remainingDays.map((day) => (
                <SelectItem key={day} value={String(day)}>
                  {t("day", { number: day })}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-lg p-4 bg-muted/30">
        <h4 className="text-sm font-medium mb-2">{t("preview")}</h4>
        <p className="text-sm text-muted-foreground">
          {t("previewCount", { count: preview.sourceCount, day: sourceDay })}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {t("skipHint")}
        </p>
      </div>
    </div>
  );
}
