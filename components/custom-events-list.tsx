"use client";

import { useTranslations } from "next-intl";
import * as React from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FilterBar } from "@/components/filter-bar";
import { PointsCustomEventCard } from "@/components/points-custom-event-card";
import { POINTS_LIST } from "@/components/points-list-states";
import type { Event } from "@/lib/api-types";
import { useFuzzySearch } from "@/lib/search-utils";

const SHOWN = 50;

export function CustomEventsList({ events }: { events: Event[] }) {
  const tp = useTranslations("points");
  const [searchQuery, setSearchQuery] = React.useState("");

  const searchResults = useFuzzySearch(events, searchQuery, ["name"]);

  const filteredEvents = React.useMemo(() => {
    const source = searchQuery.trim() ? searchResults : events;
    // Copy before sorting: the props array belongs to the caller.
    return [...source]
      .sort((a, b) => new Date(b.start_datetime).getTime() - new Date(a.start_datetime).getTime())
      .slice(0, SHOWN);
  }, [searchResults, searchQuery, events]);

  return (
    <div className="flex flex-col gap-3">
      <FilterBar
        search={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder={tp("searchCustom")}
        trailing={
          <>
            <span className="tabular">{tp("shownCount", { shown: filteredEvents.length, total: events.length })}</span>
            {searchQuery ? (
              <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")} className="shrink-0">
                <X />
                {tp("clearFilters")}
              </Button>
            ) : null}
          </>
        }
      />

      {filteredEvents.length > 0 ? (
        <ul className={POINTS_LIST}>
          {filteredEvents.map((event) => (
            <PointsCustomEventCard key={event.id} event={event} />
          ))}
        </ul>
      ) : (
        <p className="text-ink-2 py-12 text-center text-sm">{tp("noMatchCustom")}</p>
      )}
    </div>
  );
}
