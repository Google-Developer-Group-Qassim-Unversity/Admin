import type { Perm } from "@/lib/access";

export interface CataloguePermission {
  key: Perm;
  scope: "club" | "dept";
  label: string;
  ar_label: string;
}

export interface PersonRef {
  member_id: number;
  name: string;
}

export interface DepartmentAssignment {
  department_id: number;
  name: string;
  ar_name: string;
  permissions: Perm[];
}

export interface Assignments {
  shared: Perm[];
  departments: DepartmentAssignment[];
}

export interface SuperAdminEntry extends PersonRef {
  added_at: string;
  added_by: PersonRef | null;
}

export interface GrantEntry {
  id: number;
  member: PersonRef;
  permission: Perm;
  granted_by: PersonRef;
  granted_at: string;
  revoked_by: PersonRef | null;
  revoked_at: string | null;
}

export interface DepartmentGrants {
  department_id: number;
  grantable: Perm[];
  members: PersonRef[];
  grants: GrantEntry[];
}

/** Why a member holds a permission in a department (see the backend's `explain_access`). */
export type PermissionSource = "shared" | "department" | "team" | "grant";

export interface HeldPermission {
  permission: Perm;
  sources: PermissionSource[];
  granted_by: PersonRef | null;
  granted_at: string | null;
}

export interface MemberDepartmentAccess {
  department_id: number;
  name: string;
  ar_name: string;
  roles: string[];
  permissions: HeldPermission[];
}

export interface MemberAccess {
  member: PersonRef;
  is_super_admin: boolean;
  is_staff: boolean;
  semester: { id: string; name: string } | null;
  basics: Perm[];
  departments: MemberDepartmentAccess[];
  permissions: Perm[];
}
