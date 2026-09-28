/** The events pipeline's API shapes. Mirrors `Backend/app/routers/pipeline_models.py`. */

export type PipelineTeam = "design" | "logistics" | "media";

export const PIPELINE_TEAMS: PipelineTeam[] = ["design", "logistics", "media"];

export interface PipelineDepartment {
  id: number;
  name: string;
  ar_name: string;
  color: string;
  icon: string;
}

export interface PipelineTeamEntry {
  team: PipelineTeam;
  department: PipelineDepartment;
}

export interface ActingDepartment extends PipelineDepartment {
  is_officer: boolean;
  can_grant: boolean;
  teams: PipelineTeam[];
}

export interface PipelineMe {
  member_id: number;
  name: string;
  is_super_admin: boolean;
  has_access: boolean;
  departments: ActingDepartment[];
  teams: PipelineTeamEntry[];
}

export interface PermissionPerson {
  member_id: number;
  name: string;
}

export interface PermissionOfficer extends PermissionPerson {
  role: string;
}

export interface PermissionGrant extends PermissionPerson {
  id: number;
  granted_by: PermissionPerson;
  granted_at: string;
}

export interface DepartmentPermissions {
  department: PipelineDepartment;
  can_grant: boolean;
  officers: PermissionOfficer[];
  grants: PermissionGrant[];
  candidates: PermissionPerson[];
}

export type PipelineTeamsInput = Partial<Record<PipelineTeam, number | null>>;
