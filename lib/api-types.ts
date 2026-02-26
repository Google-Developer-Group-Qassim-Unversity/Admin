// API Types for Score Tracker Admin

// Event types
export type LocationType = "online" | "on-site" | "none" | "hidden";

// the event types represent the status of an event in its lifecycle
//  'draft' means the event is being created but not yet open to members
//  'open' means the event is published and members can register
//  'active' means registeration is closed but the event is ongoing and taking attendance
export type EventStatus = "draft" | "open" | "active" | "closed";

export interface Event {
  id: number;
  name: string;
  description: string | null;
  location_type: LocationType;
  location: string;
  start_datetime: string;
  end_datetime: string;
  status: EventStatus;
  image_url: string | null;
  is_official: boolean;
}

export interface CreateEventPayload {
  event: Omit<Event, 'id'> & { id: number | null };
  form_type: FormType;
  department_action_id: number;
  member_action_id: number;
  department_id: number;
}

// Action info used in event details and update payloads
// First action is always for department, second is for members
export interface EventAction {
  action_id: number;
  ar_action_name: string;
  department_id: number;
  department_ar_name: string;
}

// Event with is_official as number (0 or 1) for API compatibility
export interface EventApiPayload {
  id: number;
  name: string;
  description: string | null;
  location_type: LocationType;
  location: string;
  start_datetime: string;
  end_datetime: string;
  status: EventStatus;
  image_url: string | null;
  is_official: number; // 0 or 1
}

export interface UpdateEventPayload {
  event: EventApiPayload;
  actions: [EventAction, EventAction]; // [department_action, member_action]
}

// Extended event details returned from GET /events/{id}/details
export interface EventDetails {
  event: EventApiPayload;
  actions: [EventAction, EventAction]; // [department_action, member_action]
}

// Upload types
export interface UploadResponse {
  file: string;
}

// API Error types
export interface ApiValidationError {
  detail: Array<{
    loc: (string | number)[];
    msg: string;
    type: string;
  }>;
}

export interface ApiError {
  message: string;
  status: number;
  isValidationError?: boolean;
  isServerError?: boolean;
  isNotFound?: boolean;
}

// Response wrapper for consistent error handling
export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };

// Form types
export type FormType = "google" | "none" | "registration";

export interface Form {
  id: number;
  event_id: number;
  form_type: FormType;
  google_form_id: string | null;
  google_refresh_token: string | null;
  google_watch_id: string | null;
  google_responders_url: string | null;
  google_form_schema: JSON;
}

export interface CreateFormPayload {
  event_id: number;
  form_type: FormType;
  google_form_id?: string | null;
  google_refresh_token?: string | null;
  google_watch_id?: string | null;
  google_responders_url?: string | null;
  google_form_schema?: JSON;
}

export interface UpdateFormPayload {
  event_id: number;
  form_type: FormType;
  google_form_id: string | null;
  google_refresh_token: string | null;
  google_watch_id: string | null;
  google_responders_url: string | null;
  google_form_schema?: JSON;
}

// Client-side Google Form data (camelCase mapping of Form)
export interface GoogleFormData {
  id?: number;
  formType: FormType;
  googleFormId: string | null;
  googleRefreshToken?: string | null;
  googleRespondersUrl?: string | null;
}

// =============================================================================
// Submissions
// =============================================================================

export type Gender = "Male" | "Female";

export interface Member {
  id: number;
  name: string;
  email: string;
  phone_number: string;
  uni_id: string;
  gender: Gender;
  uni_level: number;
  uni_college: string;
}

/**
 * - "none": submission complete, no questions to fill
 * - "google": a Google Form is attached; answers are in `google_submission_value`
 * - "partial": intermediate state while user is filling; can be ignored for now
 */
export type SubmissionType = "none" | "partial" | "google";

export interface Submission {
  member: Member;
  submission_id: number;
  submitted_at: string;
  form_type: FormType;
  submission_type: SubmissionType;
  is_accepted: boolean;
  google_submission_value: string;
  event_id: number;
  form_id: number;
  google_form_id: string;
}

export interface AcceptSubmissionPayload {
  submission_id: number;
  is_accepted: boolean;
}

// =============================================================================
// Actions and Departments
// =============================================================================

export type ActionType = "composite" | "department" | "member" | "bonus";

export interface Action {
  id: number;
  action_name: string;
  ar_action_name: string;
  action_type: ActionType;
  action_description: string;
  points: number;
}

export interface ActionWithUsage {
  id: number;
  action_name: string;
  ar_action_name: string;
  action_type: ActionType;
  points: number;
  usage_count: number;
}

export interface CreateActionPayload {
  action_name: string;
  ar_action_name: string;
  action_type: ActionType;
  points: number;
}

export interface UpdateActionPayload {
  action_name?: string;
  ar_action_name?: string;
  action_type?: ActionType;
  points?: number;
}

export interface ActionsResponse {
  composite_actions: Action[][];
  department_actions: Action[];
  member_actions: Action[];
  custom_actions: Action[];
}

/** Grouped actions for the reason selector in custom points UI */
export interface GroupedActions {
  department: Action[];
  member: Action[];
  bonus: Action[];
}

export interface Department {
  id: number;
  name: string;
  ar_name: string;
  type: "administrative" | "practical";
}

// =============================================================================
// Member Roles (Admin Management)
// =============================================================================

export type MemberRole = 'admin' | 'super_admin' | 'none';

export interface MemberWithRole extends Member {
  role: MemberRole;
}

// =============================================================================
// Custom Points (Department)
// =============================================================================

/** A single point detail row in a custom event */
export interface CustomPointDetail {
  log_id?: number;
  departments_id: number[];
  points: number;
  action_id: number | null;
  action_name: string | null;
}

/** Response from GET /custom/department/{event_id} */
export interface CustomEventDepartment {
  event_id: number;
  start_datetime: string;
  end_datetime: string;
  event_name: string;
  point_details: CustomPointDetail[];
}

/** Payload for POST /custom/departments */
export interface CreateCustomDepartmentPayload {
  start_datetime: string;
  end_datetime: string;
  event_name: string;
  location_type?: LocationType;
  point_deatils: CustomPointDetail[];
}

/** Payload for PUT /custom/department/{log_id} */
export interface UpdateCustomPointDetailPayload {
  log_id: number;
  departments_id: number[];
  points: number;
  action_id: number | null;
  action_name: string | null;
}

/** Custom action from GET /action/custom */
export interface CustomAction {
  id: number;
  action_name: string;
  points: number;
}

export type PointRowType = "department" | "member";

export interface MemberPointDetail {
  log_id?: number;
  member_ids: number[];
  points: number;
  action_id: number | null;
  action_name: string | null;
}

export interface CustomEventMember {
  event_id: number;
  start_datetime: string;
  end_datetime: string;
  event_name: string;
  point_details: MemberPointDetail[];
}

export interface CreateCustomMemberPayload {
  start_datetime: string;
  end_datetime: string;
  event_name: string;
  location_type?: LocationType;
  point_deatils: MemberPointDetail[];
}

export interface UpdateCustomMemberPointDetailPayload {
  log_id: number;
  member_ids: number[];
  points: number;
  action_id: number | null;
  action_name: string | null;
}

// =============================================================================
// Attendance
// =============================================================================

/** A single member's attendance record returned by GET /events/{id}/attendance */
export interface AttendanceRecord {
  Members: {
    id: number;
    gender: Gender;
    uni_college: string;
    updated_at: string;
    email: string;
    name: string;
    uni_id: string;
    uni_level: number;
    created_at: string;
    is_authenticated: number;
    phone_number: string;
  };
  dates: string[];
}

/** Response from GET /events/{id}/attendance */
export interface AttendanceResponse {
  attendance_count: number;
  attendance: AttendanceRecord[];
}

export type CertificateJobStatus = "pending" | "processing" | "completed" | "failed";

export interface CertificateMember {
  name: string;
  email: string;
  gender: Gender;
}

export interface CertificateJobResponse {
  job_id: string;
  event_name: string;
  folder_name: string;
  status: CertificateJobStatus;
  message: string;
}