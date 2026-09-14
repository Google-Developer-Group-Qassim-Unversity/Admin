import type { Department } from "@/lib/api-types";

export type ClubRole = "president" | "leader" | "deputy" | "member";
export type LeadershipRole = "leader" | "deputy";
export type PresidentSlot = 1 | 2;

export interface ClubAssignment {
  id: number;
  member_id: number;
  department_id: number | null;
  role: ClubRole;
  president_slot: PresidentSlot | null;
  starts_at: string;
  ends_at: string | null;
  changed_by: string;
  ended_by: string | null;
  member: { id: number; name: string };
}

export interface ClubDepartment extends Department {
  active: boolean;
  color: string;
  icon: string;
  leadership_enabled: boolean;
  created_at: string | null;
  updated_at: string;
}

export interface ClubDepartmentCard extends ClubDepartment {
  member_count: number;
  leader: ClubAssignment | null;
  deputy: ClubAssignment | null;
}

export interface ClubOverview {
  departments: ClubDepartmentCard[];
  presidents: { slot: PresidentSlot; assignment: ClubAssignment | null }[];
  total_members: number;
}

export type DepartmentSettings = Pick<ClubDepartment, "name" | "ar_name" | "type" | "color" | "icon">;

export interface ReplaceClubAssignment {
  member_id: number | null;
  expected_assignment_id: number | null;
}
