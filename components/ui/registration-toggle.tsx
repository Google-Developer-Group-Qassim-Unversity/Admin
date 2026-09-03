"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { UserCheck, Users } from "lucide-react";

import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface RegistrationToggleProps {
  /** true = members must register before attending; false = open to everyone */
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function RegistrationToggle({
  value,
  onChange,
  disabled = false,
  className,
}: RegistrationToggleProps) {
  const t = useTranslations("registrationToggle");

  return (
    <ToggleGroup
      type="single"
      value={value ? "required" : "open"}
      onValueChange={(val) => {
        // Prevent deselection - always must have one selected
        if (val) {
          onChange(val === "required");
        }
      }}
      disabled={disabled}
      variant="outline"
      className={cn("justify-start", className)}
    >
      <ToggleGroupItem
        value="required"
        aria-label={t("requiredAria")}
        className="flex items-center gap-2"
      >
        <UserCheck className="h-4 w-4" />
        {t("required")}
      </ToggleGroupItem>
      <ToggleGroupItem
        value="open"
        aria-label={t("openAria")}
        className="flex items-center gap-2"
      >
        <Users className="h-4 w-4" />
        {t("open")}
      </ToggleGroupItem>
    </ToggleGroup>
  );
}
