"use client";

import * as React from "react";
import { Search, X, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import type { MemberOption } from "./point-detail-row";

interface MemberSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberOptions: MemberOption[];
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
}

const DISPLAY_LIMIT = 50;

export function MemberSelectDialog({
  open,
  onOpenChange,
  memberOptions,
  selectedIds,
  onSelectionChange,
}: MemberSelectDialogProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [pendingSelectedIds, setPendingSelectedIds] = React.useState<Set<number>>(new Set());

  React.useEffect(() => {
    if (open) {
      setPendingSelectedIds(new Set(selectedIds));
      setSearchQuery("");
    }
  }, [open, selectedIds]);

  const sortedMembers = React.useMemo(() => {
    return [...memberOptions].sort((a, b) => a.label.localeCompare(b.label));
  }, [memberOptions]);

  const selectedMembers = React.useMemo(() => {
    return sortedMembers.filter((m) => pendingSelectedIds.has(m.id));
  }, [sortedMembers, pendingSelectedIds]);

  const getMatchScore = (member: MemberOption, searchWords: string[]) => {
    if (searchWords.length === 0) return 0;
    const nameParts = member.label.toLowerCase().split(/\s+/);
    const uniIdLower = member.uni_id.toLowerCase();
    
    let score = 0;
    for (const word of searchWords) {
      let wordScore = 0;
      for (const part of nameParts) {
        if (part.startsWith(word)) {
          wordScore = 2;
        } else if (part.includes(word) && wordScore < 2) {
          wordScore = 1;
        }
      }
      if (wordScore === 0 && uniIdLower.includes(word)) {
        wordScore = 1;
      }
      if (wordScore === 0) return -1;
      score += wordScore;
    }
    return score;
  };

  const matchesSearch = (member: MemberOption, searchWords: string[]) => {
    return getMatchScore(member, searchWords) >= 0;
  };

  const searchWords = React.useMemo(() => {
    return searchQuery
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0)
      .map((w) => w.toLowerCase());
  }, [searchQuery]);

  const availableMembers = React.useMemo(() => {
    let result = sortedMembers.filter((m) => !pendingSelectedIds.has(m.id));

    if (searchWords.length > 0) {
      result = result
        .map((m) => ({ member: m, score: getMatchScore(m, searchWords) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ member }) => member);
    }

    return result.slice(0, DISPLAY_LIMIT);
  }, [sortedMembers, pendingSelectedIds, searchWords]);

  const totalAvailable = React.useMemo(() => {
    if (searchWords.length === 0) {
      return sortedMembers.filter((m) => !pendingSelectedIds.has(m.id)).length;
    }
    return sortedMembers.filter(
      (m) => !pendingSelectedIds.has(m.id) && matchesSearch(m, searchWords)
    ).length;
  }, [sortedMembers, pendingSelectedIds, searchWords]);

  const handleAddMember = (id: number) => {
    setPendingSelectedIds((prev) => new Set(prev).add(id));
  };

  const handleRemoveMember = (id: number) => {
    setPendingSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleApply = () => {
    onSelectionChange([...pendingSelectedIds]);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const showLimitHint = searchWords.length === 0 && totalAvailable > DISPLAY_LIMIT;
  const showSearchLimitHint = searchWords.length > 0 && totalAvailable > DISPLAY_LIMIT;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl! max-h-[90vh] md:max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Members</DialogTitle>
          <DialogDescription>
            Search and select members to assign points to
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-4">
          {/* Selected Members Column */}
          <div className="flex-1 flex flex-col border rounded-lg">
            <div className="px-3 py-2 border-b bg-muted/50 flex items-center justify-between">
              <span className="text-sm font-medium">Selected ({selectedMembers.length})</span>
              {selectedMembers.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => setPendingSelectedIds(new Set())}
                >
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
                    <div
                      key={member.id}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50"
                    >
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{member.label}</p>
                        <p className="text-xs text-muted-foreground">{member.uni_id}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="shrink-0"
                        onClick={() => handleRemoveMember(member.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Available Members Column */}
          <div className="flex-1 flex flex-col border rounded-lg">
            <div className="px-3 py-2 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or uni ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
              {(showLimitHint || showSearchLimitHint) && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  Showing {DISPLAY_LIMIT} of {totalAvailable}. Refine search to find more.
                </p>
              )}
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              {availableMembers.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  {searchQuery.trim() ? "No members found" : "All members selected"}
                </div>
              ) : (
                <div className="divide-y">
                  {availableMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleAddMember(member.id)}
                    >
                      <div className="h-4 w-4 border rounded shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{member.label}</p>
                        <p className="text-xs text-muted-foreground">{member.uni_id}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={pendingSelectedIds.size === 0}>
            Apply ({pendingSelectedIds.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
