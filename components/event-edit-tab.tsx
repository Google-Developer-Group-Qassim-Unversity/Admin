"use client";

import * as React from "react";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { EventForm, type EventFormData } from "@/components/event-form";
import { useEventDetails, useActions, useUpdateEvent, useDepartments } from "@/hooks/use-event";
import { shouldContactSupport } from "@/lib/api";
import { parseLocalDateTime, formatLocalDateTime } from "@/lib/utils";
import type { Event, Action, LocationType, EventAction } from "@/lib/api-types";

interface EventEditTabProps {
  event: Event;
  onEventChange?: () => void;
}

export function EventEditTab({ event, onEventChange }: EventEditTabProps) {
  const { getToken } = useAuth();
  
  // Fetch full event details (including actions array)
  const { 
    data: eventDetails, 
    isLoading: isLoadingDetails, 
    error: detailsError 
  } = useEventDetails(event.id, getToken);
  
  // Fetch actions to find matching composite action
  const { data: actionsData, isLoading: isLoadingActions } = useActions();
  
  // Fetch departments for mapping
  const { data: departments, isLoading: isLoadingDepartments } = useDepartments();
  
  // Update mutation
  const updateEventMutation = useUpdateEvent(getToken);

  // Find the matching composite action based on action IDs from event details
  const findCompositeAction = React.useCallback(
    (eventActions: [EventAction, EventAction]): Action[] | undefined => {
      if (!actionsData?.composite_actions || eventActions.length !== 2) return undefined;
      
      const departmentActionId = eventActions[0].action_id;
      const memberActionId = eventActions[1].action_id;
      
      return actionsData.composite_actions.find(
        (composite) =>
          composite.length === 2 &&
          composite[0].id === departmentActionId &&
          composite[1].id === memberActionId
      );
    },
    [actionsData]
  );

  // Transform event data to form data format
  const initialFormData = React.useMemo((): Partial<EventFormData> | undefined => {
    if (!eventDetails) return undefined;

    const compositeAction = findCompositeAction(eventDetails.actions);
    
    // Get department_id from the first action (department action)
    const departmentId = eventDetails.actions[0]?.department_id;

    return {
      name: eventDetails.event.name,
      description: eventDetails.event.description,
      location_type: eventDetails.event.location_type as "online" | "on-site",
      location: eventDetails.event.location,
      startDate: parseLocalDateTime(eventDetails.event.start_datetime),
      endDate: parseLocalDateTime(eventDetails.event.end_datetime),
      is_official: eventDetails.event.is_official === 1, // Convert number to boolean
      image_url: eventDetails.event.image_url,
      department_id: departmentId,
      composite_action: compositeAction,
    };
  }, [eventDetails, findCompositeAction]);

  // Handle form submission
  const handleSubmit = async (data: EventFormData) => {
    try {
      // Get the selected department info
      const selectedDepartment = departments?.find(d => d.id === data.department_id);
      
      // Build EventAction objects from composite action
      const departmentAction: EventAction = {
        action_id: data.composite_action[0].id,
        ar_action_name: data.composite_action[0].ar_action_name,
        department_id: data.department_id,
        department_ar_name: selectedDepartment?.ar_name ?? "",
      };
      
      const memberAction: EventAction = {
        action_id: data.composite_action[1].id,
        ar_action_name: data.composite_action[1].ar_action_name,
        department_id: data.department_id,
        department_ar_name: selectedDepartment?.ar_name ?? "",
      };

      const payload = {
        event: {
          id: event.id,
          name: data.name.trim(),
          description: data.description?.trim() || null,
          location_type: data.location_type as LocationType,
          location: data.location,
          start_datetime: formatLocalDateTime(data.startDate),
          end_datetime: formatLocalDateTime(data.endDate),
          status: event.status, // Preserve existing status
          image_url: data.image_url || null,
          is_official: data.is_official ? 1 : 0, // Convert boolean to number
        },
        actions: [departmentAction, memberAction] as [EventAction, EventAction],
      };

      await updateEventMutation.mutateAsync({ id: event.id, data: payload });
      
      toast.success("Event updated successfully!");
      onEventChange?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      
      // Check if it's a validation or server error
      const apiError = { 
        message: errorMessage, 
        status: 0, 
        isServerError: true 
      };
      
      if (shouldContactSupport(apiError)) {
        toast.error("Failed to update event. Please contact support.", {
          description: `Error: ${errorMessage}`,
          duration: 10000,
        });
      } else {
        toast.error(errorMessage);
      }
    }
  };

  // Loading state
  if (isLoadingDetails || isLoadingActions || isLoadingDepartments) {
    return (
      <Card className="max-w-3xl mx-auto">
        <CardContent className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading event details...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (detailsError) {
    return (
      <Card className="max-w-3xl mx-auto">
        <CardContent className="py-16">
          <div className="text-center text-destructive">
            <p className="font-medium">Failed to load event details</p>
            <p className="text-sm mt-1">{detailsError.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No data state (shouldn't happen but handle gracefully)
  if (!eventDetails || !initialFormData) {
    return (
      <Card className="max-w-3xl mx-auto">
        <CardContent className="py-16">
          <div className="text-center text-muted-foreground">
            <p>Event details not available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Pencil className="h-5 w-5 text-primary" />
          </div>
          Edit Event: {event.name}
        </CardTitle>
        <CardDescription>
          Update the event details and configuration.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <EventForm
          mode="edit"
          eventId={event.id}
          initialData={initialFormData}
          onSubmit={handleSubmit}
          isSubmitting={updateEventMutation.isPending}
          getToken={getToken}
          submitButtonText="Save Changes"
          submittingText="Saving..."
        />
      </CardContent>
    </Card>
  );
}
