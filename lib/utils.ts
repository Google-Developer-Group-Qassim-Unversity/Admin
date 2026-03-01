import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { differenceInHours, isSameDay, addDays } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parse datetime string to Date object treating it as local/naive time
 * Strips timezone info to prevent UTC conversion
 * Backend stores times as Saudi Arabia time (UTC+3) without timezone
 * @param dateString - ISO datetime string from API
 * @returns Date object in local timezone
 */
export function parseLocalDateTime(dateString: string): Date {
  // Remove timezone info if present (Z or +HH:MM or -HH:MM)
  const cleanString = dateString.replace(/Z$|([+-]\d{2}:?\d{2})$/, '');
  // Parse as local time (treats it as naive datetime)
  return new Date(cleanString);
}

/**
 * Format Date object to naive ISO string (without timezone)
 * Treats the local browser time as Saudi Arabia time (UTC+3)
 * Example: Date object → "2026-02-01T18:00:00"
 * @param date - Date object to format
 * @returns Formatted datetime string without timezone (naive)
 */
export function formatLocalDateTime(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

/**
 * Check if an event is an overnight event (< 24 hours but spans 2 calendar days)
 * @param start - Start date
 * @param end - End date
 * @returns true if the event spans 2 calendar days but is less than 24 hours
 */
export function isOvernightEvent(start: Date | undefined, end: Date | undefined): boolean {
  if (!start || !end) return false;
  if (isSameDay(start, end)) return false;
  return differenceInHours(end, start) < 24;
}

/**
 * Get the actual number of days for an event
 * Uses floor of time difference (like Python's timedelta.days)
 * Example: Mar 2 22:00 to Mar 4 00:00 = 26 hours = 1 day + 1 = 2 days
 * @param start - Start date
 * @param end - End date
 * @returns Number of days (minimum 1)
 */
export function getEventDayCount(start: Date, end: Date): number {
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(1, diffDays + 1);
}

/**
 * Get the effective end date for display purposes
 * For multi-day events, this returns start + (dayCount - 1) days
 * Example: Mar 2 22:00 to Mar 4 00:00 (2 days) -> effective end is Mar 3
 * @param start - Start date
 * @param end - End date
 * @returns Effective end date for display
 */
export function getEffectiveEndDate(start: Date, end: Date): Date {
  const dayCount = getEventDayCount(start, end);
  return addDays(start, dayCount - 1);
}
