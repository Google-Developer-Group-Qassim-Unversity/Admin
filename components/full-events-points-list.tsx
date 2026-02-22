"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { FullEventPointsCard } from "@/components/full-event-points-card";
import type { Event } from "@/lib/api-types";

interface FullEventsPointsListProps {
  events: Event[];
}

export function FullEventsPointsList({ events }: FullEventsPointsListProps) {
  const [searchQuery, setSearchQuery] = React.useState("");

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

      return true;
    });

    const sorted = filtered.sort(
      (a, b) =>
        new Date(b.start_datetime).getTime() -
        new Date(a.start_datetime).getTime()
    );

    return sorted.slice(0, 50);
  }, [events, searchQuery]);

  const handleClearFilters = () => {
    setSearchQuery("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>

        {searchQuery && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleClearFilters}
            className="h-9 shrink-0"
          >
            <X className="h-4 w-4" />
            remove filters
          </Button>
        )}
      </div>

      {filteredEvents.length > 0 ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredEvents.map((event) => (
            <FullEventPointsCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          No full events match your search. Try adjusting your search criteria.
        </div>
      )}
    </div>
  );
}
