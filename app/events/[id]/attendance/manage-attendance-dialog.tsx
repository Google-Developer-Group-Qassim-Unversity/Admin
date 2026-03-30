"use client";

import * as React from "react";
import { UserPlus, UserMinus, Copy, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { getMembers } from "@/lib/api";
import { useMarkAttendanceManual, useRemoveAttendanceManual, useCopyAttendance } from "@/hooks/use-event";
import type { Member, AttendanceRecord } from "@/lib/api-types";

import type { Tab, ConfirmDialogState } from "./types";
import { DISPLAY_LIMIT } from "./types";
import { getDayNumberFromEffectiveDate, getMatchScore } from "./utils";
import { MemberSelectionTab } from "./member-selection-tab";
import { CopyTab } from "./copy-tab";
import { BackfillTab } from "./backfill-tab";
import { DaySelectDialog } from "./day-select-dialog";
import { ConfirmDialog } from "./confirm-dialog";

interface ManageAttendanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: number;
  dayCount: number;
  isMultiDay: boolean;
  eventStart: Date;
  attendanceData?: AttendanceRecord[];
}

export function ManageAttendanceDialog({
  open,
  onOpenChange,
  eventId,
  dayCount,
  isMultiDay,
  eventStart,
  attendanceData = [],
}: ManageAttendanceDialogProps) {
  const { getToken } = useAuth();

  const [activeTab, setActiveTab] = React.useState<Tab>("mark");
  const [allMembers, setAllMembers] = React.useState<Member[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedMemberIds, setSelectedMemberIds] = React.useState<Set<number>>(new Set());
  const [selectedDay, setSelectedDay] = React.useState<string>("1");
  const [backfillDay, setBackfillDay] = React.useState<string>("1");
  const [daySelectDialogOpen, setDaySelectDialogOpen] = React.useState(false);
  const [confirmDialog, setConfirmDialog] = React.useState<ConfirmDialogState | null>(null);

  const markMutation = useMarkAttendanceManual(getToken);
  const removeMutation = useRemoveAttendanceManual(getToken);
  const copyMutation = useCopyAttendance(getToken);

  const isSubmitting = markMutation.isPending || removeMutation.isPending || copyMutation.isPending;

  const fetchAllMembers = React.useCallback(async () => {
    setIsLoadingMembers(true);
    const response = await getMembers(getToken);
    if (response.success) {
      const sorted = [...response.data].sort((a, b) => a.name.localeCompare(b.name));
      setAllMembers(sorted);
    } else {
      toast.error("Failed to load members: " + response.error.message);
    }
    setIsLoadingMembers(false);
  }, [getToken]);

  React.useEffect(() => {
    if (open && activeTab === "mark" && allMembers.length === 0) {
      fetchAllMembers();
    }
  }, [open, activeTab, allMembers.length, fetchAllMembers]);

  React.useEffect(() => {
    if (!open) {
      setSelectedMemberIds(new Set());
      setSearchQuery("");
      setActiveTab("mark");
      setSelectedDay("1");
      setBackfillDay("1");
    }
  }, [open]);

  const searchWords = React.useMemo(() => {
    return searchQuery
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0)
      .map((w) => w.toLowerCase());
  }, [searchQuery]);

  const dayInt = parseInt(selectedDay, 10);

  const attendedMembers = React.useMemo(() => {
    if (activeTab !== "remove" || !eventStart) return [];

    const membersForDay: Member[] = [];
    for (const record of attendanceData) {
      const hasAttendanceOnDay = record.dates.some((dateStr) => {
        const dayNum = getDayNumberFromEffectiveDate(dateStr, eventStart);
        return dayNum === dayInt;
      });

      if (hasAttendanceOnDay) {
        membersForDay.push(record.Members);
      }
    }

    return membersForDay;
  }, [attendanceData, activeTab, dayInt, eventStart]);

  const availableMembers = React.useMemo(() => {
    const source = activeTab === "remove" ? attendedMembers : allMembers;
    let result = source.filter((m) => !selectedMemberIds.has(m.id));

    if (searchWords.length > 0) {
      result = result
        .map((m) => ({ member: m, score: getMatchScore(m, searchWords) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ member }) => member);
    }

    if (activeTab === "remove") {
      return result;
    }
    return result.slice(0, DISPLAY_LIMIT);
  }, [allMembers, attendedMembers, selectedMemberIds, searchWords, activeTab]);

  const totalAvailable = React.useMemo(() => {
    if (activeTab === "remove") {
      return attendedMembers.length;
    }
    return allMembers.length - selectedMemberIds.size;
  }, [activeTab, allMembers.length, selectedMemberIds.size, attendedMembers.length]);

  const selectedMembers = React.useMemo(() => {
    const source = activeTab === "remove" ? attendedMembers : allMembers;
    return source.filter((m) => selectedMemberIds.has(m.id));
  }, [allMembers, attendedMembers, selectedMemberIds, activeTab]);

  const handleAddMember = (memberId: number) => {
    setSelectedMemberIds((prev) => new Set(prev).add(memberId));
  };

  const handleRemoveMember = (memberId: number) => {
    setSelectedMemberIds((prev) => {
      const next = new Set(prev);
      next.delete(memberId);
      return next;
    });
  };

  const handleClearAll = () => {
    setSelectedMemberIds(new Set());
  };

  const handleMark = async (days?: number[]) => {
    const ids = [...selectedMemberIds];
    const result = await markMutation.mutateAsync({
      eventId,
      memberIds: ids,
      days: isMultiDay ? days : undefined,
    });
    toast.success(
      `Marked attendance for ${result.success} member${result.success !== 1 ? "s" : ""}`
    );
    if (result.failed > 0) {
      toast.warning(
        `${result.failed} member${result.failed !== 1 ? "s" : ""} already had attendance or not found`
      );
    }
    setDaySelectDialogOpen(false);
    onOpenChange(false);
  };

  const handleRemove = () => {
    const memberNames = selectedMembers.map((m) => m.name);
    setConfirmDialog({
      open: true,
      title: "Remove Attendance",
      description: `You are about to remove attendance for ${selectedMemberIds.size} member${selectedMemberIds.size !== 1 ? "s" : ""} on Day ${selectedDay}. This action cannot be undone.`,
      items: memberNames,
      onConfirm: async () => {
        const ids = [...selectedMemberIds];
        const result = await removeMutation.mutateAsync({
          eventId,
          memberIds: ids,
          day: isMultiDay ? dayInt : undefined,
        });
        toast.success(
          `Removed attendance for ${result.success} member${result.success !== 1 ? "s" : ""}`
        );
        if (result.failed > 0) {
          toast.warning(
            `${result.failed} member${result.failed !== 1 ? "s" : ""} had no attendance to remove`
          );
        }
        setConfirmDialog(null);
        onOpenChange(false);
      },
    });
  };

  const [copySourceDay, setCopySourceDay] = React.useState<string>("1");
  const [copyTargetDay, setCopyTargetDay] = React.useState<string>("2");

  const copySourceInt = parseInt(copySourceDay, 10);
  const copyTargetInt = parseInt(copyTargetDay, 10);

  const copyPreview = React.useMemo(() => {
    if (!eventStart) return { sourceCount: 0 };

    const sourceCount = attendanceData.filter((record) => {
      return record.dates.some((dateStr) => {
        const dayNum = getDayNumberFromEffectiveDate(dateStr, eventStart);
        return dayNum === copySourceInt;
      });
    }).length;
    return { sourceCount };
  }, [attendanceData, copySourceInt, eventStart]);

  const handleCopy = () => {
    setConfirmDialog({
      open: true,
      title: "Copy Attendance",
      description: `Copy attendance from Day ${copySourceDay} to Day ${copyTargetDay}. Members who already have attendance on the target day will be skipped.`,
      items: [`${copyPreview.sourceCount} members from Day ${copySourceDay}`],
      onConfirm: async () => {
        const result = await copyMutation.mutateAsync({
          eventId,
          sourceDay: copySourceInt,
          targetDays: [copyTargetInt],
        });
        toast.success(
          `Copied ${result.copied} attendance record${result.copied !== 1 ? "s" : ""}`
        );
        if (result.skipped > 0) {
          toast.info(`${result.skipped} already had attendance and were skipped`);
        }
        setConfirmDialog(null);
        onOpenChange(false);
      },
    });
  };

  const handleBackfillComplete = () => {
    onOpenChange(false);
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "mark", label: "Mark", icon: <UserPlus className="h-4 w-4" /> },
    { id: "remove", label: "Remove", icon: <UserMinus className="h-4 w-4" /> },
    { id: "copy", label: "Copy", icon: <Copy className="h-4 w-4" /> },
    { id: "backfill", label: "Backfill", icon: <Upload className="h-4 w-4" /> },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl! max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Manage Attendance</DialogTitle>
            <DialogDescription>
              Mark, remove, or copy attendance for this event
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-1 p-1 bg-muted rounded-lg">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedMemberIds(new Set());
                  setSearchQuery("");
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto">
            {activeTab === "mark" && (
              <MemberSelectionTab
                isLoading={isLoadingMembers}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                availableMembers={availableMembers}
                totalAvailable={totalAvailable}
                selectedMembers={selectedMembers}
                onAdd={handleAddMember}
                onRemove={handleRemoveMember}
                onClearAll={handleClearAll}
                isMultiDay={isMultiDay}
                selectedDay={selectedDay}
                onDayChange={setSelectedDay}
                dayCount={dayCount}
              />
            )}

            {activeTab === "remove" && (
              <MemberSelectionTab
                isLoading={false}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                availableMembers={availableMembers}
                totalAvailable={totalAvailable}
                selectedMembers={selectedMembers}
                onAdd={handleAddMember}
                onRemove={handleRemoveMember}
                onClearAll={handleClearAll}
                isMultiDay={isMultiDay}
                selectedDay={selectedDay}
                onDayChange={setSelectedDay}
                dayCount={dayCount}
                isRemoveMode
              />
            )}

            {activeTab === "copy" && (
              <CopyTab
                dayCount={dayCount}
                sourceDay={copySourceDay}
                onSourceDayChange={setCopySourceDay}
                targetDay={copyTargetDay}
                onTargetDayChange={setCopyTargetDay}
                preview={copyPreview}
              />
            )}

            {activeTab === "backfill" && (
              <BackfillTab
                dayCount={dayCount}
                selectedDay={backfillDay}
                onDayChange={setBackfillDay}
                onBackfillComplete={handleBackfillComplete}
                eventId={eventId}
                getToken={getToken}
              />
            )}
          </div>

          {activeTab !== "backfill" && (
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                Cancel
              </Button>
              {activeTab === "mark" && (
                <Button
                  onClick={() => (isMultiDay ? setDaySelectDialogOpen(true) : handleMark())}
                  disabled={selectedMemberIds.size === 0 || isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="mr-2 h-4 w-4" />
                  )}
                  Mark {selectedMemberIds.size > 0 ? selectedMemberIds.size : ""} Member
                  {selectedMemberIds.size !== 1 ? "s" : ""}
                </Button>
              )}
              {activeTab === "remove" && (
                <Button
                  variant="destructive"
                  onClick={handleRemove}
                  disabled={selectedMemberIds.size === 0 || isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UserMinus className="mr-2 h-4 w-4" />
                  )}
                  Remove {selectedMemberIds.size > 0 ? selectedMemberIds.size : ""} Member
                  {selectedMemberIds.size !== 1 ? "s" : ""}
                  {isMultiDay && ` for Day ${selectedDay}`}
                </Button>
              )}
              {activeTab === "copy" && (
                <Button onClick={handleCopy} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Copy className="mr-2 h-4 w-4" />
                  )}
                  Copy Attendance
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        dialog={confirmDialog}
        onOpenChange={() => setConfirmDialog(null)}
        isSubmitting={isSubmitting}
      />

      <DaySelectDialog
        open={daySelectDialogOpen}
        onOpenChange={setDaySelectDialogOpen}
        dayCount={dayCount}
        onConfirm={handleMark}
        memberCount={selectedMemberIds.size}
        isSubmitting={isSubmitting}
      />
    </>
  );
}
