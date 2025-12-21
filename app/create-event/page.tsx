"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ImageIcon } from "lucide-react";
import { toast } from "sonner";

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
import { useEventFormData } from "@/hooks/use-event-form-data";
import { createEvent, shouldContactSupport } from "@/lib/api";
import type { LocationType, EventStatus } from "@/lib/api-types";

// Form validation schema
const eventFormSchema = z.object({
  name: z.string().min(1, "Event name is required").max(100, "Name is too long"),
  description: z.string().nullable(),
  location_type: z.enum(["online", "on-site"]),
  location: z.string().min(1, "Location is required"),
  startDate: z.date({ message: "Start date is required" }),
  endDate: z.date({ message: "End date is required" }),
  publishNow: z.boolean(),
  image_url: z.string().nullable(),
});

type EventFormData = z.infer<typeof eventFormSchema>;

export default function CreateEventPage() {
  const router = useRouter();
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
      publishNow: false,
      image_url: "",
    },
  });

  const watchName = watch("name");
  const watchLocationType = watch("location_type");

  const { isLoadingData, locationOptions } = useEventFormData({
    watchName,
    watchLocationType,
    setValue,
    setError,
    clearErrors,
    errors,
  });

  // Form submission
  const onSubmit = async (data: EventFormData) => {
    setIsSubmitting(true);

    try {
      const payload = {
        name: data.name.trim(),
        description: data.description?.trim() || null,
        location_type: data.location_type as LocationType,
        location: data.location,
        start_datetime: data.startDate.toISOString(),
        end_datetime: data.endDate.toISOString(),
        status: (data.publishNow ? "open" : "announced") as EventStatus,
        image_url: data.image_url || "",
      };

      const result = await createEvent(payload);

      if (result.success) {
        toast.success("Event created successfully!");
        router.push("/");
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

  if (isLoadingData) {
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
            <ImageIcon className="h-5 w-5 text-primary" />
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

          {/* Publish Status */}
          <div className="space-y-2">
            <Label htmlFor="publishNow">Open for Registration?</Label>
            <div className="flex items-center gap-4 rounded-lg border p-4">
              <Controller
                name="publishNow"
                control={control}
                render={({ field }) => (
                  <Switch
                    id="publishNow"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <div className="space-y-0.5">
                <Label htmlFor="publishNow" className="text-base cursor-pointer">
                  {watch("publishNow")
                    ? "Yes, open registration now"
                    : "No, just announce the event"}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {watch("publishNow")
                    ? "Members can sign up immediately"
                    : "Event will be visible but registration closed"}
                </p>
              </div>
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
