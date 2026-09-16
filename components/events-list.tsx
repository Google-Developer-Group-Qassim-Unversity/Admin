"use client";

import * as React from "react";
import { useTranslations } from "next-intl";

import { LayoutGrid, Rows3 } from "lucide-react";

import { EventCard } from "@/components/event-card";
import { EventsTable } from "@/components/events-table";
import { EventFilters } from "@/components/event-filters";
import type { Event, LocationType } from "@/lib/api-types";
import { useFuzzySearch } from "@/lib/search-utils";

interface EventsListProps {
  events: Event[];
  semester?: string;
  onSemesterChange?: (semester: string) => void;
}

export function EventsList({ 
  events, 
  semester, 
  onSemesterChange, 
}: EventsListProps) {
  const t = useTranslations("events");
  // The table is the default: it is the view that shows what each event is
  // waiting for. Cards stay for browsing by poster.
  const [view, setView] = React.useState<"table" | "cards">("table");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [locationTypes, setLocationTypes] = React.useState<LocationType[]>([]);
  const [selectedLocations, setSelectedLocations] = React.useState<string[]>([]);

  const uniqueLocations = React.useMemo(() => {
    const locations = new Set<string>();
    events.forEach((event) => {
      if (event.location && event.location.trim()) {
        locations.add(event.location);
      }
    });
    return Array.from(locations).sort();
  }, [events]);

  const searchResults = useFuzzySearch(events, searchQuery, ["name"]);

  const filteredEvents = React.useMemo(() => {
    const source = searchQuery.trim() ? searchResults : events;
    const filtered = source.filter((event) => {
      if (event.location_type === "none" || event.location_type === "hidden") {
        return false;
      }

      if (locationTypes.length > 0 && !locationTypes.includes(event.location_type)) {
        return false;
      }

      if (selectedLocations.length > 0 && !selectedLocations.includes(event.location)) {
        return false;
      }

      return true;
    });

    const sorted = filtered.sort((a, b) =>
      new Date(b.start_datetime).getTime() - new Date(a.start_datetime).getTime()
    );

    return sorted.slice(0, 50);
  }, [searchResults, searchQuery, events, locationTypes, selectedLocations]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setLocationTypes([]);
    setSelectedLocations([]);
    onSemesterChange?.("all");
  };

  return (
    <div className="space-y-4">
      <EventFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        locationTypes={locationTypes}
        onLocationTypesChange={setLocationTypes}
        locations={uniqueLocations}
        selectedLocations={selectedLocations}
        onSelectedLocationsChange={setSelectedLocations}
        onClearFilters={handleClearFilters}
        semester={semester}
        onSemesterChange={onSemesterChange}
      />

      <div className="flex items-center gap-2">
        <span className="text-muted-foreground text-xs">
          {t("showing", { count: filteredEvents.length })}
        </span>
        <div className="border-border ms-auto flex items-center gap-0.5 rounded-lg border p-0.5">
          <button
            type="button"
            onClick={() => setView("table")}
            aria-pressed={view === "table"}
            title={t("view.table")}
            className={`flex h-7 w-8 items-center justify-center rounded-md transition-colors ${
              view === "table" ? "bg-muted text-foreground" : "text-muted-foreground"
            }`}
          >
            <Rows3 className="h-4 w-4" />
            <span className="sr-only">{t("view.table")}</span>
          </button>
          <button
            type="button"
            onClick={() => setView("cards")}
            aria-pressed={view === "cards"}
            title={t("view.cards")}
            className={`flex h-7 w-8 items-center justify-center rounded-md transition-colors ${
              view === "cards" ? "bg-muted text-foreground" : "text-muted-foreground"
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="sr-only">{t("view.cards")}</span>
          </button>
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <div className="text-muted-foreground py-12 text-center">
          {t("noneMatchFilters")}
        </div>
      ) : view === "table" ? (
        <EventsTable events={filteredEvents} />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}