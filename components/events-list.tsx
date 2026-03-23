"use client";

import * as React from "react";
import { EventCard } from "@/components/event-card";
import { EventFilters } from "@/components/event-filters";
import type { Event, LocationType } from "@/lib/api-types";

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

  const filteredEvents = React.useMemo(() => {
    const filtered = events.filter((event) => {
      if (event.location_type === "none" || event.location_type === "hidden") {
        return false;
      }

      if (
        searchQuery &&
        !event.name.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
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
  }, [events, searchQuery, locationTypes, selectedLocations]);

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

      {filteredEvents.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredEvents.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          No events match your filters. Try adjusting your search criteria.
        </div>
      )}
    </div>
  );
}