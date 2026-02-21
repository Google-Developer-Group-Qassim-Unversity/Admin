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
import type { MemberOption } from "@/components/point-detail-row";
import type { CustomEventDepartment, CustomEventMember, GroupedActions, EventDetails } from "@/lib/api-types";
import {
  getCustomEvents,
  getCustomEventDepartment,
  getCustomEventMember,
  getEventDetails,
  getDepartments,
  getMembers,
  getActions,
  updateCustomPointDetail,
  updateCustomMemberPointDetail,
  createCustomDepartmentPoints,
  createCustomMemberPoints,
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

  const [initialData, setInitialData] =
    React.useState<CustomEventDepartment | null>(null);
  const [initialMemberData, setInitialMemberData] =
    React.useState<CustomEventMember | null>(null);
  const [eventDetails, setEventDetails] = 
    React.useState<EventDetails | null>(null);
  const [eventNameOptions, setEventNameOptions] = React.useState<string[]>([]);
  const [allEvents, setAllEvents] = React.useState<
    Array<{ name: string; start_datetime: string; location_type: import("@/lib/api-types").LocationType }>
  >([]);
  const [departmentOptions, setDepartmentOptions] = React.useState<
    ComboboxOption[]
  >([]);
  const [memberOptions, setMemberOptions] = React.useState<MemberOption[]>([]);
  const [actionOptions, setActionOptions] = React.useState<GroupedActions>({
    department: [],
    member: [],
    bonus: [],
  });

  React.useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);

      const [eventRes, eventDetailsRes, eventsRes, deptsRes, membersRes, actionsRes, memberEventRes] = await Promise.all([
        getCustomEventDepartment(eventId, getToken),
        getEventDetails(eventId, getToken),
        getCustomEvents(),
        getDepartments(),
        getMembers(getToken),
        getActions(),
        getCustomEventMember(eventId, getToken),
      ]);

      if (!eventDetailsRes.success) {
        setError(eventDetailsRes.error.message || "Failed to load event details.");
        setIsLoading(false);
        return;
      }

      setEventDetails(eventDetailsRes.data);

      if (eventRes.success) {
        setInitialData(eventRes.data);
      }

      if (memberEventRes.success) {
        setInitialMemberData(memberEventRes.data);
      }

      if (eventsRes.success) {
        const names = [...new Set(eventsRes.data.map((e) => e.name))];
        setEventNameOptions(names);
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

      if (membersRes.success) {
        setMemberOptions(
          membersRes.data.map((m) => ({
            id: m.id,
            label: m.name,
            uni_id: m.uni_id,
          }))
        );
      }

if (actionsRes.success) {
          setActionOptions({
            department: actionsRes.data.department_actions,
            member: actionsRes.data.member_actions,
            bonus: actionsRes.data.custom_actions,
          });
        }

      setIsLoading(false);
    }
    fetchData();
  }, [eventId, getToken]);

  const handleSubmit = async (data: CustomEventFormData) => {
    if (!eventDetails) return;

    const initialEventName = initialData?.event_name ?? initialMemberData?.event_name;
    const initialStartDt = initialData?.start_datetime ?? initialMemberData?.start_datetime;

    setIsSubmitting(true);

    try {
      const originalDate = parseLocalDateTime(initialStartDt || "");
      const originalDateOnly = new Date(originalDate.getFullYear(), originalDate.getMonth(), originalDate.getDate());
      const newDateOnly = new Date(data.date.getFullYear(), data.date.getMonth(), data.date.getDate());
      
      const dateChanged = initialStartDt ? originalDateOnly.getTime() !== newDateOnly.getTime() : true;
      const nameChanged = data.event_name !== initialEventName;
      
      const currentEvent = allEvents.find((e) => e.name === initialEventName);
      const currentVisibility = currentEvent ? currentEvent.location_type !== "hidden" : true;
      const visibilityChanged = data.is_visible !== currentVisibility;

      if (nameChanged || dateChanged || visibilityChanged) {
        let startDate, endDate;
        if (dateChanged) {
          startDate = new Date(data.date);
          startDate.setHours(10, 0, 0, 0);
          endDate = new Date(data.date);
          endDate.setHours(12, 0, 0, 0);
        } else {
          startDate = parseLocalDateTime(initialStartDt || "");
          endDate = parseLocalDateTime((initialData?.end_datetime ?? initialMemberData?.end_datetime) || "");
        }

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
          parseInt(eventId),
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

      const existingDeptRows = data.point_details.filter((pd) => pd.row_type === "department" && pd.log_id);
      const newDeptRows = data.point_details.filter((pd) => pd.row_type === "department" && !pd.log_id);
      const existingMemberRows = data.point_details.filter((pd) => pd.row_type === "member" && pd.log_id);
      const newMemberRows = data.point_details.filter((pd) => pd.row_type === "member" && !pd.log_id);

      const updateDeptPromises = existingDeptRows
        .filter((pd) => {
          const original = initialData?.point_details.find((orig) => orig.log_id === pd.log_id);
          if (!original) return true;
          const pointsChanged = pd.points !== original.points;
          const actionChanged = pd.action_name !== (original.action_name ?? null);
          const depsChanged = 
            pd.departments_id.length !== original.departments_id.length ||
            !pd.departments_id.every((id) => original.departments_id.includes(id));
          return pointsChanged || actionChanged || depsChanged;
        })
        .map((pd) =>
          updateCustomPointDetail(
            pd.log_id!,
            {
              log_id: pd.log_id!,
              departments_id: pd.departments_id,
              points: pd.points,
              action_id: pd.action_id,
              action_name: pd.action_name,
            },
            getToken
          )
        );

      const updateMemberPromises = existingMemberRows
        .filter((pd) => {
          const original = initialMemberData?.point_details.find((orig) => orig.log_id === pd.log_id);
          if (!original) return true;
          const pointsChanged = pd.points !== original.points;
          const actionChanged = pd.action_name !== (original.action_name ?? null);
          const membersChanged = 
            pd.member_ids.length !== original.member_ids.length ||
            !pd.member_ids.every((id) => original.member_ids.includes(id));
          return pointsChanged || actionChanged || membersChanged;
        })
        .map((pd) =>
          updateCustomMemberPointDetail(
            pd.log_id!,
            {
              log_id: pd.log_id!,
              member_ids: pd.member_ids,
              points: pd.points,
              action_id: pd.action_id,
              action_name: pd.action_name,
            },
            getToken
          )
        );

      const updateResults = await Promise.all([...updateDeptPromises, ...updateMemberPromises]);

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

      const newStartDate = new Date(data.date);
      newStartDate.setHours(10, 0, 0, 0);
      const newEndDate = new Date(data.date);
      newEndDate.setHours(12, 0, 0, 0);

      if (newDeptRows.length > 0) {
        const createDeptPayload = {
          event_id: parseInt(eventId),
          start_datetime: formatLocalDateTime(newStartDate),
          end_datetime: formatLocalDateTime(newEndDate),
          event_name: data.event_name,
          location_type: (data.is_visible ? "none" : "hidden") as import("@/lib/api-types").LocationType,
          point_deatils: newDeptRows.map((pd) => ({
            departments_id: pd.departments_id,
            points: pd.points,
            action_id: pd.action_id,
            action_name: pd.action_name,
          })),
        };

        const createRes = await createCustomDepartmentPoints(
          createDeptPayload,
          getToken
        );

        if (!createRes.success) {
          if (shouldContactSupport(createRes.error)) {
            toast.error(
              "Failed to create new department point details. Please contact support.",
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

      if (newMemberRows.length > 0) {
        const createMemberPayload = {
          event_id: parseInt(eventId),
          start_datetime: formatLocalDateTime(newStartDate),
          end_datetime: formatLocalDateTime(newEndDate),
          event_name: data.event_name,
          location_type: (data.is_visible ? "none" : "hidden") as import("@/lib/api-types").LocationType,
          point_deatils: newMemberRows.map((pd) => ({
            member_ids: pd.member_ids,
            points: pd.points,
            action_id: pd.action_id,
            action_name: pd.action_name,
          })),
        };

        const createRes = await createCustomMemberPoints(
          createMemberPayload,
          getToken
        );

        if (!createRes.success) {
          if (shouldContactSupport(createRes.error)) {
            toast.error(
              "Failed to create new member point details. Please contact support.",
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

  if (!initialData && !initialMemberData) {
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
            Edit event details and department/member point assignments
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CustomEventForm
            mode="edit"
            initialData={initialData ?? undefined}
            initialMemberData={initialMemberData ?? undefined}
            eventNameOptions={eventNameOptions}
            allEvents={allEvents}
            departmentOptions={departmentOptions}
            memberOptions={memberOptions}
            actionOptions={actionOptions}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
          />
        </CardContent>
      </Card>
    </div>
  );
}
