"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, Check } from "lucide-react";

import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

/**
 * The pieces the request forms are built from, plus what submit still needs.
 *
 * Missing fields only turn red after someone tries to submit: a fresh draft is
 * all blanks, and painting it red on arrival would be noise.
 */

type MissingState = {
  missing: Set<string>;
  /** True once submit was tried; until then nothing is marked. */
  shown: boolean;
};

const MissingContext = React.createContext<MissingState>({ missing: new Set(), shown: false });

export function MissingProvider({
  missing,
  shown,
  children,
}: {
  missing: string[];
  shown: boolean;
  children: React.ReactNode;
}) {
  const key = missing.join("|");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = React.useMemo(() => ({ missing: new Set(missing), shown }), [key, shown]);
  return <MissingContext.Provider value={value}>{children}</MissingContext.Provider>;
}

export function useIsMissing(name: string | undefined) {
  const { missing, shown } = React.useContext(MissingContext);
  return shown && !!name && missing.has(name);
}

/** The DOM id a field is reachable by, so the missing list can jump to it. */
export const fieldId = (name: string) => `field-${name.replace(".", "-")}`;

/** Scrolls to a field and focuses its first control. */
export function focusField(name: string) {
  const el = document.getElementById(fieldId(name));
  if (!el) return false;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  const control = el.querySelector<HTMLElement>("input, textarea, button, [tabindex]");
  window.setTimeout(() => control?.focus({ preventScroll: true }), 300);
  return true;
}

const INVALID =
  "[&_[data-slot=input]]:border-door-madder [&_[data-slot=textarea]]:border-door-madder [&_[data-slot=select-trigger]]:border-door-madder [&_[role=radiogroup]]:ring-door-madder [&_[role=radiogroup]]:ring-1";

export function Field({
  label,
  name,
  hint,
  optional,
  className,
  children,
}: {
  label: string;
  /** The key submit reports it under, e.g. `details.title`. */
  name?: string;
  hint?: string;
  optional?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const t = useTranslations("pipeline.form");
  const invalid = useIsMissing(name);
  return (
    <div id={name ? fieldId(name) : undefined} className={cn("flex scroll-mt-24 flex-col gap-1.5", invalid && INVALID, className)}>
      <Label className={cn("flex items-baseline gap-1.5 text-sm font-bold", invalid && "text-door-madder-ink")}>
        {label}
        {optional ? <span className="text-ink-2 text-xs font-medium">{t("optional")}</span> : null}
      </Label>
      {children}
      {invalid ? (
        <p className="text-door-madder-ink flex items-center gap-1 text-xs font-bold">
          <AlertCircle className="size-3.5 shrink-0" />
          {t("required")}
        </p>
      ) : hint ? (
        <p className="text-ink-2 text-xs">{hint}</p>
      ) : null}
    </div>
  );
}

/** A titled group of fields. */
export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="border-foreground flex flex-col gap-0.5 border-b pb-2">
        <h3 className="text-base font-bold">{title}</h3>
        {description ? <p className="text-ink-2 text-[13px]">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function ChoiceSelect<T extends string>({
  value,
  options,
  label,
  onChange,
  disabled,
  placeholder,
}: {
  value: T | null | undefined;
  options: readonly T[];
  label: (option: T) => string;
  onChange: (value: T) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  return (
    <Select value={value ?? ""} onValueChange={(v) => onChange(v as T)} disabled={disabled}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option} value={option}>
            {label(option)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** Two to four short choices, all visible: one tap instead of open-scroll-pick. */
export function Choice<T extends string>({
  value,
  options,
  label,
  onChange,
  disabled,
  ariaLabel,
}: {
  value: T | null | undefined;
  options: readonly T[];
  label: (option: T) => string;
  onChange: (value: T) => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <SegmentedControl
      label={ariaLabel}
      value={value ?? ""}
      onValueChange={(v) => onChange(v as T)}
      options={options.map((o) => ({ value: o, label: label(o) }))}
      disabled={disabled}
    />
  );
}

/** Yes / No as a two-way choice; `null` is "not answered yet". */
export function YesNo({
  value,
  onChange,
  disabled,
  ariaLabel,
}: {
  value: boolean | null | undefined;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  const t = useTranslations("pipeline.briefs");
  return (
    <Choice
      ariaLabel={ariaLabel}
      value={value === undefined || value === null ? null : value ? "yes" : "no"}
      options={["yes", "no"] as const}
      label={(o) => t(o)}
      onChange={(v) => onChange(v === "yes")}
      disabled={disabled}
    />
  );
}

/** Pick any number of options as toggle chips. */
export function Chips<T extends string | number>({
  values,
  options,
  label,
  onChange,
  disabled,
}: {
  values: T[] | undefined;
  options: readonly T[];
  label: (o: T) => string;
  onChange: (v: T[]) => void;
  disabled?: boolean;
}) {
  const current = values ?? [];
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = current.includes(o);
        return (
          <button
            key={String(o)}
            type="button"
            aria-pressed={on}
            disabled={disabled}
            onClick={() => onChange(on ? current.filter((x) => x !== o) : [...current, o])}
            className={cn(
              "inline-flex min-h-10 items-center gap-1.5 rounded-lg px-3.5 text-sm font-bold transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-default pointer-coarse:min-h-11",
              on
                ? "bg-foreground text-background"
                : "bg-card text-ink-2 shadow-[inset_0_0_0_1px_var(--rule)] enabled:hover:text-foreground enabled:hover:shadow-[inset_0_0_0_1px_var(--adobe)]",
              disabled && !on && "opacity-60",
            )}
          >
            {on ? <Check className="size-3.5" /> : null}
            {label(o)}
          </button>
        );
      })}
    </div>
  );
}

/**
 * Wraps a form that the viewer can read but not change. Disabled controls are
 * faded by default, which makes a submitted request hard to read; here they
 * keep full contrast and just stop looking clickable.
 */
export const READ_ONLY =
  "[&_[data-slot=input]:disabled]:opacity-100 [&_[data-slot=textarea]:disabled]:opacity-100 [&_[data-slot=select-trigger]:disabled]:opacity-100 [&_[data-slot=input]:disabled]:bg-sunk/60 [&_[data-slot=textarea]:disabled]:bg-sunk/60 [&_[data-slot=select-trigger]:disabled]:bg-sunk/60 [&_[data-slot=input]:disabled]:cursor-default [&_[data-slot=textarea]:disabled]:cursor-default [&_[role=radiogroup]]:opacity-100 [&_[data-slot=input]:disabled]:placeholder:text-transparent [&_[data-slot=textarea]:disabled]:placeholder:text-transparent";
