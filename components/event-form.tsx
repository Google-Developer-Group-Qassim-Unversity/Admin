"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, AlertCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FormActions } from "@/components/form-actions";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { LocationToggle } from "@/components/ui/location-toggle";
import { RegistrationToggle } from "@/components/ui/registration-toggle";
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
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useTranslations } from "next-intl";

// Messages come from a translator, so the schema is built per render rather
// than at module scope where `useTranslations` is unavailable.
export const buildEventFormSchema = (t: (key: string) => string) =>
  z.object({
    event_id: z.number().nullable().optional(), // ID of existing event if reusing
    name: z
      .string()
      .min(1, t("nameRequired"))
      .max(100, t("nameTooLong")),
    description: z.string().nullable(),
    location_type: z.enum(["online", "on-site"]),
    location: z.string().min(1, t("locationRequired")),
    startDate: z.date({ message: t("startDateRequired") }),
    endDate: z.date({ message: t("endDateRequired") }),
    is_official: z.boolean(),
    /** Create mode only: true requires registration to attend and earn points, false opens it to anyone. */
    requireRegistration: z.boolean(),
    image_url: z.string().nullable(),
    department_id: z.number({ required_error: t("departmentRequired") }),
    composite_action: z.array(z.any()).length(2, t("compositeActionRequired")),
  });

export const eventFormSchema = buildEventFormSchema((key) => key);

export type EventFormData = z.infer<typeof eventFormSchema>;

export interface EventFormProps {
  mode: "create" | "edit";
  initialData?: Partial<EventFormData>;
  /** Event ID for edit mode (reserved for future use) */
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
  const t = useTranslations("eventForm");
  const tv = useTranslations("eventForm.validation");
  const tc = useTranslations("common.fields");
  const te = useTranslations("events");
  const schema = React.useMemo(() => buildEventFormSchema(tv), [tv]);

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
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: {
      event_id: initialData?.event_id ?? null,
      name: initialData?.name ?? "",
      description: initialData?.description ?? null,
      location_type: initialData?.location_type ?? "on-site",
      location: initialData?.location ?? "",
      startDate: initialData?.startDate,
      endDate: initialData?.endDate,
      is_official: initialData?.is_official ?? false,
      requireRegistration: initialData?.requireRegistration ?? true,
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
  });

  // Fetch actions and departments
  const { data: actionsData, isLoading: isLoadingActions } = useActions();
  const { data: departments, isLoading: isLoadingDepartments } = useDepartments();


  // Get composite actions directly
  const compositeActions = React.useMemo(() => {
    if (!actionsData?.composite_actions) return [];
    return actionsData.composite_actions;
  }, [actionsData]);


  // Helper to find matching composite action for display
  const findCompositeActionValue = (action: Action[] | undefined): string | undefined => {
    if (!action || action.length !== 2) return undefined;
    return JSON.stringify(action);
  };

  const isLoading = isLoadingData || isLoadingActions || isLoadingDepartments;

  const defaultSubmitText = mode === "create" ? t("submit.create") : t("submit.update");
  const defaultSubmittingText = mode === "create" ? t("submit.creating") : t("submit.updating");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-8 w-8 animate-spin text-ink-2" />
      </div>
    );
  }


  if ((!isLoadingDepartments || isLoadingActions) && (!actionsData || !departments)) {
    return (
      <div className="flex items-center justify-center py-10">
        <p className="text-sm text-destructive">
          {t("loadFailed")}
        </p>
      </div>
    );
  }

  if (mode === "edit" && initialData?.department_id == null) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t("invalidData.title")}</AlertTitle>
        <AlertDescription>
          {t("invalidData.body")}
          <br /><br />
          <strong>{t("invalidData.contactStrong")}</strong>{t("invalidData.contactRest")}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Event Name */}
      <div className="space-y-2">
        <Label htmlFor="name">{t("fields.name")}</Label>
        <Input
          id="name"
          placeholder={t("fields.namePlaceholder")}
          autoComplete="off"
          enterKeyHint="next"
          dir="auto"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? "name-error" : undefined}
          {...register("name")}
          className={errors.name ? "border-destructive" : ""}
        />
        {errors.name && (
          <p id="name-error" role="alert" className="text-sm text-destructive">
            {errors.name.message}
          </p>
        )}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Label htmlFor="description">{tc("description")}</Label>
          <Badge variant="secondary">{tc("optional")}</Badge>
        </div>
        <Textarea
          id="description"
          placeholder={t("fields.descriptionPlaceholder")}
          rows={3}
          dir="auto"
          {...register("description")}
        />
      </div>

      {/* Location Type + Location - Side by Side */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Location Type Toggle */}
        <div className="space-y-2">
          <Label>{t("fields.locationType")}</Label>
          <Controller
            name="location_type"
            control={control}
            render={({ field }) => (
              <LocationToggle
                value={field.value}
                onChange={field.onChange}
                className="w-full *:flex-1 *:pointer-coarse:h-10 md:w-fit md:*:flex-none"
              />
            )}
          />
        </div>

        {/* Location Selection */}
        <div className="space-y-2">
          <Label htmlFor="location">{t("fields.location")}</Label>
          <Controller
            name="location"
            control={control}
            render={({ field }) => (
              <CreatableCombobox
                id="location"
                options={locationOptions}
                value={field.value}
                onChange={field.onChange}
                placeholder={t("fields.locationPlaceholder")}
                searchPlaceholder={te("filters.searchLocations")}
                emptyMessage={t("fields.locationEmpty")}
              />
            )}
          />
          {errors.location && (
            <p role="alert" className="text-sm text-destructive">
              {errors.location.message}
            </p>
          )}
        </div>
      </div>

      {/* Date & Time Range */}
      <div className="space-y-2">
        <Label>{t("fields.dateTime")}</Label>
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
          <p role="alert" className="text-sm text-destructive">
            {errors.startDate?.message || errors.endDate?.message}
          </p>
        )}
      </div>

      {/* Registration Requirement (create only - changeable later from Google Form & Publish) */}
      {mode === "create" && (
        <div className="space-y-2">
          <Label>{t("fields.attendanceAccess")}</Label>
          <Controller
            name="requireRegistration"
            control={control}
            render={({ field }) => (
              <RegistrationToggle
                value={field.value}
                onChange={field.onChange}
                className="w-full *:flex-1 *:pointer-coarse:h-10 sm:w-fit sm:*:flex-none"
              />
            )}
          />
          <p className="text-sm text-ink-2">
            {watch("requireRegistration")
              ? t("registration.requiredHint")
              : t("registration.notRequiredHint")}
          </p>
        </div>
      )}

      {/* Is Official - the whole row is the label, so it is a full-width tap target. */}
      <div className="flex min-h-10 items-center gap-3">
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
        <Label htmlFor="is_official" className="flex-1 cursor-pointer py-2">
          {t("fields.official")}
        </Label>
      </div>

      {/* Department and Composite Action Selection - Side by Side */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Department Selection */}
        <div className="space-y-2">
          <Label htmlFor="department_id">{t("fields.department")}</Label>
          <Controller
            name="department_id"
            control={control}
            render={({ field }) => (
              <Select
                 value={
                   field.value != null ? field.value.toString() : undefined
                 }
                 onValueChange={(value) => field.onChange(parseInt(value, 10))}
               >
                <SelectTrigger
                  id="department_id"
                  aria-invalid={!!errors.department_id}
                  aria-describedby={errors.department_id ? "department-error" : undefined}
                  className={`w-full ${errors.department_id ? "border-destructive" : ""}`}
                >
                  <SelectValue placeholder={t("fields.departmentPlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {departments?.map((dept) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      <bdi>{dept.ar_name}</bdi>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.department_id && (
            <p id="department-error" role="alert" className="text-sm text-destructive">
              {errors.department_id.message}
            </p>
          )}
        </div>

        {/* Composite Action Selection */}
        <div className="space-y-2">
          <Label htmlFor="composite_action">{t("fields.departmentAction")}</Label>
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
                  aria-invalid={!!errors.composite_action}
                  aria-describedby={errors.composite_action ? "composite-action-error" : undefined}
                  className={`w-full ${errors.composite_action ? "border-destructive" : ""}`}
                >
                  <SelectValue placeholder={t("fields.departmentActionPlaceholder")} />
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
            <p id="composite-action-error" role="alert" className="text-sm text-destructive">
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

      {/* Submit: sticks above the tab bar on phones so it is always in reach.
          The card around the form pads 16px (24px from sm), which the bar
          bleeds back out of so it spans the card edge to edge. */}
      <FormActions className="sm:-mx-6 sm:px-6 md:mx-0 md:px-0">
        <Button
          type="submit"
          className="md:min-w-40"
          disabled={isSubmitting || Object.keys(errors).length > 0}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="animate-spin" />
              {submittingText ?? defaultSubmittingText}
            </>
          ) : (
            submitButtonText ?? defaultSubmitText
          )}
        </Button>
      </FormActions>
    </form>
  );
}
