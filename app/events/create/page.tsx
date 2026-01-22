"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, CalendarPlus, FileBadge } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useCreateEventForm } from "@/hooks/use-create-event-form";
import { useActions, useDepartments } from "@/hooks/use-event";
import { createEvent, shouldContactSupport } from "@/lib/api";
import type { LocationType } from "@/lib/api-types";

// Form validation schema
const eventFormSchema = z.object({
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

type EventFormData = z.infer<typeof eventFormSchema>;

export default function CreateEventPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

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
      name: "",
      description: null,
      location_type: "on-site",
      location: "",
      is_official: false,
      image_url: "",
      department_id: undefined,
      composite_action: undefined,
    },
  });

  const watchName = watch("name");
  const watchLocationType = watch("location_type");

  const { isLoadingData, locationOptions } = useCreateEventForm({
    watchName,
    watchLocationType,
    setValue,
    setError,
    clearErrors,
    errors,
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

  // Form submission
  const onSubmit = async (data: EventFormData) => {
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
          start_datetime: data.startDate.toISOString(),
          end_datetime: data.endDate.toISOString(),
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
          toast.error(
            "Failed to create event. Please contact support.",
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

  if (isLoadingData || isLoadingActions || isLoadingDepartments) {
    return (
      <div className="flex justify-center">
        <Card className="w-full max-w-2xl">
          <CardContent className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <Card className="w-full max-w-2xl">
      <CardHeader>
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
              dir='auto'
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
                <LocationToggle
                  value={field.value}
                  onChange={field.onChange}
                />
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
              <p className="text-sm text-destructive">
                {errors.location.message}
              </p>
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
                <Label htmlFor="is_official" className="text-base cursor-pointer flex items-center gap-2">
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
                    value={field.value !== undefined ? field.value.toString() : undefined}
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
                          {dept.arabic_name}
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
                    value={field.value ? JSON.stringify(field.value) : undefined}
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
                          {action[0].arabic_action_name}
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
                Creating Event...
              </>
            ) : (
              "Create Event"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
    </div>
  );
}
