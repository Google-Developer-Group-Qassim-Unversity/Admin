import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Parse datetime string in local timezone (avoiding UTC conversion)
 * Strips timezone info from the input string if present
 * @param dateString - ISO datetime string from API
 * @returns Date object in local timezone
 */
export function parseLocalDateTime(dateString: string): Date {
  // Remove timezone info if present (Z or +HH:MM or -HH:MM)
  const cleanString = dateString.replace(/Z$|([+-]\d{2}:?\d{2})$/, '');
  // Parse as local time
  return new Date(cleanString);
}

/**
 * Format date in local timezone without UTC conversion
 * Creates ISO-like format string: YYYY-MM-DDTHH:mm:ss
 * @param date - Date object to format
 * @returns Formatted datetime string in local timezone
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
