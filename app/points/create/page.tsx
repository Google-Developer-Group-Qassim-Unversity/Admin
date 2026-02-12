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
import {
  getCustomEvents,
  getDepartments,
  getCustomActions,
  createCustomDepartmentPoints,
  shouldContactSupport,
} from "@/lib/api";
import { formatLocalDateTime } from "@/lib/utils";

export default function CreateCustomEventPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Data for comboboxes
  const [eventNameOptions, setEventNameOptions] = React.useState<string[]>([]);
  const [departmentOptions, setDepartmentOptions] = React.useState<
    ComboboxOption[]
  >([]);
  const [actionOptions, setActionOptions] = React.useState<string[]>([]);
  const [isLoadingData, setIsLoadingData] = React.useState(true);

  // Fetch reference data
  React.useEffect(() => {
    async function fetchData() {
      setIsLoadingData(true);
      const [eventsRes, deptsRes, actionsRes] = await Promise.all([
        getCustomEvents(),
        getDepartments(),
        getCustomActions(),
      ]);

      if (eventsRes.success) {
        const names = [
          ...new Set(eventsRes.data.map((e) => e.name)),
        ];
        setEventNameOptions(names);
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
            actionsRes.data
              .map((a) => a.action_name)
              .filter(Boolean)
          ),
        ];
        setActionOptions(actionNames);
      }

      setIsLoadingData(false);
    }
    fetchData();
  }, []);

  const handleSubmit = async (data: CustomEventFormData) => {
    setIsSubmitting(true);

    try {
      // Set default times: 10:00 AM to 12:00 PM
      const startDate = new Date(data.date);
      startDate.setHours(10, 0, 0, 0);
      const endDate = new Date(data.date);
      endDate.setHours(12, 0, 0, 0);

      const payload = {
        start_datetime: formatLocalDateTime(startDate),
        end_datetime: formatLocalDateTime(endDate),
        event_name: data.event_name,
        point_deatils: data.point_details.map((pd) => ({
          departments_id: pd.departments_id,
          points: pd.points,
          action_id: pd.action_name ? pd.action_id : null,
          action_name: pd.action_name || null,
        })),
      };

      const result = await createCustomDepartmentPoints(payload, getToken);

      if (result.success) {
        toast.success("Custom event created successfully!");
        router.push("/points");
      } else {
        if (shouldContactSupport(result.error)) {
          toast.error(
            "Failed to create custom event. Please contact support.",
            {
              description: `Error: ${result.error.message}`,
              duration: 10000,
            }
          );
        } else {
          toast.error(result.error.message);
        }
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
            Create a new custom event with department point details
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
              departmentOptions={departmentOptions}
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
