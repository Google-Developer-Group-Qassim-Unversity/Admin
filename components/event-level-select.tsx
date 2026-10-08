"use client";

import { useTranslations } from "next-intl";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EVENT_LEVELS, type EventLevel } from "@/lib/api-types";

interface EventLevelSelectProps {
  id?: string;
  value: EventLevel | undefined;
  onChange: (level: EventLevel) => void;
  placeholder: string;
  invalid?: boolean;
  describedBy?: string;
}

/** Beginner / intermediate / advanced, for the event form and pipeline publishing. */
export function EventLevelSelect({ id, value, onChange, placeholder, invalid, describedBy }: EventLevelSelectProps) {
  const t = useTranslations("eventLevels");
  return (
    <Select value={value} onValueChange={(v) => onChange(v as EventLevel)}>
      <SelectTrigger
        id={id}
        aria-invalid={invalid}
        aria-describedby={describedBy}
        className={`w-full ${invalid ? "border-destructive" : ""}`}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {EVENT_LEVELS.map((level) => (
          <SelectItem key={level} value={level}>
            {t(level)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
