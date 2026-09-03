"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { DaySelectDialogProps } from "./types";
import { useTranslations } from "next-intl";

export function DaySelectDialog({
  open,
  onOpenChange,
  dayCount,
  onConfirm,
  memberCount,
  isSubmitting,
}: DaySelectDialogProps) {
  const t = useTranslations("attendance.daySelect");
  const tc = useTranslations("common.actions");
  const [mode, setMode] = React.useState<"single" | "all">("single");
  const [selectedDay, setSelectedDay] = React.useState<string>("1");

  const allDays = React.useMemo(
    () => Array.from({ length: dayCount }, (_, i) => i + 1),
    [dayCount]
  );

  const handleConfirm = () => {
    if (mode === "all") {
      onConfirm(allDays);
    } else {
      onConfirm([parseInt(selectedDay, 10)]);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("title")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("description", { count: memberCount })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-3 py-2">
          <label className="flex items-center gap-3">
            <input
              type="radio"
              checked={mode === "single"}
              onChange={() => setMode("single")}
              className="h-4 w-4"
            />
            <Select
              value={selectedDay}
              onValueChange={setSelectedDay}
              disabled={mode !== "single"}
            >
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
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={mode === "all"}
              onChange={() => setMode("all")}
              className="h-4 w-4"
            />
            <span className="text-sm">{t("allDays", { count: dayCount })}</span>
          </label>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>{tc("cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
            {t("markAttendance")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
