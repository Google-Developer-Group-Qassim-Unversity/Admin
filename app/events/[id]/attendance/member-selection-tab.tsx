"use client";

import { Search, X, Check, ChevronRight, Plus, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import type { MemberSelectionTabProps } from "./types";
import { DISPLAY_LIMIT } from "./types";
import { useTranslations } from "next-intl";

export function MemberSelectionTab({
  isLoading,
  searchQuery,
  setSearchQuery,
  availableMembers,
  totalAvailable,
  selectedMembers,
  onAdd,
  onRemove,
  onClearAll,
  isMultiDay,
  selectedDay,
  onDayChange,
  dayCount,
  isRemoveMode = false,
  onCreateMember,
}: MemberSelectionTabProps) {
  const t = useTranslations("attendance.memberSelection");
  const tc = useTranslations("common.actions");
  const showLimitHint =
    !isRemoveMode && totalAvailable > DISPLAY_LIMIT && searchQuery.trim() === "";

  return (
    <div className="flex h-full flex-col gap-3 sm:gap-4">
      {isMultiDay && isRemoveMode && (
        <Select value={selectedDay} onValueChange={onDayChange}>
          <SelectTrigger className="w-full shrink-0 sm:w-[140px]">
            <SelectValue placeholder={t("selectDay")} />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: dayCount }, (_, i) => i + 1).map((day) => (
              <SelectItem key={day} value={String(day)}>
                {t("day", { number: day })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* Phone: the (short) selected tray sits on top and the member list fills
          the rest of the sheet. sm+: the two lists side by side. */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 sm:min-h-[400px] sm:flex-row sm:gap-4">
        <div className="flex min-h-0 flex-1 flex-col rounded-lg border">
          <div className="flex min-h-11 items-center justify-between gap-2 border-b bg-sunk/60 px-3 py-1.5">
            <span className="tabular text-sm font-medium">
              {isRemoveMode ? t("attended") : t("available")} ({totalAvailable})
            </span>
            {!isRemoveMode && onCreateMember && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 gap-1 text-xs pointer-coarse:h-9 pointer-coarse:text-sm"
                onClick={onCreateMember}
              >
                <UserPlus className="h-3.5 w-3.5" />
                {t("create")}
              </Button>
            )}
          </div>
          <div className="border-b px-3 py-2">
            <div className="relative">
              <Search className="pointer-events-none absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-2" />
              <Input
                type="search"
                inputMode="search"
                enterKeyHint="search"
                autoComplete="off"
                placeholder={t("search")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 ps-8 text-sm pointer-coarse:h-10"
              />
            </div>
            {showLimitHint && (
              <p className="mt-1.5 text-xs text-ink-2">
                {t("limitHint", { shown: DISPLAY_LIMIT, total: totalAvailable })}
              </p>
            )}
          </div>
          <div className="min-h-40 flex-1 overflow-y-auto overscroll-contain sm:min-h-0">
            {isLoading ? (
              <div className="space-y-2 p-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : availableMembers.length === 0 ? (
              <div className="p-4 text-center text-sm text-ink-2">
                {searchQuery.trim()
                  ? t("noMembersFound")
                  : isRemoveMode
                    ? t("noAttendedForDay")
                    : t("noMembersAvailable")}
              </div>
            ) : (
              <div className="divide-y">
                {availableMembers.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-start hover:bg-sunk/60 focus-visible:bg-sunk/60 focus-visible:outline-none active:bg-sunk"
                    onClick={() => onAdd(member.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm"><bdi>{member.name}</bdi></p>
                      <p className="truncate text-[13px] text-ink-2 sm:text-xs">
                        <span className="tabular" dir="ltr">{member.uni_id ?? member.email}</span>
                      </p>
                    </div>
                    <Plus className="h-5 w-5 shrink-0 text-ink-2 sm:hidden" />
                    <ChevronRight className="hidden h-4 w-4 shrink-0 text-ink-2 rtl:-scale-x-100 sm:block" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="order-first flex max-h-[30%] shrink-0 flex-col rounded-lg border sm:order-none sm:max-h-none sm:min-h-0 sm:flex-1 sm:shrink">
          <div className="flex min-h-11 items-center justify-between gap-2 border-b bg-sunk/60 px-3 py-1.5">
            <span className="tabular text-sm font-medium">{t("selected", { count: selectedMembers.length })}</span>
            {selectedMembers.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs pointer-coarse:h-9 pointer-coarse:text-sm"
                onClick={onClearAll}
              >
                {t("clearAll")}
              </Button>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {selectedMembers.length === 0 ? (
              <div className="p-3 text-center text-sm text-ink-2 sm:p-4">
                {t("noneSelected")}
              </div>
            ) : (
              <div className="divide-y">
                {selectedMembers.map((member) => (
                  <div key={member.id} className="flex min-h-12 items-center gap-2 px-3 py-1.5 hover:bg-sunk/60">
                    <Check className="text-door-green-ink h-4 w-4 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm"><bdi>{member.name}</bdi></p>
                      <p className="truncate text-[13px] text-ink-2 sm:text-xs">
                        <span className="tabular" dir="ltr">{member.uni_id ?? member.email}</span>
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => onRemove(member.id)}
                      aria-label={`${tc("remove")} ${member.name}`}
                      className="pointer-coarse:size-10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
