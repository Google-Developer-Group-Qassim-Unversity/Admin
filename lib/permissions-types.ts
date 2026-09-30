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
