"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
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
  maxSelections?: number;
  allowCreate?: boolean;
  title?: string;
  description?: string;
  isLoading?: boolean;
  error?: string;
  onRetry?: () => void;
  emptyMessage?: string;
  applyLabel?: string | ((count: number) => string);
}

const DISPLAY_LIMIT = 50;

export function MemberSelectDialog({
  open,
  onOpenChange,
  memberOptions,
  selectedIds,
  onSelectionChange,
  onMemberCreated,
  maxSelections,
  allowCreate = true,
  title,
  description,
  isLoading = false,
  error,
  onRetry,
  emptyMessage,
  applyLabel,
}: MemberSelectDialogProps) {
  const t = useTranslations("memberSelectDialog");
  const tc = useTranslations("common.actions");
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

  const fuzzyResults = useFuzzySearch(unselectedMembers, searchQuery, ["label", "uni_id", "email"]);

  const availableMembers = (searchQuery.trim() ? fuzzyResults : unselectedMembers).slice(0, DISPLAY_LIMIT);

  const totalAvailable = searchQuery.trim() ? fuzzyResults.length : unselectedMembers.length;

  const handleAddMember = (id: number) => {
    setPendingSelectedIds((prev) => {
      if (maxSelections === 1) return new Set([id]);
      if (maxSelections !== undefined && prev.size >= maxSelections) return prev;
      return new Set(prev).add(id);
    });
  };

  const handleRemoveMember = (id: number) => {
    setPendingSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleApply = () => {
    const availableIds = new Set(memberOptions.map((member) => member.id));
    const selection = [...pendingSelectedIds].filter((id) => availableIds.has(id));
    if (isLoading || error || selection.length === 0) return;
    onSelectionChange(selection);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleMemberCreated = React.useCallback(
    (member: Member) => {
      setPendingSelectedIds((prev) => (maxSelections === 1 ? new Set([member.id]) : new Set(prev).add(member.id)));
      onMemberCreated?.(member);
    },
    [onMemberCreated, maxSelections],
  );

  const showLimitHint = !searchQuery.trim() && totalAvailable > DISPLAY_LIMIT;
  const showSearchLimitHint = searchQuery.trim().length > 0 && totalAvailable > DISPLAY_LIMIT;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          closeLabel={tc("close")}
          className="w-[calc(100%-2rem)] max-w-3xl! h-[85dvh] md:h-[min(40rem,85dvh)] flex flex-col gap-4 overflow-hidden p-4 sm:p-6"
        >
          <DialogHeader className="shrink-0 pe-6">
            <DialogTitle>{title ?? t("title")}</DialogTitle>
            <DialogDescription>{description ?? t("description")}</DialogDescription>
          </DialogHeader>

          {isLoading && (
            <div role="status" className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              {t("loading")}
            </div>
          )}
          {error && (
            <div role="alert" className="flex-1 space-y-2 overflow-y-auto text-sm text-destructive">
              <p>{error}</p>
              {onRetry && (
                <Button variant="outline" onClick={onRetry}>
                  {tc("retry")}
                </Button>
              )}
            </div>
          )}

          {!isLoading && !error && (
            <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-3">
              {/* Available Members Column */}
              <div className="min-h-0 min-w-0 flex-1 flex flex-col border rounded-lg">
                <div className="shrink-0 px-3 py-2 border-b bg-muted/50 flex flex-wrap gap-1 items-center justify-between">
                  <span className="text-sm font-medium">{t("available", { count: totalAvailable })}</span>
                  {allowCreate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => setIsCreateDialogOpen(true)}
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                      {t("create")}
                    </Button>
                  )}
                </div>
                <div className="shrink-0 px-3 py-2 border-b">
                  <div className="relative">
                    <Search className="absolute start-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      aria-label={t("searchPlaceholder")}
                      placeholder={t("searchPlaceholder")}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="ps-8 h-8 text-sm"
                    />
                  </div>
                  {(showLimitHint || showSearchLimitHint) && (
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {t("showingLimit", { limit: DISPLAY_LIMIT, total: totalAvailable })}
                    </p>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
                  {availableMembers.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      {searchQuery.trim()
                        ? t("noneFound")
                        : memberOptions.length === 0
                          ? (emptyMessage ?? t("noneAvailable"))
                          : t("allSelected")}
                    </div>
                  ) : (
                    <div className="divide-y">
                      {availableMembers.map((member) => (
                        <button
                          type="button"
                          key={member.id}
                          className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-start hover:bg-muted/50 focus-visible:bg-muted focus-visible:outline-ring cursor-pointer"
                          onClick={() => handleAddMember(member.id)}
                        >
                          <div className="h-4 w-4 border rounded shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm wrap-anywhere">
                              <bdi>{member.label}</bdi>
                            </p>
                            <p className="text-xs text-muted-foreground wrap-anywhere">
                              <bdi>{member.uni_id ?? member.email}</bdi>
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Selected Members Column */}
              <div className="min-h-0 min-w-0 max-h-32 shrink-0 flex flex-col border rounded-lg md:max-h-none md:flex-1">
                <div className="shrink-0 px-3 py-2 border-b bg-muted/50 flex flex-wrap gap-1 items-center justify-between">
                  <span className="text-sm font-medium">{t("selected", { count: selectedMembers.length })}</span>
                  {selectedMembers.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => setPendingSelectedIds(new Set())}
                    >
                      {tc("clearAll")}
                    </Button>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
                  {selectedMembers.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">{t("noneSelected")}</div>
                  ) : (
                    <div className="divide-y">
                      {selectedMembers.map((member) => (
                        <div key={member.id} className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50">
                          <Check className="h-4 w-4 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm wrap-anywhere">
                              <bdi>{member.label}</bdi>
                            </p>
                            <p className="text-xs text-muted-foreground wrap-anywhere">
                              <bdi>{member.uni_id ?? member.email}</bdi>
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="size-10 shrink-0 sm:size-8"
                            aria-label={`${tc("remove")} ${member.label}`}
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
          )}
          <DialogFooter className="shrink-0">
            <Button variant="outline" onClick={handleCancel}>
              {tc("cancel")}
            </Button>
            <Button onClick={handleApply} disabled={isLoading || !!error || selectedMembers.length === 0}>
              {typeof applyLabel === "function"
                ? applyLabel(selectedMembers.length)
                : (applyLabel ?? t("apply", { count: selectedMembers.length }))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {allowCreate && (
        <CreateMemberDialog
          open={isCreateDialogOpen}
          onOpenChange={setIsCreateDialogOpen}
          onCreatedMember={handleMemberCreated}
          getToken={getToken}
        />
      )}
    </>
  );
}
