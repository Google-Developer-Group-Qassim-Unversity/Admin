import type { Member } from "@/lib/api-types";

export type Tab = "mark" | "remove" | "copy" | "backfill" | "emails";

export const DISPLAY_LIMIT = 50;

export interface MemberSelectionTabProps {
  isLoading: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  availableMembers: Member[];
  totalAvailable: number;
  selectedMembers: Member[];
  onAdd: (id: number) => void;
  onRemove: (id: number) => void;
  onClearAll: () => void;
  isMultiDay: boolean;
  selectedDay: string;
  onDayChange: (day: string) => void;
  dayCount: number;
  isRemoveMode?: boolean;
}

export interface CopyTabProps {
  dayCount: number;
  sourceDay: string;
  onSourceDayChange: (day: string) => void;
  targetDay: string;
  onTargetDayChange: (day: string) => void;
  preview: { sourceCount: number };
}

export interface DaySelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayCount: number;
  onConfirm: (days: number[]) => void;
  memberCount: number;
  isSubmitting: boolean;
}

export interface ConfirmDialogState {
  open: boolean;
  title: string;
  description: string;
  items: string[];
  onConfirm: () => Promise<void>;
}

export interface BackfillSummary {
  created_count: number;
  existing_count: number;
  marked_count: number;
  already_attended_count: number;
  attendance_date: string;
}

export interface CertificateEmailLog {
  id: number;
  member_name: string;
  member_email: string;
  sent_at: string;
  from_address: string;
}

export interface EligibleMember {
  id: number;
  name: string;
  email: string;
}

export interface CertificateEligibility {
  eligible_count: number;
  eligible_members: EligibleMember[];
  sent_count: number;
}
