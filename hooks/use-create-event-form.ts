import * as React from "react";
import type { FieldValues, Path, UseFormSetValue, UseFormSetError, UseFormClearErrors, FieldErrors } from "react-hook-form";
import { getEvents } from "@/lib/api";
import type { Event, LocationType } from "@/lib/api-types";

interface UseEventFormOptions<T extends FieldValues> {
  watchName: string;
  watchLocationType: LocationType;
  setValue: UseFormSetValue<T>;
  setError: UseFormSetError<T>;
  clearErrors: UseFormClearErrors<T>;
  errors: FieldErrors<T>;
  /** Event ID to exclude from name uniqueness check (for edit mode) */
  excludeEventId?: number;
  /** Skip clearing location when location type changes (for edit mode initial load) */
  skipLocationClear?: boolean;
}

export function useEventForm<T extends FieldValues>({
  watchName,
  watchLocationType,
  setValue,
  setError,
  clearErrors,
  errors,
  excludeEventId,
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

  // Validate event name uniqueness and set event_id if selecting existing event
  React.useEffect(() => {
    const normalizedName = watchName.trim().toLowerCase();
    const existingEvent = existingEvents.find(
      (event) => 
        event.name.trim().toLowerCase() === normalizedName &&
        event.id !== excludeEventId
    );

    if (existingEvent) {
      // Found existing event with this name - store its ID to reuse it
      setValue("event_id" as Path<T>, existingEvent.id as T[Path<T>]);
      // Clear any name errors since we're reusing an existing event
      if (errors.name?.type === "manual") {
        clearErrors("name" as Path<T>);
      }
    } else {
      // New event name - clear event_id
      setValue("event_id" as Path<T>, null as T[Path<T>]);
      // No need to show error anymore since reusing is allowed
    }
  }, [watchName, existingEvents, setValue, clearErrors, errors.name?.type, excludeEventId]);

  return {
    isLoadingData,
    locationOptions,
  };
}

/** @deprecated Use useEventForm instead */
export function useCreateEventForm<T extends FieldValues>(options: Omit<UseEventFormOptions<T>, 'excludeEventId' | 'skipLocationClear'>) {
  return useEventForm(options);
}
