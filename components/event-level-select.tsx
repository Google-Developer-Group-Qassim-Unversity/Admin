"use client";

import { useTranslations } from "next-intl";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EVENT_LEVELS, type EventLevel } from "@/lib/api-types";

interface EventLevelSelectProps {
  id?: string;
  value: EventLevel;
  onChange: (level: EventLevel) => void;
}

/** Beginner / intermediate / advanced. New events start as beginner. */
export function EventLevelSelect({ id, value, onChange }: EventLevelSelectProps) {
  const t = useTranslations("eventLevels");
  return (
    <Select value={value} onValueChange={(v) => onChange(v as EventLevel)}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
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
