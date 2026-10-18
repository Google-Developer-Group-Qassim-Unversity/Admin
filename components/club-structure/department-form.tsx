"use client";

import { useId, useState } from "react";
import { Building2, Code2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DEPARTMENT_COLORS } from "@/components/club-structure/shared";
import { DEPARTMENT_ICONS, DEPARTMENT_ICON_COMPONENTS } from "@/lib/department-icons";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { DepartmentSettings } from "@/lib/club-structure-types";
import { cn } from "@/lib/utils";
import { useFormDirty } from "@/lib/use-form-dirty";

const TYPE_OPTION =
  "bg-card text-ink-2 h-10 flex-1 gap-2 rounded-sm border-0 px-4 font-bold shadow-none hover:bg-card hover:text-foreground data-[state=on]:bg-foreground data-[state=on]:text-background sm:flex-none";

const EMPTY_SETTINGS: DepartmentSettings = {
  name: "",
  ar_name: "",
  type: "administrative",
  color: DEPARTMENT_COLORS[0],
  icon: "building2",
  show_in_leaderboard: true,
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
    show_in_leaderboard: initial.show_in_leaderboard,
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
        <div role="alert" className="bg-door-ochre-soft text-door-ochre-ink space-y-2 rounded-xl p-3.5 text-sm shadow-[inset_0_0_0_1px_var(--door-ochre)]">
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
            {draft && !values.name.trim() && <p className="text-door-madder-ink text-[13px]">{t("nameRequired")}</p>}
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
            {draft && !values.ar_name.trim() && <p className="text-door-madder-ink text-[13px]">{t("arabicNameRequired")}</p>}
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
            spacing={1}
            className="bg-mortar w-full justify-start gap-1 rounded-lg p-1 sm:w-fit"
            onValueChange={(type) => {
              // Like the event location toggle, keep one option selected.
              if (type === "administrative" || type === "practical") setValues({ ...values, type });
            }}
          >
            <ToggleGroupItem value="administrative" className={TYPE_OPTION}>
              <Building2 className="h-4 w-4" aria-hidden="true" />
              {t("types.administrative")}
            </ToggleGroupItem>
            <ToggleGroupItem value="practical" className={TYPE_OPTION}>
              <Code2 className="h-4 w-4" aria-hidden="true" />
              {t("types.practical")}
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
        <div className="bg-card ring-rule flex items-center justify-between gap-4 rounded-xl p-3.5 ring-1">
          <div className="space-y-0.5">
            <Label htmlFor={`${id}-leaderboard`}>{t("showInLeaderboard")}</Label>
            <p className="text-ink-2 text-[13px]">{t("showInLeaderboardHint")}</p>
          </div>
          <Switch
            id={`${id}-leaderboard`}
            checked={values.show_in_leaderboard}
            disabled={pending || readOnly || disabled}
            onCheckedChange={(checked) => setValues({ ...values, show_in_leaderboard: checked })}
          />
        </div>
        <fieldset>
          <legend className="mb-3 text-sm font-bold">{t("color")}</legend>
          <div className="flex flex-wrap gap-2">
            {DEPARTMENT_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={t("selectColor", { color })}
                aria-pressed={values.color.toLowerCase() === color}
                onClick={() => setValues({ ...values, color })}
                className={cn(
                  "plate-depth h-11 w-10 rounded-t-[4px] rounded-b-[2px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  values.color.toLowerCase() === color && "ring-foreground ring-offset-background ring-2 ring-offset-2",
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
              className="h-11 w-16 cursor-pointer p-1"
              value={values.color}
              onChange={(event) => setValues({ ...values, color: event.target.value })}
            />
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-1 text-sm font-bold">{t("icon")}</legend>
          <p className="text-ink-2 mb-3 text-[13px]">{t("iconHint")}</p>
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
                    "bg-card hover:bg-sunk flex aspect-square min-h-11 items-center justify-center rounded-lg p-2 shadow-[inset_0_0_0_1px_var(--rule)] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50",
                    mode === "create" && "size-11 shrink-0",
                    values.icon === icon && "bg-sunk shadow-[inset_0_0_0_2px_var(--foreground)]",
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
          <Button type="submit" size="lg" className="w-full" disabled={!valid || pending || disabled || sourceChanged || !dirty}>
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
