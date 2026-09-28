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

export type CalendarDayStatus = "locked" | "banned" | "open" | "held" | "booked" | "published";

export interface CalendarDayRequest {
  id: number;
  department: PipelineDepartment;
  title: string | null;
  stage: string;
}

export interface CalendarDay {
  date: string;
  status: CalendarDayStatus;
  reason: string | null;
  /** Requests holding or booking this day. Present from the booking PR on. */
  requests?: CalendarDayRequest[];
}

export interface PipelineCalendar {
  today: string;
  first_bookable_date: string;
  days: CalendarDay[];
}

export type EventRequestStage = "draft" | "in_review" | "returned" | "media" | "ready" | "published" | "cancelled";
export type DayMode = "on_site" | "online";
export type EventType = "course" | "bootcamp" | "meetup" | "workshop" | "competition";
export type Audience = "male" | "female" | "mixed" | "none";
export type Registration = "acceptance" | "open" | "none";
export type LocationScope = "inside" | "outside";

export const EVENT_TYPES: EventType[] = ["course", "bootcamp", "meetup", "workshop", "competition"];
export const AUDIENCES: Audience[] = ["male", "female", "mixed", "none"];
export const REGISTRATIONS: Registration[] = ["acceptance", "open", "none"];
export const LOCATION_SCOPES: LocationScope[] = ["inside", "outside"];

export interface EventDetails {
  title: string | null;
  description: string | null;
  event_type: EventType | null;
  presenter_name: string | null;
  presenter_email: string | null;
  day_modes: Record<string, DayMode> | null;
  daily_start_time: string | null;
  daily_end_time: string | null;
  is_official: boolean | null;
  location_scope: LocationScope | null;
  audience: Audience | null;
  registration: Registration | null;
  expected_accepted: number | null;
  help_needed: string | null;
}

export type UpdateDetailsInput = Partial<EventDetails> & { partner_department_ids?: number[] };

export interface EventRequestSummary {
  id: number;
  department: PipelineDepartment;
  stage: EventRequestStage;
  title: string | null;
  start_date: string | null;
  end_date: string | null;
  hold_expires_at: string | null;
  undated_reason: "hold_expired" | "day_banned" | null;
  created_at: string;
}

export interface EventRequestDetail extends EventRequestSummary {
  created_by: { member_id: number; name: string };
  details: EventDetails;
  partners: PipelineDepartment[];
  within_official_hours: boolean | null;
  submitted_at: string | null;
  updated_at: string;
  event_id: number | null;
  can_edit: boolean;
  now: string;
}

export interface PaginatedRequests {
  items: EventRequestSummary[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
