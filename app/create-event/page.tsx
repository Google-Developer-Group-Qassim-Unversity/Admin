"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, ImageIcon, X, Upload } from "lucide-react";
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
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadList,
} from "@/components/ui/file-upload";
import {
  getEvents,
  createEvent,
  uploadFile,
  shouldContactSupport,
} from "@/lib/api";
import type { Event, LocationType, EventStatus } from "@/lib/api-types";

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
  const [existingEvents, setExistingEvents] = React.useState<Event[]>([]);
  const [isLoadingData, setIsLoadingData] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [uploadedFile, setUploadedFile] = React.useState<File | null>(null);

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

  // Fetch existing events on mount
  React.useEffect(() => {
    async function fetchData() {
      setIsLoadingData(true);
      try {
        const eventsResult = await getEvents();
        if (eventsResult.success) {
          setExistingEvents(eventsResult.data);
        }
      } catch (error) {
        console.error("Failed to fetch initial data:", error);
      } finally {
        setIsLoadingData(false);
      }
    }

    fetchData();
  }, []);

  // Get unique locations from existing events, filtered by location type
  const locationOptions = React.useMemo(() => {
    const uniqueLocations = new Set<string>();
    
    existingEvents.forEach((event) => {
      if (event.location && event.location_type === watchLocationType) {
        uniqueLocations.add(event.location);
      }
    });
    
    return Array.from(uniqueLocations).sort((a, b) => a.localeCompare(b));
  }, [existingEvents, watchLocationType]);

  // Clear location when location type changes
  const previousLocationType = React.useRef<LocationType>(watchLocationType);
  React.useEffect(() => {
    if (previousLocationType.current !== watchLocationType) {
      setValue("location", "");
      previousLocationType.current = watchLocationType;
    }
  }, [watchLocationType, setValue]);

  // Validate event name uniqueness
  React.useEffect(() => {
    const normalizedName = watchName.trim().toLowerCase();
    const isDuplicate = existingEvents.some(
      (event) => event.name.trim().toLowerCase() === normalizedName
    );

    if (isDuplicate && normalizedName.length > 0) {
      setError("name", {
        type: "manual",
        message: "An event with this name already exists",
      });
    } else if (errors.name?.type === "manual") {
      clearErrors("name");
    }
  }, [watchName, existingEvents, setError, clearErrors, errors.name?.type]);

  // Handle file upload
  const handleFileUpload = async (files: File[]) => {
    if (files.length === 0) return;

    const file = files[0];
    setUploadedFile(file);

    const result = await uploadFile(file);
    if (result.success) {
      setValue("image_url", result.data.file);
      toast.success("Image uploaded successfully");
    } else {
      setUploadedFile(null);
      setValue("image_url", "");
      if (shouldContactSupport(result.error)) {
        toast.error("Upload failed. Please contact support.");
      } else {
        toast.error(result.error.message);
      }
    }
  };

  // Handle file removal
  const handleFileRemove = () => {
    setUploadedFile(null);
    setValue("image_url", "");
  };

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
        image_url: data.image_url || null,
      };

      const result = await createEvent(payload);

      if (result.success) {
        toast.success("Event created successfully!");
        window.location.reload();
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
          <div className="space-y-2">
            <Label>Event Image</Label>
            <FileUpload
              maxFiles={1}
              maxSize={5 * 1024 * 1024}
              accept="image/*"
              onAccept={handleFileUpload}
              value={uploadedFile ? [uploadedFile] : []}
              onValueChange={(files) => {
                if (files.length === 0) {
                  handleFileRemove();
                }
              }}
            >
              <FileUploadDropzone className="min-h-30 flex-col">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Drag & drop an image here, or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  Max 5MB, images only
                </p>
              </FileUploadDropzone>
              <FileUploadList>
                {uploadedFile && (
                  <FileUploadItem value={uploadedFile}>
                    <FileUploadItemPreview />
                    <FileUploadItemMetadata />
                    <FileUploadItemDelete asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={handleFileRemove}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </FileUploadItemDelete>
                  </FileUploadItem>
                )}
              </FileUploadList>
            </FileUpload>
            {errors.image_url && (
              <p className="text-sm text-destructive">
                {errors.image_url.message}
              </p>
            )}
          </div>

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
