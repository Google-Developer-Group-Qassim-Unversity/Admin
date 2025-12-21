"use client";

import * as React from "react";
import { Building2, Globe } from "lucide-react";

import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface LocationToggleProps {
  value: "on-site" | "online";
  onChange: (value: "on-site" | "online") => void;
  disabled?: boolean;
  className?: string;
}

export function LocationToggle({
  value,
  onChange,
  disabled = false,
  className,
}: LocationToggleProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      onValueChange={(val) => {
        // Prevent deselection - always must have one selected
        if (val) {
          onChange(val as "on-site" | "online");
        }
      }}
      disabled={disabled}
      variant="outline"
      className={cn("justify-start", className)}
    >
      <ToggleGroupItem
        value="on-site"
        aria-label="On-site location"
        className="flex items-center gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
      >
        <Building2 className="h-4 w-4" />
        On-site
      </ToggleGroupItem>
      <ToggleGroupItem
        value="online"
        aria-label="Online/Remote"
        className="flex items-center gap-2 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
      >
        <Globe className="h-4 w-4" />
        Remote
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
