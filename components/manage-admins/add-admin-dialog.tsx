"use client";

import * as React from "react";
import { UserPlus, Loader2, Search, X } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { getMembers, updateMemberRole } from "@/lib/api";
import type { Member, MemberRole } from "@/lib/api-types";

interface AddAdminDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface SelectedMember {
  member: Member;
  role: MemberRole;
}

const MAX_DISPLAY = 50;

export function AddAdminDialog({ open, onOpenChange, onSuccess }: AddAdminDialogProps) {
  const { getToken } = useAuth();

  const [members, setMembers] = React.useState<Member[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedMembers, setSelectedMembers] = React.useState<SelectedMember[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Fetch members when dialog opens
  React.useEffect(() => {
    async function fetchMembers() {
      if (!open) return;
      if (members.length > 0) return; // Already loaded

      setIsLoadingMembers(true);
      const response = await getMembers(getToken);
      if (response.success) {
        // Sort members alphabetically by name
        const sortedMembers = [...response.data].sort((a, b) =>
          a.name.localeCompare(b.name)
        );
        setMembers(sortedMembers);
      } else {
        toast.error("Failed to load members: " + response.error.message);
      }
      setIsLoadingMembers(false);
    }
    fetchMembers();
  }, [open, getToken, members.length]);

  // Filter and limit members for display
  const displayMembers = React.useMemo(() => {
    let result = members;

    // Filter if search query exists
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = members.filter(
        (m) =>
          m.name.toLowerCase().includes(query) ||
          m.uni_id.toLowerCase().includes(query) ||
          m.email.toLowerCase().includes(query)
      );
    }

    // Exclude already selected members
    const selectedIds = new Set(selectedMembers.map((sm) => sm.member.id));
    result = result.filter((m) => !selectedIds.has(m.id));

    // Limit to MAX_DISPLAY
    return result.slice(0, MAX_DISPLAY);
  }, [members, searchQuery, selectedMembers]);

  // Reset form state when dialog closes
  React.useEffect(() => {
    if (!open) {
      setSelectedMembers([]);
      setSearchQuery("");
    }
  }, [open]);

  const handleSelectMember = (member: Member, role: MemberRole) => {
    setSelectedMembers((prev) => [...prev, { member, role }]);
  };

  const handleRemoveMember = (memberId: number) => {
    setSelectedMembers((prev) => prev.filter((sm) => sm.member.id !== memberId));
  };

  const handleSubmit = async () => {
    if (selectedMembers.length === 0) {
      toast.error("Please select at least one member");
      return;
    }

    setIsSubmitting(true);

    let successCount = 0;
    let failCount = 0;

    for (const { member, role } of selectedMembers) {
      try {
        // 1. Update role in backend
        const response = await updateMemberRole(member.id, role, getToken);

        if (!response.success) {
          toast.error(`Failed to promote ${member.name}: ${response.error.message}`);
          failCount++;
          continue;
        }

        // 2. Update Clerk metadata via API route
        const token = await getToken();
        const metadataResponse = await fetch("/api/admin/update-metadata", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            uni_id: member.uni_id,
            role: role,
          }),
        });

        if (!metadataResponse.ok) {
          const errorData = await metadataResponse.json();
          if (errorData.warning) {
            toast.warning(
              `${member.name}: Role updated in database, but user not found in authentication system.`
            );
          } else {
            toast.error(`${member.name}: Failed to update authentication metadata`);
          }
        }

        successCount++;
      } catch (error) {
        toast.error(
          `Failed to promote ${member.name}: ${error instanceof Error ? error.message : "Unknown error"}`
        );
        failCount++;
      }
    }

    setIsSubmitting(false);

    // Show summary
    if (successCount > 0) {
      toast.success(`Successfully promoted ${successCount} member${successCount > 1 ? "s" : ""}`);
    }
    if (failCount > 0) {
      toast.error(`Failed to promote ${failCount} member${failCount > 1 ? "s" : ""}`);
    }

    // Close dialog and refresh if any succeeded
    if (successCount > 0) {
      onOpenChange(false);
      onSuccess();
    }
  };

  const showLimitMessage = !searchQuery.trim() && members.length > MAX_DISPLAY;
  const showSearchLimitMessage = searchQuery.trim() && displayMembers.length >= MAX_DISPLAY;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-1xl! max-h-[85vh] flex flex-col w-full sm:!max-w-4xl">
        <DialogHeader>
          <DialogTitle>Add New Admins</DialogTitle>
          <DialogDescription>
            Search for members and select their role to promote them to administrators
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 min-h-0">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, uni_id, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              disabled={isLoadingMembers}
            />
          </div>

          {/* Member List */}
          <div className="border rounded-lg">
            <div className="p-3 border-b bg-muted/50">
              <h3 className="text-sm font-medium">Select Members</h3>
              {showLimitMessage && (
                <p className="text-xs text-muted-foreground mt-1">
                  Showing top {MAX_DISPLAY} results. Use search to find more.
                </p>
              )}
              {showSearchLimitMessage && (
                <p className="text-xs text-muted-foreground mt-1">
                  Showing top {MAX_DISPLAY} matching results.
                </p>
              )}
            </div>
            <div className="h-[250px] overflow-y-auto">
              {isLoadingMembers ? (
                <div className="space-y-2 p-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-[200px]" />
                        <Skeleton className="h-3 w-[150px]" />
                      </div>
                      <Skeleton className="h-8 w-[180px]" />
                    </div>
                  ))}
                </div>
              ) : displayMembers.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  {searchQuery.trim()
                    ? "No members found. Try a different search term."
                    : "All members have been selected."}
                </div>
              ) : (
                 <div className="divide-y">
                  {displayMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {member.uni_id} • {member.email}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0 pt-0.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSelectMember(member, "admin")}
                          disabled={isSubmitting}
                          className="whitespace-nowrap"
                        >
                          Admin
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSelectMember(member, "super_admin")}
                          disabled={isSubmitting}
                          className="whitespace-nowrap"
                        >
                          Super Admin
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Staging Area */}
          {selectedMembers.length > 0 && (
            <div className="border rounded-lg">
              <div className="p-3 border-b bg-muted/50">
                <h3 className="text-sm font-medium">
                  Selected Members ({selectedMembers.length})
                </h3>
              </div>
              <div className="max-h-[180px] overflow-y-auto">
                <div className="divide-y">
                  {selectedMembers.map(({ member, role }) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {member.uni_id}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant={role === "super_admin" ? "default" : "secondary"} className="whitespace-nowrap">
                          {role === "super_admin" ? "Super Admin" : "Admin"}
                        </Badge>
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          onClick={() => handleRemoveMember(member.id)}
                          disabled={isSubmitting}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={selectedMembers.length === 0 || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Promoting {selectedMembers.length} member{selectedMembers.length > 1 ? "s" : ""}...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Add {selectedMembers.length > 0 ? selectedMembers.length : ""} Admin
                {selectedMembers.length > 1 ? "s" : ""}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
