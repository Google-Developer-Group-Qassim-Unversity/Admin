"use client";

import * as React from "react";
import { Search, X, Check, UserPlus } from "lucide-react";
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
import { useFuzzySearch } from "@/lib/search-utils";
import { CreateMemberDialog } from "@/components/manage-members/create-member-dialog";
import type { Member } from "@/lib/api-types";

import type { MemberOption } from "./point-detail-row";

interface MemberSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  memberOptions: MemberOption[];
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
  onMemberCreated?: (member: Member) => void;
}

const DISPLAY_LIMIT = 50;

export function MemberSelectDialog({
  open,
  onOpenChange,
  memberOptions,
  selectedIds,
  onSelectionChange,
  onMemberCreated,
}: MemberSelectDialogProps) {
  const { getToken } = useAuth();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [pendingSelectedIds, setPendingSelectedIds] = React.useState<Set<number>>(new Set());
  const [isCreateDialogOpen, setIsCreateDialogOpen] = React.useState(false);

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

  const unselectedMembers = React.useMemo(() => {
    return sortedMembers.filter((m) => !pendingSelectedIds.has(m.id));
  }, [sortedMembers, pendingSelectedIds]);

  const fuzzyResults = useFuzzySearch(unselectedMembers, searchQuery, ["label", "uni_id"], {
    limit: DISPLAY_LIMIT,
  });

  const availableMembers = searchQuery.trim() ? fuzzyResults : unselectedMembers.slice(0, DISPLAY_LIMIT);

  const totalAvailable = searchQuery.trim() ? fuzzyResults.length : unselectedMembers.length;

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

  const handleMemberCreated = React.useCallback((member: Member) => {
    setPendingSelectedIds((prev) => new Set(prev).add(member.id));
    onMemberCreated?.(member);
  }, [onMemberCreated]);

  const showLimitHint = !searchQuery.trim() && totalAvailable > DISPLAY_LIMIT;
  const showSearchLimitHint = searchQuery.trim().length > 0 && totalAvailable > DISPLAY_LIMIT;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl! max-h-[90vh] md:max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Members</DialogTitle>
          <DialogDescription>
            Search and select members to assign points to
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-4">
          {/* Available Members Column */}
          <div className="flex-1 flex flex-col border rounded-lg">
            <div className="px-3 py-2 border-b bg-muted/50 flex items-center justify-between">
              <span className="text-sm font-medium">
                Available ({totalAvailable})
              </span>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => setIsCreateDialogOpen(true)}>
                <UserPlus className="h-3.5 w-3.5" />
                Create
              </Button>
            </div>
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
                        <p className="text-xs text-muted-foreground">{member.uni_id ?? "—"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

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
                        <p className="text-xs text-muted-foreground">{member.uni_id ?? "—"}</p>
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

    <CreateMemberDialog
      open={isCreateDialogOpen}
      onOpenChange={setIsCreateDialogOpen}
      onCreatedMember={handleMemberCreated}
      getToken={getToken}
    />
    </>
  );
}
