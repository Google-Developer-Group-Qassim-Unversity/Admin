"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Paging for a server-paginated list. On a phone it is one row - previous,
 * "Page 2 of 5", next - with page-size and the jump-to-ends buttons kept for
 * wider screens, where there is room and a pointer to use them.
 */
export function ListPager({
  page,
  pageCount,
  onPageChange,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
  summary,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  pageSizeOptions?: readonly (number | string)[];
  onPageSizeChange?: (size: number) => void;
  /** e.g. "Showing 1-12 of 40". Shown above the controls on a phone. */
  summary?: React.ReactNode;
}) {
  const t = useTranslations("common.pager");
  const total = Math.max(pageCount, 1);
  const atStart = page <= 1;
  const atEnd = page >= pageCount;

  return (
    <div className="flex flex-col gap-3 py-1 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center justify-between gap-4 sm:justify-start">
        {summary ? (
          <div className="text-muted-foreground tabular text-[13px]">{summary}</div>
        ) : null}
        {pageSize && pageSizeOptions && onPageSizeChange ? (
          <div className="hidden items-center gap-2 sm:flex">
            <span className="text-muted-foreground text-sm">{t("rows")}</span>
            <Select value={String(pageSize)} onValueChange={(v) => onPageSizeChange(Number(v))}>
              <SelectTrigger className="w-[76px]" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                {pageSizeOptions.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
      </div>

      <nav aria-label={t("label")} className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          className="hidden sm:inline-flex"
          onClick={() => onPageChange(1)}
          disabled={atStart}
        >
          <ChevronsLeft className="rtl:-scale-x-100" />
          <span className="sr-only">{t("first")}</span>
        </Button>
        <Button
          variant="outline"
          className="flex-1 sm:size-8 sm:flex-none sm:px-0"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={atStart}
        >
          <ChevronLeft className="rtl:-scale-x-100" />
          <span className="sm:sr-only">{t("previous")}</span>
        </Button>
        <span className="tabular min-w-24 px-2 text-center text-sm font-medium" aria-live="polite">
          {t("page", { current: page, total })}
        </span>
        <Button
          variant="outline"
          className="flex-1 sm:size-8 sm:flex-none sm:px-0"
          onClick={() => onPageChange(Math.min(pageCount, page + 1))}
          disabled={atEnd}
        >
          <span className="sm:sr-only">{t("next")}</span>
          <ChevronRight className="rtl:-scale-x-100" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          className="hidden sm:inline-flex"
          onClick={() => onPageChange(pageCount)}
          disabled={atEnd}
        >
          <ChevronsRight className="rtl:-scale-x-100" />
          <span className="sr-only">{t("last")}</span>
        </Button>
      </nav>
    </div>
  );
}
