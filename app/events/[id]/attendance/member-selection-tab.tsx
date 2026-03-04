"use client";

import { Search, X, Check, ChevronRight } from "lucide-react";

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
}: MemberSelectionTabProps) {
  const showLimitHint =
    !isRemoveMode && totalAvailable > DISPLAY_LIMIT && searchQuery.trim() === "";

  return (
    <div className="space-y-4">
      {isMultiDay && isRemoveMode && (
        <Select value={selectedDay} onValueChange={onDayChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Select day" />
          </SelectTrigger>
          <SelectContent>
            {Array.from({ length: dayCount }, (_, i) => i + 1).map((day) => (
              <SelectItem key={day} value={String(day)}>
                Day {day}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <div className="flex gap-4 min-h-[400px]">
        <div className="flex-1 flex flex-col border rounded-lg">
          <div className="px-3 py-2 border-b bg-muted/50 flex items-center justify-between">
            <span className="text-sm font-medium">
              {isRemoveMode ? "Attended" : "Available"} ({totalAvailable})
            </span>
          </div>
          <div className="px-3 py-2 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
            {showLimitHint && (
              <p className="text-xs text-muted-foreground mt-1.5">
                Showing {DISPLAY_LIMIT} of {totalAvailable}. Use search to find more.
              </p>
            )}
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            {isLoading ? (
              <div className="space-y-2 p-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : availableMembers.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {searchQuery.trim()
                  ? "No members found"
                  : isRemoveMode
                    ? "No attended members for this day"
                    : "No members available"}
              </div>
            ) : (
              <div className="divide-y">
                {availableMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 cursor-pointer"
                    onClick={() => onAdd(member.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.uni_id}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col border rounded-lg">
          <div className="px-3 py-2 border-b bg-muted/50 flex items-center justify-between">
            <span className="text-sm font-medium">Selected ({selectedMembers.length})</span>
            {selectedMembers.length > 0 && (
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onClearAll}>
                Clear all
              </Button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto min-h-0">
            {selectedMembers.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No members selected
              </div>
            ) : (
              <div className="divide-y">
                {selectedMembers.map((member) => (
                  <div key={member.id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.uni_id}</p>
                    </div>
                    <Button variant="ghost" size="icon-sm" onClick={() => onRemove(member.id)}>
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
