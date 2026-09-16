"use client";

import * as React from "react";
import Link from "next/link";
import {
  CalendarPlus,
  AlertCircle,
  Calendar,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EventCard } from "@/components/event-card";
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

export default function ManageEventsPage() {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
        <Button asChild>
          <Link href="/events/create" className="flex items-center gap-2">
            <CalendarPlus className="h-4 w-4" />
            {t("create")}
          </Link>
        </Button>
      </div>

      {/* Filter bar: search + semester + status */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-64">
          <Search className="absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("searchName")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-8"
          />
        </div>

        <Select value={semester} onValueChange={setSemester}>
          <SelectTrigger className="w-[180px]" size="sm">
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
          <SelectTrigger className="w-[150px]" size="sm">
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

        <div className="flex-1" />

        <div className="text-sm text-muted-foreground">{t("showingRange", { from, to, count: total })}</div>
      </div>

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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
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
          className={`grid gap-4 transition-opacity sm:grid-cols-2 xl:grid-cols-3 ${
            isPlaceholderData ? "opacity-60" : ""
          }`}
        >
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}

      {/* Pagination controls */}
      {!isError && total > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t("rows")}</span>
            <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
              <SelectTrigger className="w-[80px]" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon-sm" onClick={() => setPage(1)} disabled={page <= 1}>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon-sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
              <ChevronLeft className="h-4 w-4 rtl:-scale-x-100" />
            </Button>
            <span className="px-3 text-sm">
              {t("page", { current: page, total: Math.max(pageCount, 1) })}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={page >= pageCount}
            >
              <ChevronRight className="h-4 w-4 rtl:-scale-x-100" />
            </Button>
            <Button variant="outline" size="icon-sm" onClick={() => setPage(pageCount)} disabled={page >= pageCount}>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
