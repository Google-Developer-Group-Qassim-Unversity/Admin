"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type Option = { value: string; label: React.ReactNode; icon?: LucideIcon };

/**
 * A row of mutually exclusive choices that are all visible at once - the
 * touch-friendly stand-in for a small dropdown. Renders as a radio group so
 * arrow keys and screen readers treat it as one control.
 */
export function SegmentedControl({
  label,
  value,
  onValueChange,
  options,
  disabled,
  className,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: Option[];
  disabled?: boolean;
  className?: string;
}) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: React.KeyboardEvent, index: number) {
    const rtl = getComputedStyle(e.currentTarget).direction === "rtl";
    const forward = rtl ? "ArrowLeft" : "ArrowRight";
    const back = rtl ? "ArrowRight" : "ArrowLeft";
    let next = -1;
    if (e.key === forward || e.key === "ArrowDown") next = (index + 1) % options.length;
    if (e.key === back || e.key === "ArrowUp") next = (index - 1 + options.length) % options.length;
    if (next < 0) return;
    e.preventDefault();
    onValueChange(options[next].value);
    refs.current[next]?.focus();
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("bg-mortar flex w-full gap-1 rounded-lg p-1", disabled && "opacity-60", className)}
    >
      {options.map((option, index) => {
        const selected = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            disabled={disabled}
            onClick={() => onValueChange(option.value)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              "focus-visible:outline-ring flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-sm px-3 text-sm font-bold transition-[background-color,color] outline-none focus-visible:outline-2 focus-visible:outline-offset-2",
              selected ? "bg-foreground text-background" : "bg-card text-ink-2 hover:text-foreground",
            )}
          >
            {Icon ? <Icon className="size-4 shrink-0" /> : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
