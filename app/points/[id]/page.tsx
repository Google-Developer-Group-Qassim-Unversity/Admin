"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trophy } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CustomEventForm,
  type CustomEventFormData,
} from "@/components/custom-event-form";
import type { ComboboxOption } from "@/components/ui/department-combobox";
import type { CustomEventDepartment, Action, EventDetails } from "@/lib/api-types";
import {
  getCustomEvents,
  getCustomEventDepartment,
  getEventDetails,
  getDepartments,
  getActions,
  updateCustomPointDetail,
  createCustomDepartmentPoints,
  updateEvent,
  shouldContactSupport,
} from "@/lib/api";
import { formatLocalDateTime, parseLocalDateTime } from "@/lib/utils";

export default function EditCustomEventPage() {
  const params = useParams();
  const router = useRouter();
  const { getToken } = useAuth();
  const eventId = params.id as string;

  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Loaded data
  const [initialData, setInitialData] =
    React.useState<CustomEventDepartment | null>(null);
  const [eventDetails, setEventDetails] = 
    React.useState<EventDetails | null>(null);
  const [eventNameOptions, setEventNameOptions] = React.useState<string[]>([]);
  const [allEvents, setAllEvents] = React.useState<
    Array<{ name: string; start_datetime: string; location_type: import("@/lib/api-types").LocationType }>
  >([]);
  const [departmentOptions, setDepartmentOptions] = React.useState<
    ComboboxOption[]
  >([]);
  const [actionOptions, setActionOptions] = React.useState<Action[]>([]);

  // Fetch all data
  React.useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);

      const [eventRes, eventDetailsRes, eventsRes, deptsRes, actionsRes] = await Promise.all([
        getCustomEventDepartment(eventId, getToken),
        getEventDetails(eventId, getToken),
        getCustomEvents(),
        getDepartments(),
        getActions(),
      ]);

      if (!eventRes.success) {
        setError(eventRes.error.message || "Failed to load custom event.");
        setIsLoading(false);
        return;
      }

      if (!eventDetailsRes.success) {
        setError(eventDetailsRes.error.message || "Failed to load event details.");
        setIsLoading(false);
        return;
      }

      setInitialData(eventRes.data);
      setEventDetails(eventDetailsRes.data);

      if (eventsRes.success) {
        const names = [...new Set(eventsRes.data.map((e) => e.name))];
        setEventNameOptions(names);
        // Store all events for date and visibility synchronization
        setAllEvents(eventsRes.data.map((e) => ({
          name: e.name,
          start_datetime: e.start_datetime,
          location_type: e.location_type,
        })));
      }

      if (deptsRes.success) {
        setDepartmentOptions(
          deptsRes.data.map((d) => ({
            id: d.id,
            label: d.ar_name || d.name,
          }))
        );
      }

      if (actionsRes.success) {
        // Combine department_actions, member_actions, and custom_actions
        // Filter out composite actions (they're for events, not manual point entries)
        const allActions = [
          ...actionsRes.data.department_actions,
          ...actionsRes.data.member_actions,
          ...actionsRes.data.custom_actions,
        ];
        setActionOptions(allActions);
      }

      setIsLoading(false);
    }
    fetchData();
  }, [eventId, getToken]);

  const handleSubmit = async (data: CustomEventFormData) => {
    if (!initialData || !eventDetails) return;

    setIsSubmitting(true);

    try {
      // Parse the original start_datetime to get original date (ignoring time)
      const originalDate = parseLocalDateTime(initialData.start_datetime);
      const originalDateOnly = new Date(originalDate.getFullYear(), originalDate.getMonth(), originalDate.getDate());
      const newDateOnly = new Date(data.date.getFullYear(), data.date.getMonth(), data.date.getDate());
      
      // Only compare date part, preserve original time from initialData
      const dateChanged = originalDateOnly.getTime() !== newDateOnly.getTime();
      const nameChanged = data.event_name !== initialData.event_name;
      
      // Check if visibility changed by comparing with event's location_type from allEvents
      const currentEvent = allEvents.find((e) => e.name === initialData.event_name);
      const currentVisibility = currentEvent ? currentEvent.location_type !== "hidden" : true;
      const visibilityChanged = data.is_visible !== currentVisibility;

      // 1. Update event info if name, date, or visibility changed
      if (nameChanged || dateChanged || visibilityChanged) {
        // If date changed, use new date with default times (10:00-12:00)
        // If date unchanged, preserve original times
        let startDate, endDate;
        if (dateChanged) {
          startDate = new Date(data.date);
          startDate.setHours(10, 0, 0, 0);
          endDate = new Date(data.date);
          endDate.setHours(12, 0, 0, 0);
        } else {
          // Keep original times
          startDate = parseLocalDateTime(initialData.start_datetime);
          endDate = parseLocalDateTime(initialData.end_datetime);
        }

        // Build the full update payload with event object and actions
        const updatePayload = {
          event: {
            id: eventDetails.event.id,
            name: data.event_name,
            description: eventDetails.event.description,
            location_type: (data.is_visible ? "none" : "hidden") as import("@/lib/api-types").LocationType,
            location: eventDetails.event.location,
            start_datetime: formatLocalDateTime(startDate),
            end_datetime: formatLocalDateTime(endDate),
            status: eventDetails.event.status,
            image_url: eventDetails.event.image_url,
            is_official: eventDetails.event.is_official,
          },
          actions: eventDetails.actions,
        };

        const eventUpdateRes = await updateEvent(
          initialData.event_id,
          updatePayload,
          getToken
        );

        if (!eventUpdateRes.success) {
          if (shouldContactSupport(eventUpdateRes.error)) {
            toast.error(
              "Failed to update event info. Please contact support.",
              {
                description: `Error: ${eventUpdateRes.error.message}`,
                duration: 10000,
              }
            );
          } else {
            toast.error(eventUpdateRes.error.message);
          }
          setIsSubmitting(false);
          return;
        }
      }

      // 2. Separate existing rows (have log_id) from new rows
      const existingRows = data.point_details.filter((pd) => pd.log_id);
      const newRows = data.point_details.filter((pd) => !pd.log_id);

      // 3. Update existing point details (only those that changed)
      const updatePromises = existingRows
        .filter((pd) => {
          // Find original point detail
          const original = initialData.point_details.find((orig) => orig.log_id === pd.log_id);
          if (!original) return true; // If not found, update it

          // Check if anything changed
          const pointsChanged = pd.points !== original.points;
          const actionChanged = pd.action_name !== (original.action_name ?? null);
          const depsChanged = 
            pd.departments_id.length !== original.departments_id.length ||
            !pd.departments_id.every((id, idx) => original.departments_id.includes(id));

          return pointsChanged || actionChanged || depsChanged;
        })
        .map((pd) =>
          updateCustomPointDetail(
            pd.log_id!,
            {
              log_id: pd.log_id!,
              departments_id: pd.departments_id,
              points: pd.points,
              // PATCH: Always send null for action fields (Reason feature temporarily disabled)
              action_id: null,
              action_name: null,
            },
            getToken
          )
        );

      const updateResults = await Promise.all(updatePromises);

      // Check for update failures
      const failedUpdates = updateResults.filter((r) => !r.success);
      if (failedUpdates.length > 0) {
        const firstError = failedUpdates[0];
        if (!firstError.success) {
          toast.error(
            `Failed to update ${failedUpdates.length} point detail(s).`,
            {
              description: firstError.error.message,
            }
          );
        }
      }

      // 4. Create new rows if any
      if (newRows.length > 0) {
        // Use current event date with default times for new rows
        const newStartDate = new Date(data.date);
        newStartDate.setHours(10, 0, 0, 0);
        const newEndDate = new Date(data.date);
        newEndDate.setHours(12, 0, 0, 0);

        const createPayload = {
          start_datetime: formatLocalDateTime(newStartDate),
          end_datetime: formatLocalDateTime(newEndDate),
          event_name: data.event_name,
          location_type: (data.is_visible ? "none" : "hidden") as import("@/lib/api-types").LocationType,
          point_deatils: newRows.map((pd) => ({
            departments_id: pd.departments_id,
            points: pd.points,
            // PATCH: Always send null for action fields (Reason feature temporarily disabled)
            action_id: null,
            action_name: null,
          })),
        };

        const createRes = await createCustomDepartmentPoints(
          createPayload,
          getToken
        );

        if (!createRes.success) {
          if (shouldContactSupport(createRes.error)) {
            toast.error(
              "Failed to create new point details. Please contact support.",
              {
                description: `Error: ${createRes.error.message}`,
                duration: 10000,
              }
            );
          } else {
            toast.error(createRes.error.message);
          }
          setIsSubmitting(false);
          return;
        }
      }

      // Success
      if (failedUpdates.length === 0) {
        toast.success("Custom event updated successfully!");
      }
      router.push("/points");
    } catch {
      toast.error("An unexpected error occurred. Please contact support.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center">
        <Card className="w-full max-w-4xl">
          <CardHeader>
            <div className="mb-4">
              <Skeleton className="h-9 w-40" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <Skeleton className="h-7 w-48" />
            </div>
            <Skeleton className="h-5 w-72" />
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="space-y-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-10 w-full" />
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
              <Skeleton className="h-px w-full" />
              <div className="space-y-4">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/points" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Custom Points
          </Link>
        </Button>
        <div className="text-center py-12 text-destructive">
          Error: {error}
        </div>
      </div>
    );
  }

  if (!initialData) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/points" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Custom Points
          </Link>
        </Button>
        <div className="text-center py-12 text-muted-foreground">
          Custom event not found
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <div className="mb-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/points" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Custom Points
              </Link>
            </Button>
          </div>
          <CardTitle className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            Edit Custom Event
          </CardTitle>
          <CardDescription>
            Edit event details and department point assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CustomEventForm
            mode="edit"
            initialData={initialData}
            eventNameOptions={eventNameOptions}
            allEvents={allEvents}
            departmentOptions={departmentOptions}
            actionOptions={actionOptions}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        </CardContent>
      </Card>
    </div>
  );
}
