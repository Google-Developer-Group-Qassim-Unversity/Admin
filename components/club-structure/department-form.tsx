"use client";

import { useId, useState } from "react";
import { Building2, Code2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEPARTMENT_COLORS } from "@/components/club-structure/shared";
import { DEPARTMENT_ICONS, DEPARTMENT_ICON_COMPONENTS } from "@/lib/department-icons";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { DepartmentSettings } from "@/lib/club-structure-types";
import { cn } from "@/lib/utils";
import { useFormDirty } from "@/lib/use-form-dirty";

const EMPTY_SETTINGS: DepartmentSettings = {
  name: "",
  ar_name: "",
  type: "administrative",
  color: DEPARTMENT_COLORS[0],
  icon: "building2",
};

export function DepartmentForm({
  initial = EMPTY_SETTINGS,
  pending,
  readOnly = false,
  disabled = false,
  mode = "edit",
  submitLabel,
  onSubmit,
}: {
  initial?: DepartmentSettings;
  pending: boolean;
  readOnly?: boolean;
  disabled?: boolean;
  mode?: "create" | "edit";
  submitLabel: string;
  onSubmit: (settings: DepartmentSettings) => Promise<boolean>;
}) {
  const t = useTranslations("clubStructure");
  const common = useTranslations("common");
  const id = useId();
  const saved: DepartmentSettings = {
    name: initial.name,
    ar_name: initial.ar_name,
    type: initial.type,
    color: initial.color,
    icon: initial.icon,
  };
  const [draft, setDraft] = useState<{
    base: DepartmentSettings;
    values: DepartmentSettings;
  } | null>(null);
  const values = draft?.values ?? saved;
  const dirty = useFormDirty(saved, values);
  const sourceChanged = useFormDirty(draft?.base ?? saved, saved) && draft !== null;
  const setValues = (values: DepartmentSettings) => setDraft({ base: draft?.base ?? saved, values });
  const valid = !!values.name.trim() && !!values.ar_name.trim() && /^#[\da-f]{6}$/i.test(values.color);

  return (
    <form
      onSubmit={async (event) => {
        event.preventDefault();
        if (!valid || pending || readOnly || disabled || sourceChanged || !dirty) return;
        const saved = await onSubmit({
          ...values,
          name: values.name.trim(),
          ar_name: values.ar_name.trim(),
        });
        if (saved) setDraft(null);
      }}
      className="space-y-6"
    >
      {sourceChanged && !pending && (
        <div role="alert" className="space-y-2 rounded-lg border bg-muted/50 p-3 text-sm">
          <p>{t("settingsChanged")}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => setDraft(null)}>
            {t("reloadSettings")}
          </Button>
        </div>
      )}
      <fieldset disabled={pending || readOnly || disabled} className="space-y-6">
        <div className="grid gap-6">
          <div className="space-y-2">
            <Label htmlFor={`${id}-name`}>{t("englishName")}</Label>
            <Input
              id={`${id}-name`}
              dir="ltr"
              required
              maxLength={50}
              value={values.name}
              onChange={(event) => setValues({ ...values, name: event.target.value })}
            />
            {draft && !values.name.trim() && <p className="text-xs text-destructive">{t("nameRequired")}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${id}-ar-name`}>{t("arabicName")}</Label>
            <Input
              id={`${id}-ar-name`}
              dir="rtl"
              required
              maxLength={100}
              value={values.ar_name}
              onChange={(event) => setValues({ ...values, ar_name: event.target.value })}
            />
            {draft && !values.ar_name.trim() && <p className="text-xs text-destructive">{t("arabicNameRequired")}</p>}
          </div>
        </div>
        <div className="space-y-2">
          <Label id={`${id}-type-label`}>{t("type")}</Label>
          <ToggleGroup
            type="single"
            role="radiogroup"
            aria-labelledby={`${id}-type-label`}
            value={values.type}
            disabled={pending || readOnly || disabled}
            variant="outline"
            className="justify-start"
            onValueChange={(type) => {
              // Like the event location toggle, keep one option selected.
              if (type === "administrative" || type === "practical") setValues({ ...values, type });
            }}
          >
            <ToggleGroupItem value="administrative" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" aria-hidden="true" />
              {t("types.administrative")}
            </ToggleGroupItem>
            <ToggleGroupItem value="practical" className="flex items-center gap-2">
              <Code2 className="h-4 w-4" aria-hidden="true" />
              {t("types.practical")}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <fieldset>
          <legend className="mb-3 text-sm font-medium">{t("color")}</legend>
          <div className="flex flex-wrap gap-2">
            {DEPARTMENT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={t("selectColor", { color })}
                aria-pressed={values.color.toLowerCase() === color}
                onClick={() => setValues({ ...values, color })}
                className={cn(
                  "size-10 rounded-full border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:size-8",
                  values.color.toLowerCase() === color && "ring-2 ring-foreground ring-offset-2 ring-offset-background",
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <Label htmlFor={`${id}-color`}>{t("customColor")}</Label>
            <Input
              id={`${id}-color`}
              type="color"
              className="h-9 w-14 p-1"
              value={values.color}
              onChange={(event) => setValues({ ...values, color: event.target.value })}
            />
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-3 text-sm font-medium">{t("icon")}</legend>
          <p className="mb-3 text-sm text-muted-foreground">{t("iconHint")}</p>
          <div
            className={
              mode === "create"
                ? "flex flex-wrap gap-2 p-1"
                : "grid max-h-60 grid-cols-5 gap-2 overflow-y-auto p-1 sm:grid-cols-8"
            }
          >
            {Array.from(new Set<string>([...DEPARTMENT_ICONS, values.icon])).map((icon) => {
              const Icon = Object.hasOwn(DEPARTMENT_ICON_COMPONENTS, icon.toLowerCase())
                ? DEPARTMENT_ICON_COMPONENTS[icon.toLowerCase()]
                : DEPARTMENT_ICON_COMPONENTS.users;
              const label = DEPARTMENT_ICONS.some((choice) => choice === icon) ? t(`icons.${icon}`) : t("icons.legacy");
              return (
                <button
                  key={icon}
                  type="button"
                  aria-label={t("selectIcon", { icon: label })}
                  title={label}
                  aria-pressed={values.icon === icon}
                  className={cn(
                    "flex aspect-square min-h-11 items-center justify-center rounded-md border p-2 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50",
                    mode === "create" && "size-11 shrink-0",
                    values.icon === icon && "border-primary bg-primary/10 ring-1 ring-primary",
                  )}
                  onClick={() => setValues({ ...values, icon })}
                >
                  <Icon className="size-5 shrink-0" style={{ color: values.color }} aria-hidden="true" />
                </button>
              );
            })}
          </div>
        </fieldset>
      </fieldset>
      {!readOnly && (
        <div className="space-y-2">
          <Button type="submit" className="w-full" disabled={!valid || pending || disabled || sourceChanged || !dirty}>
            {pending ? (
              <>
                <Loader2 className="me-2 h-4 w-4 animate-spin" aria-hidden="true" />
                {common("states.saving")}
              </>
            ) : (
              submitLabel
            )}
          </Button>
          {dirty && mode === "edit" && (
            <Button type="button" variant="ghost" className="w-full" disabled={pending} onClick={() => setDraft(null)}>
              {common("actions.reset")}
            </Button>
          )}
        </div>
      )}
    </form>
  );
}
