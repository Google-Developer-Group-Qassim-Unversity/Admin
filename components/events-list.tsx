"use client";

import * as React from "react";
import { EventCard } from "@/components/event-card";
import { EventFilters } from "@/components/event-filters";
import type { Event, LocationType } from "@/lib/api-types";

interface EventsListProps {
  events: Event[];
}

export function EventsList({ events }: EventsListProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [locationTypes, setLocationTypes] = React.useState<LocationType[]>([]);
  const [selectedLocations, setSelectedLocations] = React.useState<string[]>([]);

  // Extract unique locations from events
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
      // Always hide events with location_type=none
      if (event.location_type === "none") {
        return false;
      }

      // Search filter
      if (
        searchQuery &&
        !event.name.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }

      // Location type filter (event type)
      if (locationTypes.length > 0 && !locationTypes.includes(event.location_type)) {
        return false;
      }

      // Location filter
      if (selectedLocations.length > 0 && !selectedLocations.includes(event.location)) {
        return false;
      }

      return true;
    });

    // Always sort by start_datetime DESC
    const sorted = filtered.sort((a, b) => 
      new Date(b.start_datetime).getTime() - new Date(a.start_datetime).getTime()
    );

    // Limit to 50 events to encourage using search/filters
    return sorted.slice(0, 50);
  }, [events, searchQuery, locationTypes, selectedLocations]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setLocationTypes([]);
    setSelectedLocations([]);
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
      />

      {/* Filtered Events Grid */}
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
