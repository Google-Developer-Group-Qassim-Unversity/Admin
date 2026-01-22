// API Types for Score Tracker Admin

// Event types
export type LocationType = "online" | "on-site" | "none";
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
  arabic_action_name: string;
  action_type: ActionType;
  action_description: string;
  points: number;
}

export interface ActionsResponse {
  composite_actions: Action[][];
  department_actions: Action[];
  member_actions: Action[];
  custom_actions: Action[];
}

export interface Department {
  id: number;
  name: string;
  arabic_name: string;
  type: "administrative" | "practical";
}