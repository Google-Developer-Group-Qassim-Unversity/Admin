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
  /**
   * What is the caller's own, through their roster, as if they were not a
   * super admin. A super admin can act for every department and team; for
   * everything outside these they act on someone else's behalf.
   */
  own_department_ids: number[];
  own_teams: PipelineTeam[];
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
  /** On a banned day: the block that closed it, why, who closed it and when. */
  reason: string | null;
  block_id: string | null;
  blocked_by: PersonRef | null;
  blocked_at: string | null;
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
// "none" stays in the type so older requests still render, but is no longer offered.
export const AUDIENCES: Audience[] = ["male", "female", "mixed"];
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
  undated_reason: "hold_expired" | "day_banned" | "overridden" | null;
  requested_at: string;
  published_at: string | null;
  /** Where each team's part stands, so a row can say whose turn it is. */
  task_states: TaskState[];
}

export interface TaskState {
  team: PipelineTeam;
  status: TaskStatus;
  opened_at: string | null;
  done_at: string | null;
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
  /** Logistics only: the confirmation's fields that differ from what was requested; any makes `confirm.change_reason` required. */
  confirmation_changes: string[];
  opened_at: string | null;
  /** Who marked this team's part done, and when. */
  done_at: string | null;
  done_by: PersonRef | null;
  /** Design only: its card on the design team's Notion board, once written. */
  notion_url: string | null;
  /** A change still to be written to the card (retried by the backend). */
  notion_pending: boolean;
  /** Why the last write failed; super admins only. */
  notion_error: string | null;
}

export interface PersonRef {
  member_id: number;
  name: string;
}

/** Mirrors `PipelineHistoryAction` in Backend/app/DB/schema.py. */
export type HistoryAction =
  | "booked"
  | "redated"
  | "details_edited"
  | "brief_edited"
  | "submitted"
  | "returned"
  | "resubmitted"
  | "cancelled"
  | "confirmation_edited"
  | "dates_moved"
  | "poster_uploaded"
  | "task_done"
  | "published"
  | "hold_expired"
  | "dates_banned"
  | "penalty_grown"
  | "days_banned"
  | "days_unbanned"
  | "event_deleted"
  | "overridden"
  | "request_deleted"
  | "block_edited";

export interface HistoryItem {
  action: HistoryAction;
  at: string;
  /** Null for what the sweep did on its own. */
  actor: PersonRef | null;
  details: Record<string, unknown> | null;
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
  /** Set when the link was generated on the club's calendar: that calendar event. */
  meet_event_id: string | null;
  event_type: EventType | null;
  description: string | null;
  /** Why the confirmed event differs from the requested one; required once anything does. */
  change_reason: string | null;
}

/** Mirrors `MediaPlatform` in Backend/app/services/event_deliverables.py; `other` is named in `other_platform`. */
export type MediaPlatform = "x" | "instagram" | "tiktok" | "other";
export const MEDIA_PLATFORMS: MediaPlatform[] = ["x", "instagram", "tiktok", "other"];

/** Mirrors `MediaDeliverableV1`: where Media shared the event. All of it is optional. */
export interface MediaShares {
  platforms: MediaPlatform[];
  other_platform: string | null;
  /** The post's link on each ticked platform that has one. */
  links: Partial<Record<MediaPlatform, string>>;
}

/** The confirmation's fields Logistics can confirm differently (`CONFIRMED_FIELDS` in the backend). */
export type ConfirmedField =
  | "start_date"
  | "end_date"
  | "day_modes"
  | "daily_start_time"
  | "daily_end_time"
  | "venue"
  | "room"
  | "event_type"
  | "description";

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
  /** Who did each step, and when. Each task says who marked its part done. */
  requested_by: PersonRef;
  submitted_by: PersonRef | null;
  returned_by: PersonRef | null;
  published_by: PersonRef | null;
  cancelled_at: string | null;
  cancelled_by: PersonRef | null;
  /** Everything that happened to the request, oldest first. */
  history: HistoryItem[];
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
    /** Design uploads or replaces the poster, until the request is published. */
    can_upload_poster: boolean;
    /** Logistics can have a Google Meet link made on the club's calendar while it confirms. */
    can_generate_meet: boolean;
    /** The requesting department drops it at any stage before publish, then deletes it for good. */
    can_cancel: boolean;
    can_delete: boolean;
  };
  now: string;
}

export interface InboxItem {
  request: EventRequestSummary;
  team: PipelineTeam;
  status: TaskStatus;
  opened_at: string | null;
}

export interface RequestListParams {
  /** Only these departments; the caller must request for each. */
  departmentIds?: number[];
  stage?: EventRequestStage;
  /** `active`: still moving. `past`: published or cancelled. */
  state?: "active" | "past";
  /** A team's desk: what reached that team, from any department. */
  team?: PipelineTeam;
  /** With `team`: only the team's parts in these states. */
  teamStatuses?: Exclude<TaskStatus, "brief">[];
  page?: number;
  pageSize?: number;
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
  | "dates_changed"
  | "confirmation_changed"
  | "overridden"
  | "cancelled";

/** What happens to a request a super admin books over. */
export type BumpOutcome = "reschedule" | "cancel";

/** `GET /pipeline/overlaps`: the requests a booking would bump, and who each email goes to. */
export interface PipelineOverlaps {
  requests: { request: EventRequestSummary; recipients: PersonRef[] }[];
  /** Off: the emails go only to the super admin, as trial copies. */
  emails_live: boolean;
}

export interface PipelineNotification {
  id: string;
  kind: NotificationKind;
  department: PipelineDepartment;
  request: { id: string; title: string | null; stage: EventRequestStage };
  payload: Record<string, unknown> | null;
  created_at: string;
  read: boolean;
}

/** `mine`: the caller's own departments and teams. `club`: everything they can see (only wider for a super admin). */
export type NotificationScope = "mine" | "club";

export interface PaginatedNotifications {
  items: PipelineNotification[];
  total: number;
  unread: number;
  page: number;
  page_size: number;
  total_pages: number;
}
