import * as React from "react";
import type { FieldValues, Path, UseFormSetValue, UseFormSetError, UseFormClearErrors, FieldErrors } from "react-hook-form";
import { getEvents } from "@/lib/api";
import type { Event, LocationType } from "@/lib/api-types";

interface UseCreateEventFormOptions<T extends FieldValues> {
  watchName: string;
  watchLocationType: LocationType;
  setValue: UseFormSetValue<T>;
  setError: UseFormSetError<T>;
  clearErrors: UseFormClearErrors<T>;
  errors: FieldErrors<T>;
}

export function useCreateEventForm<T extends FieldValues>({
  watchName,
  watchLocationType,
  setValue,
  setError,
  clearErrors,
  errors,
}: UseCreateEventFormOptions<T>) {
  const [existingEvents, setExistingEvents] = React.useState<Event[]>([]);
  const [isLoadingData, setIsLoadingData] = React.useState(true);
  const previousLocationType = React.useRef<LocationType>(watchLocationType);

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

  // Clear location when location type changes
  React.useEffect(() => {
    if (previousLocationType.current !== watchLocationType) {
      setValue("location" as Path<T>, "" as T[Path<T>]);
      previousLocationType.current = watchLocationType;
    }
  }, [watchLocationType, setValue]);

  // Validate event name uniqueness
  React.useEffect(() => {
    const normalizedName = watchName.trim().toLowerCase();
    const isDuplicate = existingEvents.some(
      (event) => event.name.trim().toLowerCase() === normalizedName
    );

    if (isDuplicate && normalizedName.length > 0) {
      setError("name" as Path<T>, {
        type: "manual",
        message: "An event with this name already exists",
      });
    } else if (errors.name?.type === "manual") {
      clearErrors("name" as Path<T>);
    }
  }, [watchName, existingEvents, setError, clearErrors, errors.name?.type]);

  return {
    isLoadingData,
    locationOptions,
  };
}
