"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("locationToggle");

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
        aria-label={t("onsiteAria")}
        className="flex items-center gap-2"
      >
        <Building2 className="h-4 w-4" />
        {t("onsite")}
      </ToggleGroupItem>
      <ToggleGroupItem
        value="online"
        aria-label={t("remoteAria")}
        className="flex items-center gap-2"
      >
        <Globe className="h-4 w-4" />
        {t("remote")}
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
