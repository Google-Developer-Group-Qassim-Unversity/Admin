import * as React from "react";
import type { FieldValues, Path, UseFormSetValue } from "react-hook-form";
import { getEvents } from "@/lib/api";
import type { Event, LocationType } from "@/lib/api-types";

interface UseEventFormOptions<T extends FieldValues> {
  watchName: string;
  watchLocationType: LocationType;
  setValue: UseFormSetValue<T>;
  /** Skip clearing location when location type changes (for edit mode initial load) */
  skipLocationClear?: boolean;
}

export function useEventForm<T extends FieldValues>({
  watchName,
  watchLocationType,
  setValue,
  skipLocationClear = false,
}: UseEventFormOptions<T>) {
  const [existingEvents, setExistingEvents] = React.useState<Event[]>([]);
  const [isLoadingData, setIsLoadingData] = React.useState(true);
  const previousLocationType = React.useRef<LocationType>(watchLocationType);
  const isInitialMount = React.useRef(true);

  // Fetch existing events on mount
  React.useEffect(() => {
    async function fetchData() {
      setIsLoadingData(true);
      try {
        const eventsResult = await getEvents();
        if (eventsResult.success) {
          setExistingEvents(eventsResult.data);
        }
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
      } finally {
        setIsLoadingData(false);
      }
    }

    fetchData();
  }, []);

  // Get unique locations from existing events, filtered by location type
  const locationOptions = React.useMemo(() => {
    const uniqueLocations = new Set<string>();

    existingEvents.forEach((event) => {
      if (event.location && event.location_type === watchLocationType) {
        uniqueLocations.add(event.location);
      }
    });

    return Array.from(uniqueLocations).sort((a, b) => a.localeCompare(b));
  }, [existingEvents, watchLocationType]);

  // Clear location when location type changes (skip on initial mount for edit mode)
  React.useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      previousLocationType.current = watchLocationType;
      return;
    }

    if (previousLocationType.current !== watchLocationType && !skipLocationClear) {
      setValue("location" as Path<T>, "" as T[Path<T>]);
      previousLocationType.current = watchLocationType;
    }
  }, [watchLocationType, setValue, skipLocationClear]);

  return {
    isLoadingData,
    locationOptions,
  };
}

/** @deprecated Use useEventForm instead */
export function useCreateEventForm<T extends FieldValues>(options: Omit<UseEventFormOptions<T>, 'skipLocationClear'>) {
  return useEventForm(options);
}
