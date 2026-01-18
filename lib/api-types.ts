// API Types for Score Tracker Admin

// Event types
export type LocationType = "online" | "on-site" | "none";
export type EventStatus = "announced" | "open" | "closed";

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
  name: string;
  description: string | null;
  location_type: LocationType;
  location: string;
  start_datetime: string;
  end_datetime: string;
  status: EventStatus;
  image_url: string | null;
  is_official: boolean;
  form_type: FormType;
  google_form_id: string | null;
  google_refresh_token: string | null;
  google_watch_id: string | null;
  google_responders_url: string | null;
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
export type FormType = "google" | "none";

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
  googleFormId: string | null;
  googleRespondersUrl?: string | null;
}