/** The events pipeline's API shapes. Mirrors `Backend/app/routers/pipeline_models.py`. */

export type PipelineTeam = "design" | "logistics" | "media";

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

export type CalendarDayStatus = "locked" | "banned" | "open" | "held" | "booked" | "published";

export interface CalendarDayRequest {
  id: string;
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
  /** The points tier: one of the composite action pairs from `GET /actions`, set together. */
  department_action_id: number | null;
  member_action_id: number | null;
}

export type UpdateDetailsInput = Partial<EventDetails> & { partner_department_ids?: number[] };

export interface EventRequestSummary {
  id: string;
  department: PipelineDepartment;
  stage: EventRequestStage;
  title: string | null;
  start_date: string | null;
  end_date: string | null;
  hold_expires_at: string | null;
  undated_reason: "hold_expired" | "day_banned" | null;
  created_at: string;
}

export type TaskStatus = "brief" | "open" | "returned" | "done";

export interface RequestTask {
  team: PipelineTeam;
  status: TaskStatus;
  brief: Record<string, unknown> | null;
  brief_version: number | null;
  /** What the team hands over. Logistics' confirmation comes prefilled from the request until it is saved. */
  deliverable: Record<string, unknown> | null;
  /** What the team still has to hand over before it can finish: `confirm.venue`, `poster.poster_url`. */
  deliverable_missing: string[];
  opened_at: string | null;
  completed_at: string | null;
  completed_by: { member_id: number; name: string } | null;
}

export interface DesignBrief {
  design_type?: "poster" | "slides" | "posts" | "reports" | "prints" | "other";
  design_type_other?: string | null;
  size?: "square" | "landscape" | "portrait" | "other" | null;
  size_other?: string | null;
  idea?: string;
  file_type?: "png" | "jpeg" | "pdf" | "powerpoint" | "other" | null;
  file_type_other?: string | null;
  content_status?: "final" | "needs_wording";
  content?: string;
  instructions?: string | null;
  image_links?: string[];
  reference_links?: string[];
}

export interface LogisticsBrief {
  meet_link_by_logistics?: boolean | null;
  venue?: string | null;
  room?: string | null;
  services?: ("sponsorship" | "organizing" | "volunteers")[];
  venue_needs?: ("devices" | "internet" | "audio")[];
  buses_needed?: boolean | null;
  notes?: string | null;
}

/** Mirrors `LogisticsDeliverableV1` in Backend/app/services/event_deliverables.py: the event as Logistics booked it. */
export interface LogisticsConfirmation {
  start_date: string | null;
  end_date: string | null;
  day_modes: Record<string, DayMode> | null;
  daily_start_time: string | null;
  daily_end_time: string | null;
  venue: string | null;
  room: string | null;
  meet_link: string | null;
  responsible_member_id: number | null;
  event_type: EventType | null;
  description: string | null;
}

export interface PersonRef {
  member_id: number;
  name: string;
}

/** Mirrors `VENUES` in Backend/app/services/event_briefs.py - the old Logistics form's list. */
export const VENUES = [
  "مسرح شطر الطلاب (180)",
  "مسرح شطر الطالبات",
  "التيك فالي (60)",
  "قاعة بكلية البنات",
  "قاعة بكلية العيال",
  "القاعة المتوسطة بالمؤتمرات (700)",
  "القاعة الكبرى بالمؤتمرات (2200)",
  "قاعة المعرفة كلية الطلاب",
  "معمل الامن السيبراني",
  "بيت الثقافة",
];

export interface EventRequestDetail extends EventRequestSummary {
  created_by: { member_id: number; name: string };
  details: EventDetails;
  partners: PipelineDepartment[];
  within_official_hours: boolean | null;
  submitted_at: string | null;
  updated_at: string;
  event_id: number | null;
  can_edit: boolean;
  tasks: RequestTask[];
  missing: string[];
  returned_at: string | null;
  return_count: number;
  return_notes: string | null;
  return_due_at: string | null;
  return_deadline: string | null;
  penalty: { late_days: number; points: number; applied: boolean } | null;
  actions: {
    can_submit: boolean;
    can_return: boolean;
    can_resubmit: boolean;
    complete: PipelineTeam[];
    can_publish: boolean;
  };
  now: string;
}

export interface InboxItem {
  request: EventRequestSummary;
  team: PipelineTeam;
  status: TaskStatus;
  opened_at: string | null;
}

export interface PaginatedRequests {
  items: EventRequestSummary[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export type NotificationKind =
  | "request_received"
  | "dates_banned"
  | "hold_expired"
  | "returned"
  | "task_done"
  | "media_received"
  | "ready_to_publish"
  | "dates_changed";

export interface PipelineNotification {
  id: string;
  kind: NotificationKind;
  department: PipelineDepartment;
  request: { id: string; title: string | null; stage: EventRequestStage };
  payload: Record<string, unknown> | null;
  created_at: string;
  read: boolean;
}

export interface PaginatedNotifications {
  items: PipelineNotification[];
  total: number;
  unread: number;
  page: number;
  page_size: number;
  total_pages: number;
}
