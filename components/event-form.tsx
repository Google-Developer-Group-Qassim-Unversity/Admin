"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, FileBadge } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { LocationToggle } from "@/components/ui/location-toggle";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { DateTimeRangePicker } from "@/components/ui/datetime-range-picker";
import { EventImageUpload } from "@/components/event-image-upload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEventForm } from "@/hooks/use-create-event-form";
import { useActions, useDepartments } from "@/hooks/use-event";
import type { Action, LocationType } from "@/lib/api-types";

// Form validation schema
export const eventFormSchema = z.object({
  name: z.string().min(1, "Event name is required").max(100, "Name is too long"),
  description: z.string().nullable(),
  location_type: z.enum(["online", "on-site"]),
  location: z.string().min(1, "Location is required"),
  startDate: z.date({ message: "Start date is required" }),
  endDate: z.date({ message: "End date is required" }),
  is_official: z.boolean(),
  image_url: z.string().nullable(),
  department_id: z.number({ required_error: "Department is required" }),
  composite_action: z.array(z.any()).length(2, "Composite action is required"),
});

export type EventFormData = z.infer<typeof eventFormSchema>;

export interface EventFormProps {
  mode: "create" | "edit";
  initialData?: Partial<EventFormData>;
  /** Event ID for edit mode (used to exclude from name uniqueness check) */
  eventId?: number;
  onSubmit: (data: EventFormData) => Promise<void>;
  isSubmitting?: boolean;
  getToken: () => Promise<string | null>;
  submitButtonText?: string;
  submittingText?: string;
}

export function EventForm({
  mode,
  initialData,
  eventId,
  onSubmit,
  isSubmitting = false,
  getToken,
  submitButtonText,
  submittingText,
}: EventFormProps) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      description: initialData?.description ?? null,
      location_type: initialData?.location_type ?? "on-site",
      location: initialData?.location ?? "",
      startDate: initialData?.startDate,
      endDate: initialData?.endDate,
      is_official: initialData?.is_official ?? false,
      image_url: initialData?.image_url ?? "",
      department_id: initialData?.department_id,
      composite_action: initialData?.composite_action,
    },
  });

  const watchName = watch("name");
  const watchLocationType = watch("location_type");

  const { isLoadingData, locationOptions } = useEventForm({
    watchName,
    watchLocationType,
    setValue,
    setError,
    clearErrors,
    errors,
    excludeEventId: mode === "edit" ? eventId : undefined,
  });

  // Fetch actions and departments
  const { data: actionsData, isLoading: isLoadingActions } = useActions();
  const { data: departments, isLoading: isLoadingDepartments } = useDepartments();

  // Get composite actions directly
  const compositeActions = React.useMemo(() => {
    if (!actionsData?.composite_actions) return [];
    return actionsData.composite_actions;
  }, [actionsData]);

  // Filter to only show practical departments
  const practicalDepartments = React.useMemo(() => {
    if (!departments) return [];
    return departments.filter((dept) => dept.type === "practical");
  }, [departments]);

  // Helper to find matching composite action for display
  const findCompositeActionValue = (action: Action[] | undefined): string | undefined => {
    if (!action || action.length !== 2) return undefined;
    return JSON.stringify(action);
  };

  const isLoading = isLoadingData || isLoadingActions || isLoadingDepartments;

  const defaultSubmitText = mode === "create" ? "Create Event" : "Update Event";
  const defaultSubmittingText = mode === "create" ? "Creating Event..." : "Updating Event...";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Event Name */}
      <div className="space-y-2">
        <Label htmlFor="name">Event Name *</Label>
        <Input
          id="name"
          placeholder="Enter event name"
          {...register("name")}
          className={errors.name ? "border-destructive" : ""}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Enter event description (optional)"
          rows={3}
          dir="auto"
          {...register("description")}
        />
        <p className="text-xs text-muted-foreground">
          Leave empty if no description is needed
        </p>
      </div>

      {/* Location Type Toggle */}
      <div className="space-y-2">
        <Label className="mb-4">Location Type *</Label>
        <Controller
          name="location_type"
          control={control}
          render={({ field }) => (
            <LocationToggle value={field.value} onChange={field.onChange} />
          )}
        />
      </div>

      {/* Location Selection */}
      <div className="space-y-2">
        <Label>Location *</Label>
        <Controller
          name="location"
          control={control}
          render={({ field }) => (
            <CreatableCombobox
              options={locationOptions}
              value={field.value}
              onChange={field.onChange}
              placeholder="Select or enter location..."
              searchPlaceholder="Search locations..."
              emptyMessage="No locations found"
            />
          )}
        />
        {errors.location && (
          <p className="text-sm text-destructive">{errors.location.message}</p>
        )}
      </div>

      {/* Date & Time Range */}
      <div className="space-y-2">
        <Label>Event Date & Time *</Label>
        <Controller
          name="startDate"
          control={control}
          render={({ field: startField }) => (
            <Controller
              name="endDate"
              control={control}
              render={({ field: endField }) => (
                <DateTimeRangePicker
                  value={{
                    startDate: startField.value,
                    endDate: endField.value,
                  }}
                  onChange={({ startDate, endDate }) => {
                    startField.onChange(startDate);
                    endField.onChange(endDate);
                  }}
                />
              )}
            />
          )}
        />
        {(errors.startDate || errors.endDate) && (
          <p className="text-sm text-destructive">
            {errors.startDate?.message || errors.endDate?.message}
          </p>
        )}
      </div>

      {/* Is Official */}
      <div className="space-y-2">
        <Label htmlFor="is_official">Official Event</Label>
        <div className="flex items-center gap-4 rounded-lg border p-4">
          <Controller
            name="is_official"
            control={control}
            render={({ field }) => (
              <Switch
                id="is_official"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <div className="space-y-0.5">
            <Label
              htmlFor="is_official"
              className="text-base cursor-pointer flex items-center gap-2"
            >
              {watch("is_official") && (
                <FileBadge className="h-4 w-4 text-amber-500" />
              )}
              {watch("is_official")
                ? "This is an official event"
                : "This is not an official event"}
            </Label>
            <p className="text-sm text-muted-foreground">
              {watch("is_official")
                ? "Event will be marked as official"
                : "Event will be marked as unofficial/community event"}
            </p>
          </div>
        </div>
      </div>

      {/* Department and Composite Action Selection - Side by Side */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Department Selection */}
        <div className="space-y-2">
          <Label htmlFor="department_id">Department *</Label>
          <Controller
            name="department_id"
            control={control}
            render={({ field }) => (
              <Select
                value={
                  field.value !== undefined ? field.value.toString() : undefined
                }
                onValueChange={(value) => field.onChange(parseInt(value, 10))}
              >
                <SelectTrigger
                  id="department_id"
                  className={errors.department_id ? "border-destructive" : ""}
                >
                  <SelectValue placeholder="Select a department..." />
                </SelectTrigger>
                <SelectContent>
                  {practicalDepartments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.ar_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.department_id && (
            <p className="text-sm text-destructive">
              {errors.department_id.message}
            </p>
          )}
        </div>

        {/* Composite Action Selection */}
        <div className="space-y-2">
          <Label htmlFor="composite_action">Department Action *</Label>
          <Controller
            name="composite_action"
            control={control}
            render={({ field }) => (
              <Select
                value={findCompositeActionValue(field.value)}
                onValueChange={(value) => field.onChange(JSON.parse(value))}
              >
                <SelectTrigger
                  id="composite_action"
                  className={errors.composite_action ? "border-destructive" : ""}
                >
                  <SelectValue placeholder="Select a department action..." />
                </SelectTrigger>
                <SelectContent>
                  {compositeActions.map((action, index) => (
                    <SelectItem key={index} value={JSON.stringify(action)}>
                      {action[0].ar_action_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.composite_action && (
            <p className="text-sm text-destructive">
              {errors.composite_action.message}
            </p>
          )}
        </div>
      </div>

      {/* Image Upload */}
      <Controller
        name="image_url"
        control={control}
        render={({ field }) => (
          <EventImageUpload
            onChange={field.onChange}
            error={errors.image_url?.message}
            getToken={getToken}
            initialValue={initialData?.image_url ?? undefined}
          />
        )}
      />

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full"
        disabled={isSubmitting || Object.keys(errors).length > 0}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {submittingText ?? defaultSubmittingText}
          </>
        ) : (
          submitButtonText ?? defaultSubmitText
        )}
      </Button>
    </form>
  );
}
