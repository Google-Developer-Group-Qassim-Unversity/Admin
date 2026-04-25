"use client";

import * as React from "react";
import { Search, X, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";

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
import { Skeleton } from "@/components/ui/skeleton";

import { getMembers } from "@/lib/api";
import type { Member } from "@/lib/api-types";

interface MemberSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (members: Member[]) => void;
}

const MAX_DISPLAY = 50;

function getMatchScore(member: Member, searchWords: string[]): number {
  if (searchWords.length === 0) return 0;
  const nameParts = member.name.toLowerCase().split(/\s+/);
  const uniIdLower = member.uni_id.toLowerCase();
  const emailLower = member.email.toLowerCase();

  let score = 0;
  for (const word of searchWords) {
    let wordScore = 0;
    for (const part of nameParts) {
      if (part.startsWith(word)) wordScore = 2;
      else if (part.includes(word) && wordScore < 2) wordScore = 1;
    }
    if (wordScore === 0 && uniIdLower.includes(word)) wordScore = 1;
    if (wordScore === 0 && emailLower.includes(word)) wordScore = 1;
    if (wordScore === 0) return -1;
    score += wordScore;
  }
  return score;
}

export function MemberSearchDialog({ open, onOpenChange, onConfirm }: MemberSearchDialogProps) {
  const { getToken } = useAuth();

  const [members, setMembers] = React.useState<Member[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [stagedIds, setStagedIds] = React.useState<Set<number>>(new Set());

  React.useEffect(() => {
    async function fetchMembers() {
      if (!open) return;
      if (members.length > 0) return;

      setIsLoading(true);
      const response = await getMembers(getToken);
      if (response.success) {
        setMembers([...response.data].sort((a, b) => a.name.localeCompare(b.name)));
      } else {
        toast.error("Failed to load members: " + response.error.message);
      }
      setIsLoading(false);
    }
    fetchMembers();
  }, [open, getToken, members.length]);

  React.useEffect(() => {
    if (!open) {
      setStagedIds(new Set());
      setSearchQuery("");
    }
  }, [open]);

  const searchWords = React.useMemo(
    () => searchQuery.trim().split(/\s+/).filter((w) => w.length > 0).map((w) => w.toLowerCase()),
    [searchQuery],
  );

  const displayMembers = React.useMemo(() => {
    let result = members.filter((m) => !stagedIds.has(m.id));

    if (searchWords.length > 0) {
      result = result
        .map((m) => ({ member: m, score: getMatchScore(m, searchWords) }))
        .filter(({ score }) => score >= 0)
        .sort((a, b) => b.score - a.score)
        .map(({ member }) => member);
    }

    return result.slice(0, MAX_DISPLAY);
  }, [members, searchWords, stagedIds]);

  const stagedMembers = React.useMemo(
    () => members.filter((m) => stagedIds.has(m.id)),
    [members, stagedIds],
  );

  const handleStage = (member: Member) => {
    setStagedIds((prev) => new Set(prev).add(member.id));
  };

  const handleUnstage = (memberId: number) => {
    setStagedIds((prev) => {
      const next = new Set(prev);
      next.delete(memberId);
      return next;
    });
  };

  const handleConfirm = () => {
    if (stagedMembers.length === 0) return;
    onConfirm(stagedMembers);
    onOpenChange(false);
  };

  const showLimitHint = !searchQuery.trim() && members.length - stagedIds.size > MAX_DISPLAY;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl! max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Pick Members</DialogTitle>
          <DialogDescription>
            Search and select members to add as certificate recipients. Their details will fill the form fields.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 min-h-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, uni ID, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              disabled={isLoading}
            />
          </div>

          <div className="border rounded-lg">
            <div className="p-3 border-b bg-muted/50 flex items-center justify-between">
              <h3 className="text-sm font-medium">Members</h3>
              {showLimitHint && (
                <p className="text-xs text-muted-foreground">
                  Showing {MAX_DISPLAY} results. Use search to find more.
                </p>
              )}
            </div>
            <div className="h-[200px] overflow-y-auto">
              {isLoading ? (
                <div className="space-y-2 p-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-[180px]" />
                        <Skeleton className="h-3 w-[130px]" />
                      </div>
                      <Skeleton className="h-8 w-20" />
                    </div>
                  ))}
                </div>
              ) : displayMembers.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  {searchQuery.trim() ? "No members found." : "All members have been selected."}
                </div>
              ) : (
                <div className="divide-y">
                  {displayMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{member.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {member.uni_id} &bull; {member.email}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStage(member)}
                        className="shrink-0"
                      >
                        <UserPlus className="h-3.5 w-3.5 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {stagedMembers.length > 0 && (
            <div className="border rounded-lg">
              <div className="p-3 border-b bg-muted/50">
                <h3 className="text-sm font-medium">
                  Selected ({stagedMembers.length})
                </h3>
              </div>
              <div className="max-h-[160px] overflow-y-auto">
                <div className="divide-y">
                  {stagedMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{member.name}</p>
                        <p className="text-xs text-muted-foreground">{member.uni_id}</p>
                      </div>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => handleUnstage(member.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={stagedMembers.length === 0}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add {stagedMembers.length > 0 ? stagedMembers.length : ""} Member{stagedMembers.length !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
