import { parseLocalDateTime, getEffectiveDate } from "@/lib/utils";

export function getDayNumberFromEffectiveDate(dateStr: string, eventStart: Date): number {
  const date = parseLocalDateTime(dateStr);
  const effectiveDate = getEffectiveDate(date);
  const startDate = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
  const dateOnly = new Date(effectiveDate.getFullYear(), effectiveDate.getMonth(), effectiveDate.getDate());
  const diffMs = dateOnly.getTime() - startDate.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
}
