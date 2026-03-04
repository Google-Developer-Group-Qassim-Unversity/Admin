import { parseLocalDateTime, getEffectiveDate } from "@/lib/utils";
import type { Member } from "@/lib/api-types";

/**
 * Calculate the day number (1-based) for a given attendance date using effective dates.
 *
 * EFFECTIVE DATE LOGIC:
 * - Hours before ATTENDANCE_EARLY_HOURS_THRESHOLD (default 6 AM) count as the previous day
 * - This handles midnight-crossing events where late-night attendance should count as the "intended" day
 * - Example: 2 AM on Mar 3 has an effective date of Mar 2
 *
 * @param dateStr - ISO date string from attendance record
 * @param eventStart - Event start date (used as Day 1 baseline)
 * @returns 1-based day number
 */
export function getDayNumberFromEffectiveDate(dateStr: string, eventStart: Date): number {
  const date = parseLocalDateTime(dateStr);
  const effectiveDate = getEffectiveDate(date);
  const startDate = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
  const dateOnly = new Date(effectiveDate.getFullYear(), effectiveDate.getMonth(), effectiveDate.getDate());
  const diffMs = dateOnly.getTime() - startDate.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
}

/**
 * Calculate a match score for a member against search words.
 * Higher scores indicate better matches.
 * Returns -1 if no match.
 */
export function getMatchScore(member: Member, searchWords: string[]): number {
  if (searchWords.length === 0) return 0;
  const nameParts = member.name.toLowerCase().split(/\s+/);
  const uniIdLower = member.uni_id.toLowerCase();

  let score = 0;
  for (const word of searchWords) {
    let wordScore = 0;
    for (const part of nameParts) {
      if (part.startsWith(word)) wordScore = 2;
      else if (part.includes(word) && wordScore < 2) wordScore = 1;
    }
    if (wordScore === 0 && uniIdLower.includes(word)) wordScore = 1;
    if (wordScore === 0) return -1;
    score += wordScore;
  }
  return score;
}
