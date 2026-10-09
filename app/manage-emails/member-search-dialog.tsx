"use client";

import * as React from "react";
import { Search, X, UserPlus, ChevronLeft, ChevronRight } from "lucide-react";

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

import { useMembersPaginated } from "@/hooks/use-members";
import type { Member } from "@/lib/api-types";
import { useTranslations } from "next-intl";

interface MemberSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (members: Member[]) => void;
}

const PAGE_SIZE = 50;

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export function MemberSearchDialog({ open, onOpenChange, onConfirm }: MemberSearchDialogProps) {
  const t = useTranslations("memberSearch");
  const tc = useTranslations("common.actions");
  const tPager = useTranslations("common.pager");

  const [searchQuery, setSearchQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  // Full Member objects, so a staged member survives paging and searching away.
  const [staged, setStaged] = React.useState<Map<number, Member>>(new Map());

  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 300);

  React.useEffect(() => {
    if (!open) {
      setStaged(new Map());
      setSearchQuery("");
      setPage(1);
    }
  }, [open]);

  // A new search is a new result set - back to page one.
  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  // The database does the searching and paging; the dialog only fetches while open.
  const query = useMembersPaginated(
    { page, pageSize: PAGE_SIZE, search: debouncedSearch || undefined, sortBy: "name", order: "asc" },
    open,
  );

  const items = query.data?.items ?? [];
  const totalPages = query.data?.total_pages ?? 0;

  const displayMembers = items.filter((m) => !staged.has(m.id));
  const stagedMembers = [...staged.values()];

  const handleStage = (member: Member) => {
    setStaged((prev) => new Map(prev).set(member.id, member));
  };

  const handleUnstage = (memberId: number) => {
    setStaged((prev) => {
      const next = new Map(prev);
      next.delete(memberId);
      return next;
    });
  };

  const handleConfirm = () => {
    if (stagedMembers.length === 0) return;
    onConfirm(stagedMembers);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92dvh] flex-col sm:h-auto sm:max-h-[80vh] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain sm:block sm:space-y-4">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              inputMode="search"
              enterKeyHint="search"
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ps-9"
            />
          </div>

          <div className="flex min-h-0 flex-1 flex-col border rounded-lg sm:block">
            <div className="p-3 border-b bg-sunk flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5">
              <h3 className="text-sm font-medium">{t("membersHeading")}</h3>
              <p className="text-xs text-muted-foreground">{t("searchAllHint")}</p>
            </div>
            <div
              className={`min-h-[200px] flex-1 overflow-y-auto overscroll-contain transition-opacity sm:h-[200px] sm:flex-none ${
                query.isPlaceholderData ? "opacity-60" : ""
              }`}
            >
              {query.isPending ? (
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
                  {debouncedSearch ? t("noneFound") : t("allSelected")}
                </div>
              ) : (
                <div className="divide-y">
                  {displayMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 hover:bg-sunk transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p dir="auto" className="text-sm font-medium truncate">{member.name}</p>
                        <p className="text-[13px] text-muted-foreground truncate sm:text-xs">
                          <span className="tabular">{member.uni_id}</span> &bull; {member.email}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStage(member)}
                        className="shrink-0 pointer-coarse:h-10"
                      >
                        <UserPlus className="h-3.5 w-3.5 me-1" />
                        {t("add")}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t px-3 py-2">
                <span className="tabular text-xs text-muted-foreground">
                  {t("pageOf", { page, total: totalPages })}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="pointer-coarse:size-10"
                    aria-label={tPager("previous")}
                    disabled={page <= 1 || query.isFetching}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4 rtl:-scale-x-100" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="pointer-coarse:size-10"
                    aria-label={tPager("next")}
                    disabled={page >= totalPages || query.isFetching}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4 rtl:-scale-x-100" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {stagedMembers.length > 0 && (
            <div className="border rounded-lg">
              <div className="p-3 border-b bg-sunk">
                <h3 className="text-sm font-medium">
                  {t("selectedHeading", { count: stagedMembers.length })}
                </h3>
              </div>
              <div className="max-h-[160px] overflow-y-auto overscroll-contain">
                <div className="divide-y">
                  {stagedMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 p-3 hover:bg-sunk transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p dir="auto" className="text-sm font-medium truncate">{member.name}</p>
                        <p className="tabular text-xs text-muted-foreground">{member.uni_id}</p>
                      </div>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        className="pointer-coarse:size-10"
                        aria-label={tc("remove")}
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
          <Button onClick={handleConfirm} disabled={stagedMembers.length === 0}>
            <UserPlus className="me-2 h-4 w-4" />
            {t("confirm", { count: stagedMembers.length })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
