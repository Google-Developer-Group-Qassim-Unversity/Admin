import type { Event } from "@/lib/api-types";

export interface CsvRow {
  eventName: string;
  name: string;
  email: string;
  uniId?: string;
  gender: "Male" | "Female";
  matchedEvent?: Event;
  included: boolean;
}

export interface RecipientRow {
  name: string;
  email: string;
  gender: "Male" | "Female";
  member_id?: number;
}

export interface EventFormData {
  event_id?: number;
  name: string;
  date: string;
  official: boolean;
}
