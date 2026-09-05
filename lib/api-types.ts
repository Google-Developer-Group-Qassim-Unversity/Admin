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
  /** Join link for remote events. Set from the "Google Form & Publish" tab. */
  meeting_url: string | null;
  is_official: boolean;
  created_at: string;
}

export interface CreateEventPayload {
  event: Omit<EventApiPayload, 'created_at' | 'id'> & { id: number | null };
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
  is_official: number;
  created_at?: string;
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
  url: string;
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
  uni_id: string | null;
  clerk_user_id?: string | null;
  gender: Gender;
  uni_level: number | null;
  uni_college: string | null;
  is_authenticated: number;
  created_at?: string;
  updated_at?: string;
  last_activity?: string | null;
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
  is_invited: boolean;
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
  order: number;
  is_hidden: boolean;
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
  is_hidden?: boolean;
}

export interface ReorderActionsPayload {
  action_orders: Array<{ id: number; order: number }>;
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

export type MemberRole = 'admin' | 'admin_points' | 'super_admin' | 'none';

export interface MemberWithRole extends Member {
  role: MemberRole;
}

// =============================================================================
// Member Management (Manual & Batch Create)
// =============================================================================

export interface ManualMemberCreateRequest {
  name: string;
  email: string;
  phone_number?: string;
  uni_id?: string | null;
  gender: Gender;
}

export interface CreatedMemberResponse {
  member: Member;
  already_exists: boolean;
}

export interface BatchCreateMemberItem {
  name: string;
  email: string;
  phone_number?: string;
  uni_id?: string | null;
  gender: Gender;
  uni_level?: number;
  uni_college?: string;
}

export interface BatchCreateMembersRequest {
  members: BatchCreateMemberItem[];
}

export interface BatchCreateMembersResponse {
  created_count: number;
  existing_count: number;
  failed_count: number;
  members: Member[];
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
  event_id?: number | null;
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
  event_id?: number | null;
  start_datetime: string;
  end_datetime: string;
  event_name: string;
  location_type?: LocationType;
  point_deatils: MemberPointDetail[];
}

export interface CreateCustomPointsResponse {
  event_id: number;
  message: string;
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
  Member: {
    id: number;
    gender: Gender;
    uni_college: string | null;
    updated_at: string;
    email: string;
    name: string;
    uni_id: string | null;
    uni_level: number | null;
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

/** Which shape of attendance to ask for. "me" is the caller's own record. */
export type AttendanceType = "count" | "detailed" | "me";

export type CertificateLanguage = "ar" | "en";

/** "google" sends via the default Gmail threshold-switching system; "ses" is the optional AWS SES path. */
export type EmailProvider = "google" | "ses";

export interface CertificateMember {
  name: string;
  email: string;
  gender: Gender;
}

export interface CertificateSimpleEvent {
  name: string;
  date: string;
  official: boolean;
}

export interface ManualCertificateMember {
  member_id?: number;
  member?: CertificateMember;
}

export interface ManualCertificateRequest {
  event_id?: number;
  event?: CertificateSimpleEvent;
  members: ManualCertificateMember[];
  language: CertificateLanguage;
  provider?: EmailProvider;
}

export interface ManualCertificateResponse {
  message: string;
  recipient_count: number;
  job_id?: number | null;
}

export interface SendCertificatesResponse {
  message: string;
  recipient_count: number;
  job_id?: number | null;
}

/** Response from GET /emails/certificate-event/eligible-count/{event_id} */
export interface CertificateEligibleCount {
  eligible_count: number;
  eligible_members: { id: number; name: string; email: string; gender: Gender }[];
  sent_count: number;
}

// =============================================================================
// Backfill Attendance
// =============================================================================

export interface BackfillMember {
  name: string;
  email: string;
  phone_number: string;
  uni_id?: string | null;
  gender: Gender;
  uni_level: number;
  uni_college: string;
}

export interface BackfillResponse {
  created_count: number;
  existing_count: number;
  already_attended_count: number;
  marked_count: number;
  attendance_date: string;
}

// =============================================================================
// Acceptance Blasts
// =============================================================================

export interface AcceptanceBlastResponse {
  sent_count: number;
  emails: string[];
}

export interface TestAcceptanceBlastResponse {
  sent_count: number;
  emails: string[];
}

// =============================================================================
// Custom Email
// =============================================================================

export interface EmailAttachmentInfo {
  url: string;
  filename: string;
  content_type: string;
  size?: number;
}

export interface CustomEmailRequest {
  subject: string;
  html_content: string;
  members: ManualCertificateMember[];
  attachments: EmailAttachmentInfo[];
  language: CertificateLanguage;
}

export interface CustomEmailTestRequest {
  subject: string;
  html_content: string;
  test_recipients: ManualCertificateMember[];
  attachments: EmailAttachmentInfo[];
  language: CertificateLanguage;
}

export interface CustomEmailResponse {
  message: string;
  recipient_count: number;
  job_id?: number | null;
}

export interface CustomEmailTestResponse {
  sent_count: number;
  emails: string[];
}

// =============================================================================
// Blast Emails
// =============================================================================

export type BlastOrderBy = "activity" | "alphabetical";

export interface BlastGuaranteedRecipientInput {
  member_id?: number;
  email?: string;
  name?: string;
}

export interface BlastSendRequest {
  subject: string;
  html_content: string;
  preview_text?: string;
  count: number;
  order_by: BlastOrderBy;
  guaranteed_recipients: BlastGuaranteedRecipientInput[];
  attachments: EmailAttachmentInfo[];
  provider?: EmailProvider;
}

export interface BlastSendResponse {
  message: string;
  recipient_count: number;
  guaranteed_count: number;
  algorithmic_count: number;
  job_id?: number | null;
}

export interface BlastTestRequest {
  subject: string;
  html_content: string;
  preview_text?: string;
  test_emails: string[];
  attachments: EmailAttachmentInfo[];
  provider?: EmailProvider;
}

export interface BlastTestResponse {
  sent_count: number;
  emails: string[];
}

export interface BlastEligibleCountResponse {
  eligible_count: number;
  remaining_capacity: number | null;
}

// =============================================================================
// Direct Email
// =============================================================================

export interface DirectEmailRequest {
  subject: string;
  html_content: string;
  recipients: BlastGuaranteedRecipientInput[];
  attachments: EmailAttachmentInfo[];
  provider?: EmailProvider;
}

export interface DirectEmailResponse {
  message: string;
  recipient_count: number;
  job_id?: number | null;
}

// =============================================================================
// Email Jobs
// =============================================================================

export type EmailJobStatus = "queued" | "running" | "succeeded" | "partial" | "failed";

export type EmailJobType =
  | "event-certificate"
  | "manual-certificate"
  | "custom-email"
  | "direct-email"
  | "blast";

export interface EmailJobModel {
  id: number;
  job_type: EmailJobType;
  status: EmailJobStatus;
  created_by: number;
  event_id: number | null;
  total: number;
  succeeded: number;
  failed: number;
  error: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  html_content: string;
  preview_text: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplateInput {
  name: string;
  subject: string;
  html_content: string;
  preview_text?: string;
}

// =============================================================================
// Email Logs & Dashboard
// =============================================================================

export type EmailType =
  | "event-certificate"
  | "manual-certificate"
  | "event_announcement"
  | "acceptance"
  | "blast";
export type EmailFromAddress = "info@kerneltics.com" | "gdg.qu1@gmail.com";

export interface EnrichedEmailLog {
  id: number;
  email_type: EmailType;
  from_address: EmailFromAddress;
  sent_at: string;
  sent_by: number;
  recipient_count: number;
  data: Record<string, unknown> | null;
  member_id: number | null;
  event_id: number | null;
  member_name: string | null;
  member_email: string | null;
  event_name: string | null;
  event_is_official: number | null;
  sender_name: string | null;
}

export interface EmailDashboardStats {
  addresses: Record<string, { usage: number }>;
  by_type: Record<string, number>;
  total_24h: number;
}

export interface EmailLogFilters {
  email_type?: EmailType;
  event_id?: number;
  member_id?: number;
  start_date?: string;
  end_date?: string;
}
// =============================================================================
// Semesters
// =============================================================================

export interface Semester {
  id: number;
  name: string | null;
  /** YYYY-MM-DD, the first day of the semester */
  start_date: string;
  /** YYYY-MM-DD, the last day of the semester (inclusive) */
  end_date: string;
  is_current: boolean;
  is_public: boolean;
}

export interface CreateSemesterPayload {
  id: number;
  name?: string | null;
  start_date: string;
  end_date: string;
  is_public: boolean;
  is_current: boolean;
}

export interface UpdateSemesterPayload {
  name?: string | null;
  start_date: string;
  end_date: string;
  is_public: boolean;
}
