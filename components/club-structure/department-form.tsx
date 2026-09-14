"use client";

import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DEPARTMENT_COLORS, DEPARTMENT_ICONS, DepartmentIcon } from "@/components/club-structure/shared";
import type { DepartmentSettings } from "@/lib/club-structure-types";
import { cn } from "@/lib/utils";

const EMPTY_SETTINGS: DepartmentSettings = {
  name: "",
  ar_name: "",
  type: "administrative",
  color: DEPARTMENT_COLORS[0],
  icon: "◈",
};

export function DepartmentForm({
  initial = EMPTY_SETTINGS,
  pending,
  readOnly = false,
  submitLabel,
  onSubmit,
}: {
  initial?: DepartmentSettings;
  pending: boolean;
  readOnly?: boolean;
  submitLabel: string;
  onSubmit: (settings: DepartmentSettings) => void;
}) {
  const t = useTranslations("clubStructure");
  const common = useTranslations("common");
  const id = useId();
  const [values, setValues] = useState<DepartmentSettings>(() => ({
    name: initial.name,
    ar_name: initial.ar_name,
    type: initial.type,
    color: initial.color,
    icon: initial.icon,
  }));
  const valid = !!values.name.trim() && !!values.ar_name.trim() && /^#[\da-f]{6}$/i.test(values.color);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!valid || pending || readOnly) return;
        onSubmit({ ...values, name: values.name.trim(), ar_name: values.ar_name.trim() });
      }}
      className="space-y-5"
    >
      <fieldset disabled={pending || readOnly} className="space-y-5">
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
        </div>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-medium">{t("type")}</legend>
          <div className="flex flex-wrap gap-2">
            {(["administrative", "practical"] as const).map((type) => (
              <Button
                key={type}
                type="button"
                variant={values.type === type ? "default" : "outline"}
                size="sm"
                aria-pressed={values.type === type}
                onClick={() => setValues({ ...values, type })}
              >
                {t(`types.${type}`)}
              </Button>
            ))}
          </div>
        </fieldset>
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
                  "size-8 rounded-full border focus-visible:outline-ring",
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
          <div className="flex flex-wrap gap-2">
            {Array.from(new Set([...DEPARTMENT_ICONS, values.icon])).map((icon) => (
              <button
                key={icon}
                type="button"
                aria-label={t("selectIcon", { icon })}
                aria-pressed={values.icon === icon}
                className={cn("rounded-lg border", values.icon === icon && "ring-2 ring-primary")}
                onClick={() => setValues({ ...values, icon })}
              >
                <DepartmentIcon icon={icon} color={values.color} />
              </button>
            ))}
          </div>
        </fieldset>
      </fieldset>
      {!readOnly && (
        <Button type="submit" className="w-full" disabled={!valid || pending}>
          {pending ? common("states.saving") : submitLabel}
        </Button>
      )}
    </form>
  );
}
