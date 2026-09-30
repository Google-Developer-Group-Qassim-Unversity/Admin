"use client";

import { useTranslations } from "next-intl";
import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/filter-bar";
import { PointsCustomEventCard } from "@/components/points-custom-event-card";
import type { Event } from "@/lib/api-types";
import { useFuzzySearch } from "@/lib/search-utils";

interface CustomEventsListProps {
  events: Event[];
}

export function CustomEventsList({ events }: CustomEventsListProps) {
  const tp = useTranslations("points");
  const [searchQuery, setSearchQuery] = React.useState("");

  const searchResults = useFuzzySearch(events, searchQuery, ["name"]);

  const filteredEvents = React.useMemo(() => {
    const source = searchQuery.trim() ? searchResults : events;
    const sorted = source.sort(
      (a, b) =>
        new Date(b.start_datetime).getTime() -
        new Date(a.start_datetime).getTime()
    );

    return sorted.slice(0, 50);
  }, [searchResults, searchQuery, events]);

  const handleClearFilters = () => {
    setSearchQuery("");
  };

  return (
    <div className="space-y-4">
      <FilterBar
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={tp("searchCustom")}
        trailing={
          searchQuery ? (
            <Button variant="ghost" size="sm" onClick={handleClearFilters} className="shrink-0 pointer-coarse:h-9">
              <X className="h-4 w-4" />
              {tp("clearFilters")}
            </Button>
          ) : null
        }
      />

      {filteredEvents.length > 0 ? (
        <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
          {filteredEvents.map((event) => (
            <PointsCustomEventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <div className="text-muted-foreground py-12 text-center">
          {tp("noMatchCustom")}
        </div>
      )}
    </div>
  );
}
