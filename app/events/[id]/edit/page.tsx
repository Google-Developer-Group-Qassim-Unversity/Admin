"use client";

import * as React from "react";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EventForm, type EventFormData } from "@/components/event-form";
import { useEventDetails, useActions, useUpdateEvent, useDepartments, useDeleteEvent } from "@/hooks/use-event";
import { shouldContactSupport } from "@/lib/api/errors";
import { parseLocalDateTime, formatLocalDateTime } from "@/lib/utils";
import { useEventContext } from "@/contexts/event-context";
import type { LocationType, EventAction, Action } from "@/lib/api-types";
import { useTranslations } from "next-intl";

export default function EventEditPage() {
  const t = useTranslations("editEvent");
  const tc = useTranslations("common.actions");
  const { event, refetch } = useEventContext();
  // Still needed by EventForm, which forwards it to the image upload - the
  // uploads resource has not migrated to the api module yet.
  const { getToken } = useAuth();
  const router = useRouter();

  const { 
    data: eventDetails, 
    isLoading: isLoadingDetails, 
    error: detailsError 
  } = useEventDetails(event?.id ?? 0);
  
  const { data: actionsData, isLoading: isLoadingActions } = useActions();
  
  const { data: departments, isLoading: isLoadingDepartments } = useDepartments();
  
  const updateEventMutation = useUpdateEvent();
  const deleteEventMutation = useDeleteEvent();

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

  const initialFormData = React.useMemo((): Partial<EventFormData> | undefined => {
    if (!eventDetails) return undefined;

    const compositeAction = findCompositeAction(eventDetails.actions);
    
    const departmentId = eventDetails.actions[0]?.department_id;

    return {
      name: eventDetails.event.name,
      description: eventDetails.event.description,
      location_type: eventDetails.event.location_type as "online" | "on-site",
      location: eventDetails.event.location,
      startDate: parseLocalDateTime(eventDetails.event.start_datetime),
      endDate: parseLocalDateTime(eventDetails.event.end_datetime),
      is_official: eventDetails.event.is_official === 1,
      image_url: eventDetails.event.image_url,
      department_id: departmentId,
      composite_action: compositeAction,
    };
  }, [eventDetails, findCompositeAction]);

  if (!event) {
    return null;
  }
  
  const isDraft = event.status === "draft";

  const handleSubmit = async (data: EventFormData) => {
    try {
      const selectedDepartment = departments?.find(d => d.id === data.department_id);
      
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
          status: event.status,
          image_url: data.image_url || null,
          is_official: data.is_official ? 1 : 0,
        },
        actions: [departmentAction, memberAction] as [EventAction, EventAction],
      };

      await updateEventMutation.mutateAsync({ id: event.id, data: payload });
      
      toast.success(t("updatedSuccess"));
      refetch?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t("unknownError");

      // This used to build an `apiError` literal with `isServerError: true`
      // hardcoded, because the mutation threw a plain Error and the real status
      // was gone - so this branch was always taken and the else below was dead.
      // The API throws ApiRequestError now, so the status is the real one.
      if (shouldContactSupport(error)) {
        toast.error(t("updateFailedContactSupport"), {
          description: t("errorDetail", { message: errorMessage }),
          duration: 10000,
        });
      } else {
        toast.error(errorMessage);
      }
    }
  };

  const handleDelete = async () => {
    try {
      await deleteEventMutation.mutateAsync(event.id);
      toast.success(t("deletedSuccess"));
      router.push("/events");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t("unknownError");
      toast.error(t("deleteFailed"), {
        description: errorMessage,
      });
    }
  };

  if (isLoadingDetails || isLoadingActions || isLoadingDepartments) {
    return (
      <Card className="max-w-3xl mx-auto">
        <CardContent className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{t("loadingDetails")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (detailsError) {
    return (
      <Card className="max-w-3xl mx-auto">
        <CardContent className="py-16">
          <div className="text-center text-destructive">
            <p className="font-medium">{t("loadFailed")}</p>
            <p className="text-sm mt-1">{detailsError.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!eventDetails || !initialFormData) {
    return (
      <Card className="max-w-3xl mx-auto">
        <CardContent className="py-16">
          <div className="text-center text-muted-foreground">
            <p>{t("notAvailable")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Pencil className="h-5 w-5 text-primary" />
              </div>
              {t("title", { name: event.name })}
            </CardTitle>
            <CardDescription className="mt-1.5">
              {t("subtitle")}
            </CardDescription>
          </div>
          {isDraft && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={deleteEventMutation.isPending}
                >
                  {deleteEventMutation.isPending ? (
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="me-2 h-4 w-4" />
                  )}
                  {t("deleteDraft")}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t.rich("confirmDelete", { strong: (chunks) => <strong>{chunks}</strong>, name: event.name })}
                    {" "}{t("deleteDescription")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={handleDelete}
                  >
                    {tc("delete")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <EventForm
          mode="edit"
          eventId={event.id}
          initialData={initialFormData}
          onSubmit={handleSubmit}
          isSubmitting={updateEventMutation.isPending}
          getToken={getToken}
          submitButtonText={t("saveChanges")}
          submittingText={t("saving")}
        />
      </CardContent>
    </Card>
  );
}
