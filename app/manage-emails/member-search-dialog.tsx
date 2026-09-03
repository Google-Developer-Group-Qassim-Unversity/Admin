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
import { useFuzzySearch } from "@/lib/search-utils";
import { useTranslations } from "next-intl";

interface MemberSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (members: Member[]) => void;
}

const MAX_DISPLAY = 50;

export function MemberSearchDialog({ open, onOpenChange, onConfirm }: MemberSearchDialogProps) {
  const t = useTranslations("memberSearch");
  const tc = useTranslations("common.actions");
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
        toast.error(t("loadFailed", { error: response.error.message }));
      }
      setIsLoading(false);
    }
    fetchMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, getToken, members.length]);

  React.useEffect(() => {
    if (!open) {
      setStagedIds(new Set());
      setSearchQuery("");
    }
  }, [open]);

  const unselectedMembers = React.useMemo(
    () => members.filter((m) => !stagedIds.has(m.id)),
    [members, stagedIds],
  );

  const fuzzyResults = useFuzzySearch(unselectedMembers, searchQuery, ["name", "uni_id", "email"], {
    limit: MAX_DISPLAY,
  });

  const displayMembers = searchQuery.trim() ? fuzzyResults : unselectedMembers.slice(0, MAX_DISPLAY);

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
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto flex-1 min-h-0">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-9"
              disabled={isLoading}
            />
          </div>

          <div className="border rounded-lg">
            <div className="p-3 border-b bg-muted/50 flex items-center justify-between">
              <h3 className="text-sm font-medium">{t("membersHeading")}</h3>
              {showLimitHint && (
                <p className="text-xs text-muted-foreground">
                  {t("limitHint", { max: MAX_DISPLAY })}
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
                  {searchQuery.trim() ? t("noneFound") : t("allSelected")}
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
                        <UserPlus className="h-3.5 w-3.5 me-1" />
                        {t("add")}
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
                  {t("selectedHeading", { count: stagedMembers.length })}
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
            {tc("cancel")}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={stagedMembers.length === 0}
          >
            <UserPlus className="me-2 h-4 w-4" />
            {t("confirm", { count: stagedMembers.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
