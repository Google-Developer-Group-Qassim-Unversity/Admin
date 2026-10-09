"use client";

import * as React from "react";
import Link from "next/link";
import { AlertCircle, CalendarDays, CalendarPlus, LayoutGrid, Rows3 } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EventPosterTile, EventRow } from "@/components/event-card";
import { EventsTable } from "@/components/events-table";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { FilterBar } from "@/components/filter-bar";
import { ListPager } from "@/components/list-pager";
import { PageHeader } from "@/components/page-header";
import { useEventsPaginated } from "@/hooks/use-event";
import { useSemesterOptions } from "@/hooks/use-semesters";
import { ApiRequestError } from "@/lib/api/errors";

const STATUSES = ["draft", "open", "active", "closed"] as const;
const PAGE_SIZE_OPTIONS = ["12", "24", "48"] as const;

type View = "table" | "cards";
const VIEW_KEY = "events.view";

/** The desktop layout the admin last picked; phones always get rows. */
function useView(): [View, (v: View) => void] {
  const [view, setView] = React.useState<View>("table");
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_KEY);
      if (saved === "table" || saved === "cards") setView(saved);
    } catch {
      // Storage blocked: stay on the table.
    }
  }, []);
  return [
    view,
    (v) => {
      setView(v);
      try {
        localStorage.setItem(VIEW_KEY, v);
      } catch {
        // Not remembered; still switches.
      }
    },
  ];
}

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
  const [view, setView] = useView();
  // One clock for every "in 3 days" and next step on the page.
  const [now] = React.useState(() => Date.now());

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
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-5 sm:gap-6">
      <PageHeader title={t("title")} description={t("subtitle")} icon={CalendarDays}>
        <Button asChild>
          <Link href="/events/create">
            <CalendarPlus />
            {t("create")}
          </Link>
        </Button>
      </PageHeader>

      <FilterBar
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t("searchName")}
        trailing={
          <>
            <span className="tabular">{t("showingRange", { from, to, count: total })}</span>
            <div role="radiogroup" aria-label={t("view.label")} className="bg-mortar hidden gap-1 rounded-lg p-1 md:flex">
              {(
                [
                  ["table", Rows3],
                  ["cards", LayoutGrid],
                ] as const
              ).map(([value, Icon]) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={view === value}
                  onClick={() => setView(value)}
                  className={`focus-visible:outline-ring flex h-8 items-center gap-1.5 rounded-sm px-2.5 text-[13px] font-bold outline-none focus-visible:outline-2 ${
                    view === value ? "bg-foreground text-background" : "bg-card text-ink-2 hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {t(`view.${value}`)}
                </button>
              ))}
            </div>
          </>
        }
      >
        <Select value={semester} onValueChange={setSemester}>
          <SelectTrigger className="w-full sm:w-[180px]">
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
          <SelectTrigger className="w-full sm:w-[150px]">
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

      {isError ? (
        <Alert variant="destructive" className="max-w-2xl">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t("loadFailed")}</AlertTitle>
          <AlertDescription>
            {error?.message || t("loadFailedDescription")}
            {error instanceof ApiRequestError && error.isServerError && (
              <span className="mt-1 block">{t("serverUnavailable")}</span>
            )}
          </AlertDescription>
        </Alert>
      ) : isPending ? (
        <ul className="flex flex-col" aria-busy="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <li key={i} className="border-rule flex items-start gap-3 border-b px-1 py-3">
              <Skeleton className="h-[52px] w-14 rounded-t-[4px] rounded-b-[2px]" />
              <div className="flex flex-1 flex-col gap-2 pt-1">
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-3 w-2/5" />
                <Skeleton className="h-6 w-32" />
              </div>
            </li>
          ))}
        </ul>
      ) : events.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarDays />
            </EmptyMedia>
            <EmptyTitle>{t("noneFound")}</EmptyTitle>
            <EmptyDescription>{hasFilters ? t("noneMatch") : t("noneMatchSemester")}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link href="/events/create">
                <CalendarPlus />
                {t("createNew")}
              </Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className={`transition-opacity ${isPlaceholderData ? "opacity-60" : ""}`}>
          {/* Phones: rows on the wall. md up: the table, or the posters. */}
          <ul className={`flex flex-col md:hidden`}>
            {events.map((event) => (
              <EventRow key={event.id} event={event} now={now} />
            ))}
          </ul>
          <div className="max-md:hidden">
            {view === "table" ? (
              <EventsTable events={events} now={now} />
            ) : (
              <ul className="grid grid-cols-[repeat(auto-fill,minmax(210px,1fr))] gap-x-5 gap-y-7">
                {events.map((event) => (
                  <EventPosterTile key={event.id} event={event} now={now} />
                ))}
              </ul>
            )}
          </div>
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
