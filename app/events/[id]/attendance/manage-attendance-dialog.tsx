"use client";

import * as React from "react";
import { UserPlus, UserMinus, Copy, Upload, Loader2, Mail } from "lucide-react";
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
import { CreateMemberDialog } from "@/components/manage-members/create-member-dialog";

import type { Tab, ConfirmDialogState } from "./types";
import { DISPLAY_LIMIT } from "./types";
import { getDayNumberFromEffectiveDate } from "./utils";
import { useFuzzySearch } from "@/lib/search-utils";
import { MemberSelectionTab } from "./member-selection-tab";
import { CopyTab } from "./copy-tab";
import { BackfillTab } from "./backfill-tab";
import { DaySelectDialog } from "./day-select-dialog";
import { ConfirmDialog } from "./confirm-dialog";
import { CertificateTab } from "./certificate-tab";
import { useTranslations } from "next-intl";

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
  const t = useTranslations("attendance.manageDialog");
  const tc = useTranslations("common.actions");
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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);

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
      toast.error(t("loadMembersFailed", { error: response.error.message }));
    }
    setIsLoadingMembers(false);
  }, [getToken, t]);

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
        membersForDay.push(record.Member);
      }
    }

    return membersForDay;
  }, [attendanceData, activeTab, dayInt, eventStart]);

  const sourceMembers = React.useMemo(() => {
    return activeTab === "remove" ? attendedMembers : allMembers;
  }, [activeTab, attendedMembers, allMembers]);

  const unselectedMembers = React.useMemo(() => {
    return sourceMembers.filter((m) => !selectedMemberIds.has(m.id));
  }, [sourceMembers, selectedMemberIds]);

  const fuzzyResults = useFuzzySearch(unselectedMembers, searchQuery, ["name", "uni_id"], {
    limit: activeTab === "remove" ? undefined : DISPLAY_LIMIT,
  });

  const availableMembers = searchQuery.trim()
    ? fuzzyResults
    : activeTab === "remove"
      ? unselectedMembers
      : unselectedMembers.slice(0, DISPLAY_LIMIT);

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

  const handleCreatedMember = React.useCallback((member: Member) => {
    setAllMembers((prev) => [...prev, member].sort((a, b) => a.name.localeCompare(b.name)));
    setSelectedMemberIds((prev) => new Set(prev).add(member.id));
  }, []);

  const handleMark = async (days?: number[]) => {
    const ids = [...selectedMemberIds];
    const result = await markMutation.mutateAsync({
      eventId,
      memberIds: ids,
      days: isMultiDay ? days : [1],
    });
    toast.success(t("markedSuccess", { count: result.success }));
    if (result.failed > 0) {
      toast.warning(t("markedFailedWarning", { count: result.failed }));
    }
    setDaySelectDialogOpen(false);
    onOpenChange(false);
  };

  const handleRemove = () => {
    const memberNames = selectedMembers.map((m) => m.name);
    setConfirmDialog({
      open: true,
      title: t("removeTitle"),
      description: t("removeDescription", { count: selectedMemberIds.size, day: selectedDay }),
      items: memberNames,
      onConfirm: async () => {
        const ids = [...selectedMemberIds];
        const result = await removeMutation.mutateAsync({
          eventId,
          memberIds: ids,
          day: isMultiDay ? dayInt : 1,
        });
        toast.success(t("removedSuccess", { count: result.success }));
        if (result.failed > 0) {
          toast.warning(t("removedFailedWarning", { count: result.failed }));
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
      title: t("copyTitle"),
      description: t("copyDescription", { source: copySourceDay, target: copyTargetDay }),
      items: [t("copyPreviewItem", { count: copyPreview.sourceCount, day: copySourceDay })],
      onConfirm: async () => {
        const result = await copyMutation.mutateAsync({
          eventId,
          sourceDay: copySourceInt,
          targetDays: [copyTargetInt],
        });
        toast.success(t("copiedSuccess", { count: result.copied }));
        if (result.skipped > 0) {
          toast.info(t("copiedSkipped", { count: result.skipped }));
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
    { id: "mark", label: t("tabs.mark"), icon: <UserPlus className="h-4 w-4" /> },
    { id: "remove", label: t("tabs.remove"), icon: <UserMinus className="h-4 w-4" /> },
    { id: "copy", label: t("tabs.copy"), icon: <Copy className="h-4 w-4" /> },
    { id: "backfill", label: t("tabs.backfill"), icon: <Upload className="h-4 w-4" /> },
    { id: "emails", label: t("tabs.emails"), icon: <Mail className="h-4 w-4" /> },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl! h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t("title")}</DialogTitle>
            <DialogDescription>
              {t("description")}
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
                onCreateMember={() => setIsCreateDialogOpen(true)}
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

            {activeTab === "emails" && (
              <CertificateTab
                eventId={eventId}
                getToken={getToken}
              />
            )}
          </div>

          {activeTab !== "backfill" && activeTab !== "emails" && (
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                {tc("cancel")}
              </Button>
              {activeTab === "mark" && (
                <Button
                  onClick={() => (isMultiDay ? setDaySelectDialogOpen(true) : handleMark())}
                  disabled={selectedMemberIds.size === 0 || isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="me-2 h-4 w-4" />
                  )}
                  {t("markButton", { count: selectedMemberIds.size })}
                </Button>
              )}
              {activeTab === "remove" && (
                <Button
                  variant="destructive"
                  onClick={handleRemove}
                  disabled={selectedMemberIds.size === 0 || isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UserMinus className="me-2 h-4 w-4" />
                  )}
                  {t("removeButton", { count: selectedMemberIds.size })}
                  {isMultiDay && t("forDay", { day: selectedDay })}
                </Button>
              )}
              {activeTab === "copy" && (
                <Button onClick={handleCopy} disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Copy className="me-2 h-4 w-4" />
                  )}
                  {t("copyAttendance")}
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

      <CreateMemberDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onCreatedMember={handleCreatedMember}
        getToken={getToken}
      />
    </>
  );
}
