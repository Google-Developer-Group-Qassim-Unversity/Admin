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

export function DaySelectDialog({
  open,
  onOpenChange,
  dayCount,
  onConfirm,
  memberCount,
  isSubmitting,
}: DaySelectDialogProps) {
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
          <AlertDialogTitle>Select Day(s)</AlertDialogTitle>
          <AlertDialogDescription>
            Choose which day(s) to mark attendance for {memberCount} member
            {memberCount !== 1 ? "s" : ""}.
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
                    Day {day}
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
            <span className="text-sm">All {dayCount} days</span>
          </label>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Mark Attendance
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
