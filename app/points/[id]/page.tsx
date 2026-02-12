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
import type { CustomEventDepartment } from "@/lib/api-types";
import {
  getCustomEvents,
  getCustomEventDepartment,
  getDepartments,
  getCustomActions,
  updateCustomPointDetail,
  createCustomDepartmentPoints,
  updateEventPartial,
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
  const [eventNameOptions, setEventNameOptions] = React.useState<string[]>([]);
  const [allEvents, setAllEvents] = React.useState<Array<{ name: string; start_datetime: string }>>([]);
  const [departmentOptions, setDepartmentOptions] = React.useState<
    ComboboxOption[]
  >([]);
  const [actionOptions, setActionOptions] = React.useState<string[]>([]);

  // Fetch all data
  React.useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);

      const [eventRes, eventsRes, deptsRes, actionsRes] = await Promise.all([
        getCustomEventDepartment(eventId, getToken),
        getCustomEvents(),
        getDepartments(),
        getCustomActions(),
      ]);

      if (!eventRes.success) {
        setError(eventRes.error.message || "Failed to load custom event.");
        setIsLoading(false);
        return;
      }

      setInitialData(eventRes.data);

      if (eventsRes.success) {
        const names = [...new Set(eventsRes.data.map((e) => e.name))];
        setEventNameOptions(names);
        // Store all events for date synchronization
        setAllEvents(eventsRes.data.map((e) => ({
          name: e.name,
          start_datetime: e.start_datetime,
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
        const actionNames = [
          ...new Set(
            actionsRes.data.map((a) => a.action_name).filter(Boolean)
          ),
        ];
        setActionOptions(actionNames);
      }

      setIsLoading(false);
    }
    fetchData();
  }, [eventId, getToken]);

  const handleSubmit = async (data: CustomEventFormData) => {
    if (!initialData) return;

    setIsSubmitting(true);

    try {
      // Parse the original start_datetime to get original date (ignoring time)
      const originalDate = parseLocalDateTime(initialData.start_datetime);
      const originalDateOnly = new Date(originalDate.getFullYear(), originalDate.getMonth(), originalDate.getDate());
      const newDateOnly = new Date(data.date.getFullYear(), data.date.getMonth(), data.date.getDate());
      
      // Only compare date part, preserve original time from initialData
      const dateChanged = originalDateOnly.getTime() !== newDateOnly.getTime();
      const nameChanged = data.event_name !== initialData.event_name;

      // 1. Update event info if name or date changed
      if (nameChanged || dateChanged) {
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

        const eventUpdateRes = await updateEventPartial(
          initialData.event_id,
          {
            name: data.event_name,
            start_datetime: formatLocalDateTime(startDate),
            end_datetime: formatLocalDateTime(endDate),
          } as Parameters<typeof updateEventPartial>[1],
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
              action_id: pd.action_name ? pd.action_id : null,
              action_name: pd.action_name || null,
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
          point_deatils: newRows.map((pd) => ({
            departments_id: pd.departments_id,
            points: pd.points,
            action_id: pd.action_name ? pd.action_id : null,
            action_name: pd.action_name || null,
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
