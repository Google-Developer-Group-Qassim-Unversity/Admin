import type { Department } from "@/lib/api-types";

/** A role's key, from `club_roles`: "leader", "vp" and "member" today. */
export type ClubRoleKey = string;
export const MEMBER_ROLE: ClubRoleKey = "member";

export interface ClubRole {
  id: string;
  key: ClubRoleKey;
  name: string;
  ar_name: string;
  /** Default seats per department per semester; null = unlimited. */
  max_holders: number | null;
  sort_order: number;
}

export interface ClubSemester {
  id: string;
  hijri_code: number;
  gregorian_code: number;
  name: string;
  start_date: string;
  end_date: string;
}

export interface ClubMember {
  id: number;
  name: string;
}

export interface ClubDepartment extends Department {
  active: boolean;
  color: string;
  icon: string;
  show_in_leaderboard: boolean;
  /** The department whose leaders are the club's presidents. */
  is_club_leadership: boolean;
  created_at: string | null;
  updated_at: string;
}

/** Who holds one officer role (leader, VP) in a department, and how many seats it has there. */
export interface RoleSeats {
  key: ClubRoleKey;
  max_holders: number | null;
  holders: ClubMember[];
}

export interface ClubDepartmentCard extends ClubDepartment {
  /** The name the department had in this semester, when it differed from today's. */
  semester_name: string | null;
  semester_ar_name: string | null;
  member_count: number;
  roles: RoleSeats[];
}

export interface ClubOverview {
  semester: ClubSemester;
  departments: ClubDepartmentCard[];
  /** Active departments that are not part of this semester yet. */
  available_departments: Pick<ClubDepartment, "id" | "name" | "ar_name">[];
  roles: ClubRole[];
  total_members: number;
}

/** One person on a roster, with every role they hold in that department. */
export interface RosterEntry {
  member: ClubMember;
  roles: ClubRoleKey[];
  added_at: string;
}

export interface ClubMembership {
  id: string;
  semester_id: string;
  department_id: number;
  member_id: number;
  role_id: string;
  created_by: string;
  created_at: string;
}

export type DepartmentSettings = Pick<
  ClubDepartment,
  "name" | "ar_name" | "type" | "color" | "icon" | "show_in_leaderboard"
>;
