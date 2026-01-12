"use client";

import * as React from "react";
import { Search, Globe, Building2, X, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  MultiSelect,
  MultiSelectTrigger,
  MultiSelectValue,
  MultiSelectContent,
  MultiSelectGroup,
  MultiSelectItem,
} from "@/components/ui/multi-select";
import type { LocationType } from "@/lib/api-types";

interface EventFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  locationTypes: LocationType[];
  onLocationTypesChange: (types: LocationType[]) => void;
  locations: string[];
  selectedLocations: string[];
  onSelectedLocationsChange: (locations: string[]) => void;
  onClearFilters: () => void;
}

export function EventFilters({
  searchQuery,
  onSearchChange,
  locationTypes,
  onLocationTypesChange,
  locations,
  selectedLocations,
  onSelectedLocationsChange,
  onClearFilters,
}: EventFiltersProps) {
  const hasActiveFilters =
    searchQuery ||
    locationTypes.length > 0 ||
    selectedLocations.length > 0;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Search Input */}
      <div className="relative w-64">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search events..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-8 h-9 text-sm"
        />
      </div>

      {/* Event Type Filter */}
      <ToggleGroup
        type="multiple"
        value={locationTypes}
        onValueChange={(value) => onLocationTypesChange(value as LocationType[])}
        variant="outline"
        size="sm"
        spacing={0}
        className="shrink-0 [&_[data-state=on]]:bg-primary [&_[data-state=on]]:text-primary-foreground"
      >
        <ToggleGroupItem value="online" aria-label="Online events">
          <Globe className="h-4 w-4" /> online
        </ToggleGroupItem>
        <ToggleGroupItem value="on-site" aria-label="On-site events">
          <Building2 className="h-4 w-4" /> on-site
        </ToggleGroupItem>
      </ToggleGroup>

      {/* Location Multi-Select */}
      <MultiSelect
        values={selectedLocations}
        onValuesChange={onSelectedLocationsChange}
      >
        <MultiSelectTrigger className="h-9 w-75 max-w-75">
          <MapPin className="h-4 w-4 mr-2" />
          <MultiSelectValue placeholder="Select locations" overflowBehavior="cutoff" />
        </MultiSelectTrigger>
        <MultiSelectContent search={{ placeholder: "Search locations...", emptyMessage: "No locations found." }}>
          <MultiSelectGroup>
            {locations.map((location) => (
              <MultiSelectItem key={location} value={location}>
                {location}
              </MultiSelectItem>
            ))}
          </MultiSelectGroup>
        </MultiSelectContent>
      </MultiSelect>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <Button
          variant="destructive"
          size="sm"
          onClick={onClearFilters}
          className="h-9 shrink-0"
        >
          <X className="h-4 w-4" />
          remove filters
        </Button>
      )}
    </div>
  );
}
