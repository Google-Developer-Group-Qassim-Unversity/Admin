"use client";

import * as React from "react";
import Link from "next/link";
import {
  CalendarPlus,
  AlertCircle,
  Calendar,
  CalendarDays,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EventCard } from "@/components/event-card";
import { FilterBar } from "@/components/filter-bar";
import { ListPager } from "@/components/list-pager";
import { PageHeader } from "@/components/page-header";
import { useEventsPaginated } from "@/hooks/use-event";
import { useSemesterOptions } from "@/hooks/use-semesters";
import { ApiRequestError } from "@/lib/api/errors";

const STATUSES = ["draft", "open", "active", "closed"] as const;
const PAGE_SIZE_OPTIONS = ["12", "24", "48"] as const;

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

export function EventsContent() {
  const t = useTranslations("events");
  const ts = useTranslations("events.status");
  const semesterOptions = useSemesterOptions();

  const [semester, setSemester] = React.useState("all");
  const [status, setStatus] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(12);

  const debouncedSearch = useDebouncedValue(searchQuery.trim(), 300);

  // Any filter change means a different result set - go back to page one so a
  // narrower filter can't leave you on a page that no longer exists.
  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, semester, status, pageSize]);

  const { data, isPending, isError, error, isPlaceholderData } = useEventsPaginated({
    page,
    pageSize,
    semester: semester === "all" ? undefined : semester,
    status: status === "all" ? undefined : (status as (typeof STATUSES)[number]),
    search: debouncedSearch || undefined,
    excludeCustom: true,
  });

  const events = data?.items ?? [];
  const total = data?.total ?? 0;
  const pageCount = data?.total_pages ?? 0;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const hasFilters = debouncedSearch.length > 0 || semester !== "all" || status !== "all";

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader title={t("title")} description={t("subtitle")} icon={CalendarDays}>
        <Button asChild>
          <Link href="/events/create" className="flex items-center gap-2">
            <CalendarPlus className="h-4 w-4" />
            {t("create")}
          </Link>
        </Button>
      </PageHeader>

      <FilterBar
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t("searchName")}
        trailing={<span className="tabular">{t("showingRange", { from, to, count: total })}</span>}
      >
        <Select value={semester} onValueChange={setSemester}>
          <SelectTrigger className="bg-card sm:w-[180px]">
            <SelectValue placeholder={t("filters.semester")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("filters.all")}</SelectItem>
            {semesterOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="bg-card sm:w-[150px]">
            <SelectValue placeholder={t("statusFilter")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allStatuses")}</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {ts(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FilterBar>

      {/* Body */}
      {isError ? (
        <div className="flex justify-center">
          <Alert variant="destructive" className="max-w-2xl">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{t("loadFailed")}</AlertTitle>
            <AlertDescription>
              {error?.message || t("loadFailedDescription")}
              {error instanceof ApiRequestError && error.isServerError && (
                <span className="block mt-1">{t("serverUnavailable")}</span>
              )}
            </AlertDescription>
          </Alert>
        </div>
      ) : isPending ? (
        <div className="grid grid-cols-1 gap-2.5 sm:gap-3 sm:grid-cols-[repeat(auto-fill,minmax(min(360px,100%),1fr))]">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-[112px] w-full rounded-2xl sm:h-40 sm:rounded-lg" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="flex justify-center">
          <Alert className="max-w-2xl">
            <Calendar className="h-4 w-4" />
            <AlertTitle>{t("noneFound")}</AlertTitle>
            <AlertDescription>
              {hasFilters ? t("noneMatch") : t("noneMatchSemester")}
              <div className="mt-4">
                <Button asChild size="sm">
                  <Link href="/events/create" className="flex items-center gap-2">
                    <CalendarPlus className="h-4 w-4" />
                    {t("createNew")}
                  </Link>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      ) : (
        <div
          className={`grid grid-cols-1 gap-2.5 sm:gap-3 sm:grid-cols-[repeat(auto-fill,minmax(min(360px,100%),1fr))] transition-opacity ${
            isPlaceholderData ? "opacity-60" : ""
          }`}
        >
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}

      {!isError && total > 0 && (
        <ListPager
          page={page}
          pageCount={pageCount}
          onPageChange={setPage}
          pageSize={pageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageSizeChange={setPageSize}
        />
      )}
    </div>
  );
}
