"use client";

import * as React from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { useEventDetails, useActions, useUpdateEvent, useDepartments, useDepartment, useDeleteEvent } from "@/hooks/use-event";
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
  
  // The event's current department, offered in the picker even when it is not
  // in the semester's roster anymore, so a re-save never breaks.
  const existingDepartmentId = eventDetails?.actions[0]?.department_id ?? undefined;
  const { data: departments, isLoading: isLoadingDepartments } = useDepartments();
  const { data: existingDepartment, isLoading: isLoadingExistingDepartment } = useDepartment(
    departments && existingDepartmentId != null && !departments.some((d) => d.id === existingDepartmentId)
      ? existingDepartmentId
      : undefined
  );
  
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
      const selectedDepartment = departments?.find(d => d.id === data.department_id) ?? existingDepartment;
      
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

  if (isLoadingDetails || isLoadingActions || isLoadingDepartments || isLoadingExistingDepartment) {
    return (
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4" aria-busy="true" aria-label={t("loadingDetails")}>
        <Skeleton className="h-8 w-1/3" />
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-11 w-full" />
        ))}
      </div>
    );
  }

  if (detailsError) {
    return (
      <Alert variant="destructive" className="mx-auto max-w-3xl">
        <AlertTitle>{t("loadFailed")}</AlertTitle>
        <AlertDescription>{detailsError.message}</AlertDescription>
      </Alert>
    );
  }

  if (!eventDetails || !initialFormData) {
    return (
      <p className="text-ink-2 mx-auto max-w-3xl py-16 text-center">{t("notAvailable")}</p>
    );
  }

  return (
    // overflow-visible below md so the form's sticky save bar can stick; the
    // card's default overflow-hidden would pin it inside the card instead.
    <section aria-labelledby="edit-title" className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <div className="border-foreground flex flex-col gap-3 border-b pb-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h2 id="edit-title" className="text-base font-bold">
              {t("editHeading")}
            </h2>
            <p className="text-ink-2 mt-1 text-[13.5px]">{t("subtitle")}</p>
          </div>
          {isDraft && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="shrink-0 self-start"
                  disabled={deleteEventMutation.isPending}
                >
                  {deleteEventMutation.isPending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Trash2 />
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
        <EventForm
          mode="edit"
          eventId={event.id}
          initialData={initialFormData}
          extraDepartment={existingDepartment}
          onSubmit={handleSubmit}
          isSubmitting={updateEventMutation.isPending}
          getToken={getToken}
          submitButtonText={t("saveChanges")}
          submittingText={t("saving")}
        />
    </section>
  );
}
