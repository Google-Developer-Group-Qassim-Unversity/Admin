import type { EmailLogFilters, EmailType } from "@/lib/api-types";

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

export interface CertificateData {
  member: SnapshotMember;
  event: SnapshotEvent;
}
