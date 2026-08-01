import type { EmailLogFilters, EmailType, Event } from "@/lib/api-types";

export type { EmailLogFilters, EmailType };

export interface SnapshotMember {
  name: string;
  email: string;
  gender?: string;
}

export interface SnapshotEvent {
  name: string;
  date: string;
  official: boolean;
}

export interface AcceptanceData {
  subject: string;
  html_content: string;
  event: SnapshotEvent;
  member: Array<{ name: string; email: string }>;
}

export interface BlastData {
  subject: string;
  html_content: string;
  preview_text: string | null;
  order_by: "activity" | "alphabetical";
  requested_count: number;
  guaranteed_recipients: Array<{ name: string | null; email: string }>;
  recipients: Array<{ name: string | null; email: string }>;
  attachments: Array<{ filename: string; url: string }>;
}

export interface CertificateData {
  member: SnapshotMember;
  event: SnapshotEvent;
}

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
