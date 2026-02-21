"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
import {
  getCustomEvents,
  getDepartments,
  getMembers,
  getActions,
  createCustomDepartmentPoints,
  createCustomMemberPoints,
  shouldContactSupport,
} from "@/lib/api";
import { formatLocalDateTime } from "@/lib/utils";
import type { GroupedActions, LocationType } from "@/lib/api-types";

export default function CreateCustomEventPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const [eventNameOptions, setEventNameOptions] = React.useState<string[]>([]);
  const [allEvents, setAllEvents] = React.useState<
    Array<{ id: number; name: string; start_datetime: string; location_type: LocationType }>
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
  const [isLoadingData, setIsLoadingData] = React.useState(true);

  React.useEffect(() => {
    async function fetchData() {
      setIsLoadingData(true);
      const [eventsRes, deptsRes, membersRes, actionsRes] = await Promise.all([
        getCustomEvents(),
        getDepartments(),
        getMembers(getToken),
        getActions(),
      ]);

      if (eventsRes.success) {
        const names = [
          ...new Set(eventsRes.data.map((e) => e.name)),
        ];
        setEventNameOptions(names);
        setAllEvents(eventsRes.data.map((e) => ({
          id: e.id,
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

      setIsLoadingData(false);
    }
    fetchData();
  }, [getToken]);

  const handleSubmit = async (data: CustomEventFormData) => {
    setIsSubmitting(true);

    try {
      const startDate = new Date(data.date);
      startDate.setHours(10, 0, 0, 0);
      const endDate = new Date(data.date);
      endDate.setHours(12, 0, 0, 0);

      const existingEvent = allEvents.find((e) => e.name === data.event_name);

      const departmentRows = data.point_details.filter((pd) => pd.row_type === "department");
      const memberRows = data.point_details.filter((pd) => pd.row_type === "member");

      const results = [];

      if (departmentRows.length > 0) {
        const deptPayload = {
          event_id: existingEvent?.id ?? null,
          start_datetime: formatLocalDateTime(startDate),
          end_datetime: formatLocalDateTime(endDate),
          event_name: data.event_name,
          location_type: (data.is_visible ? "none" : "hidden") as LocationType,
          point_deatils: departmentRows.map((pd) => ({
            departments_id: pd.departments_id,
            points: pd.points,
            action_id: pd.action_id,
            action_name: pd.action_name,
          })),
        };

        const deptResult = await createCustomDepartmentPoints(deptPayload, getToken);
        results.push({ type: "department", result: deptResult });
      }

      if (memberRows.length > 0) {
        const memberPayload = {
          event_id: existingEvent?.id ?? null,
          start_datetime: formatLocalDateTime(startDate),
          end_datetime: formatLocalDateTime(endDate),
          event_name: data.event_name,
          location_type: (data.is_visible ? "none" : "hidden") as LocationType,
          point_deatils: memberRows.map((pd) => ({
            member_ids: pd.member_ids,
            points: pd.points,
            action_id: pd.action_id,
            action_name: pd.action_name,
          })),
        };

        const memberResult = await createCustomMemberPoints(memberPayload, getToken);
        results.push({ type: "member", result: memberResult });
      }

      const failures = results.filter((r) => !r.result.success);
      if (failures.length > 0) {
        const firstError = failures[0].result;
        if (!firstError.success) {
          if (shouldContactSupport(firstError.error)) {
            toast.error(
              "Failed to create custom event. Please contact support.",
              {
                description: `Error: ${firstError.error.message}`,
                duration: 10000,
              }
            );
          } else {
            toast.error(firstError.error.message);
          }
        }
      } else {
        toast.success("Custom event created successfully!");
        router.push("/points");
      }
    } catch {
      toast.error("An unexpected error occurred. Please contact support.");
    } finally {
      setIsSubmitting(false);
    }
  };

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
            Create Custom Event
          </CardTitle>
          <CardDescription>
            Create a new custom event with department or member point details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingData ? (
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
              </div>
            </div>
          ) : (
            <CustomEventForm
              mode="create"
              eventNameOptions={eventNameOptions}
              allEvents={allEvents}
              departmentOptions={departmentOptions}
              memberOptions={memberOptions}
              actionOptions={actionOptions}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
