import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { differenceInHours, isSameDay } from "date-fns"

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
