"use client";

import { useTranslations } from "next-intl";
import * as React from "react";
import { X } from "lucide-react";

import { FilterBar } from "@/components/filter-bar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FullEventPointsCard } from "@/components/full-event-points-card";
import { POINTS_LIST } from "@/components/points-list-states";
import type { Event } from "@/lib/api-types";
import { useSemesterOptions } from "@/hooks/use-semesters";
import { useFuzzySearch } from "@/lib/search-utils";

const SHOWN = 50;

interface FullEventsPointsListProps {
  events: Event[];
  semester?: string;
  onSemesterChange?: (semester: string) => void;
  /** Shown instead of the results (loading, an error, an empty semester) while
   * the filter bar stays put, so the semester can always be changed back. */
  status?: React.ReactNode;
}

export function FullEventsPointsList({ events, semester, onSemesterChange, status }: FullEventsPointsListProps) {
  const t = useTranslations("events.filters");
  const tp = useTranslations("points");
  const [searchQuery, setSearchQuery] = React.useState("");
  const semesterOptions = useSemesterOptions();

  const searchResults = useFuzzySearch(events, searchQuery, ["name"]);

  const filteredEvents = React.useMemo(() => {
    const source = searchQuery.trim() ? searchResults : events;
    return source
      .filter((event) => event.location_type !== "none" && event.location_type !== "hidden")
      .sort((a, b) => new Date(b.start_datetime).getTime() - new Date(a.start_datetime).getTime())
      .slice(0, SHOWN);
  }, [searchResults, searchQuery, events]);

  const hasActiveFilters = Boolean(searchQuery || (semester && semester !== "all"));

  return (
    <div className="flex flex-col gap-3">
      <FilterBar
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t("search")}
        trailing={
          <>
            {!status ? <span className="tabular">{tp("shownCount", { shown: filteredEvents.length, total: events.length })}</span> : null}
            {hasActiveFilters ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("");
                  onSemesterChange?.("all");
                }}
                className="shrink-0"
              >
                <X />
                {tp("clearFilters")}
              </Button>
            ) : null}
          </>
        }
      >
        {onSemesterChange && (
          <Select value={semester || "all"} onValueChange={onSemesterChange}>
            <SelectTrigger className="w-full sm:w-48" aria-label={t("semester")}>
              <SelectValue placeholder={t("semester")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all")}</SelectItem>
              {semesterOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </FilterBar>

      {status ? (
        status
      ) : filteredEvents.length > 0 ? (
        <ul className={POINTS_LIST}>
          {filteredEvents.map((event) => (
            <FullEventPointsCard key={event.id} event={event} />
          ))}
        </ul>
      ) : (
        <p className="text-ink-2 py-12 text-center text-sm">{tp("noMatchFull")}</p>
      )}
    </div>
  );
}
