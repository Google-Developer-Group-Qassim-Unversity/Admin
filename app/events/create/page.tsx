"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarPlus, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EventForm, type EventFormData } from "@/components/event-form";
import { createEvent, shouldContactSupport } from "@/lib/api";
import { formatLocalDateTime } from "@/lib/utils";
import type { LocationType } from "@/lib/api-types";

export default function CreateEventPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (data: EventFormData) => {
    setIsSubmitting(true);

    try {
      // Extract department_action_id and member_action_id from the composite action
      const department_action_id = data.composite_action[0].id;
      const member_action_id = data.composite_action[1].id;

      const payload = {
        event: {
          id: null,
          name: data.name.trim(),
          description: data.description?.trim() || null,
          location_type: data.location_type as LocationType,
          location: data.location,
          start_datetime: formatLocalDateTime(data.startDate),
          end_datetime: formatLocalDateTime(data.endDate),
          status: "draft" as const,
          image_url: data.image_url || null,
          is_official: data.is_official,
        },
        form_type: "registration" as const,
        department_action_id: department_action_id,
        member_action_id: member_action_id,
        department_id: data.department_id,
      };

      const result = await createEvent(payload, getToken);

      if (result.success) {
        toast.success("Event created successfully!");
        router.push(`/events/${result.data.id}`);
      } else {
        if (shouldContactSupport(result.error)) {
          toast.error("Failed to create event. Please contact support.", {
            description: `Error: ${result.error.message}`,
            duration: 10000,
          });
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
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="mb-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/events" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back to Events
              </Link>
            </Button>
          </div>
          <CardTitle className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <CalendarPlus className="h-5 w-5 text-primary" />
            </div>
            Create New Event
          </CardTitle>
          <CardDescription>
            Create a new event for participants to join
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EventForm
            mode="create"
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            getToken={getToken}
          />
        </CardContent>
      </Card>
    </div>
  );
}
