"use client";

import { useTranslations } from "next-intl";
import * as React from "react";
import { X } from "lucide-react";
import { FilterBar } from "@/components/filter-bar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FullEventPointsCard } from "@/components/full-event-points-card";
import type { Event } from "@/lib/api-types";
import { useSemesterOptions } from "@/hooks/use-semesters";
import { useFuzzySearch } from "@/lib/search-utils";

interface FullEventsPointsListProps {
  events: Event[];
  semester?: string;
  onSemesterChange?: (semester: string) => void;
  /** Shown instead of the results (loading, an error, an empty semester) while
   * the filter bar stays put, so the semester can always be changed back. */
  status?: React.ReactNode;
}

export function FullEventsPointsList({ 
  events, 
  semester, 
  onSemesterChange, 
  status,
}: FullEventsPointsListProps) {
  const t = useTranslations("events.filters");
  const tp = useTranslations("points");
  const [searchQuery, setSearchQuery] = React.useState("");
  const semesterOptions = useSemesterOptions();

  const searchResults = useFuzzySearch(events, searchQuery, ["name"]);

  const filteredEvents = React.useMemo(() => {
    const source = searchQuery.trim() ? searchResults : events;
    const filtered = source.filter((event) => {
      if (event.location_type === "none" || event.location_type === "hidden") {
        return false;
      }
      return true;
    });

    const sorted = filtered.sort(
      (a, b) =>
        new Date(b.start_datetime).getTime() -
        new Date(a.start_datetime).getTime()
    );

    return sorted.slice(0, 50);
  }, [searchResults, searchQuery, events]);

  const handleClearFilters = () => {
    setSearchQuery("");
    onSemesterChange?.("all");
  };

  const hasActiveFilters = searchQuery || (semester && semester !== "all");

  return (
    <div className="space-y-4">
      <FilterBar
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={t("search")}
        trailing={
          hasActiveFilters ? (
            <Button variant="ghost" size="sm" onClick={handleClearFilters} className="shrink-0 pointer-coarse:h-9">
              <X className="h-4 w-4" />
              {tp("clearFilters")}
            </Button>
          ) : null
        }
      >
        {onSemesterChange && (
          <Select value={semester || "all"} onValueChange={onSemesterChange}>
            <SelectTrigger className="bg-card w-full sm:w-40" aria-label={t("semester")}>
              <SelectValue placeholder={t("semester")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("all")}</SelectItem>
              {semesterOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </FilterBar>

      {status ? (
        status
      ) : filteredEvents.length > 0 ? (
        <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {filteredEvents.map((event) => (
            <FullEventPointsCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <div className="text-muted-foreground py-12 text-center">
          {tp("noMatchFull")}
        </div>
      )}
    </div>
  );
}
