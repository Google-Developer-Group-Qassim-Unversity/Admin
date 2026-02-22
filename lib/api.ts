import type {
  ApiError,
  ApiResponse,
  Event,
  EventStatus,
  CreateEventPayload,
  UpdateEventPayload,
  EventDetails,
  UploadResponse,
  Form,
  CreateFormPayload,
  UpdateFormPayload,
  Submission,
  AcceptSubmissionPayload,
  ActionsResponse,
  Department,
  Member,
  MemberWithRole,
  MemberRole,
  CustomEventDepartment,
  CreateCustomDepartmentPayload,
  UpdateCustomPointDetailPayload,
  CustomAction,
  AttendanceResponse,
  CustomEventMember,
  CreateCustomMemberPayload,
  UpdateCustomMemberPointDetailPayload,
} from "./api-types";

// Base API URL - configure this based on your environment
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7001";
export const UPLOAD_BASE_URL = process.env.NEXT_PUBLIC_DEV_UPLOAD_SOURCE || process.env.NEXT_PUBLIC_UPLOAD_SOURCE || API_BASE_URL;

// Type for getting auth token
type GetTokenFn = () => Promise<string | null>;

// Generic fetch wrapper with error handling
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  getToken?: GetTokenFn
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Merge existing headers
    if (options.headers) {
      const existingHeaders = options.headers as Record<string, string>;
      Object.assign(headers, existingHeaders);
    }

    // Add authorization header when a token provider is passed
    if (getToken) {
      const token = await getToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const isValidationError = response.status === 422;
      const isServerError = response.status >= 500;

      let message = "An unexpected error occurred";
      try {
        const errorData = await response.json();
        if (isValidationError && errorData.detail) {
          message = Array.isArray(errorData.detail)
            ? errorData.detail.map((d: { msg: string }) => d.msg).join(", ")
            : errorData.detail;
        } else if (errorData.message) {
          message = errorData.message;
        }
      } catch {
        message = response.statusText || message;
      }

      return {
        success: false,
        error: {
          message,
          status: response.status,
          isValidationError,
          isServerError,
        },
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    // Network or other unexpected errors
    const message =
      error instanceof Error ? error.message : "Network error occurred";
    return {
      success: false,
      error: {
        message,
        status: 0,
        isServerError: true,
      },
    };
  }
}

// File upload helper (uses FormData instead of JSON)
async function apiUpload<T>(
  endpoint: string,
  file: File,
  getToken?: GetTokenFn
): Promise<ApiResponse<T>> {
  try {
    const url = `${UPLOAD_BASE_URL}${endpoint}`;
    const formData = new FormData();
    formData.append("file", file);

    const headers: Record<string, string> = {};
    if (getToken) {
      const token = await getToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      const isValidationError = response.status === 422;
      const isServerError = response.status >= 500;

      let message = "Upload failed";
      try {
        const errorData = await response.json();
        message = errorData.message || errorData.detail || message;
      } catch {
        message = response.statusText || message;
      }

      return {
        success: false,
        error: {
          message,
          status: response.status,
          isValidationError,
          isServerError,
        },
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Upload error occurred";
    return {
      success: false,
      error: {
        message,
        status: 0,
        isServerError: true,
      },
    };
  }
}

// =============================================================================
// Events API
// =============================================================================

export async function getEvents(): Promise<ApiResponse<Event[]>> {
  return apiFetch<Event[]>('/events');
}

export async function getEvent(id: number | string): Promise<ApiResponse<Event>> {
  return apiFetch<Event>(`/events/${id}`);
}

export async function getEventDetails(
  id: number | string,
  getToken?: GetTokenFn
): Promise<ApiResponse<EventDetails>> {
  return apiFetch<EventDetails>(`/events/${id}/details`, {}, getToken);
}

export async function createEvent(
  payload: CreateEventPayload,
  getToken?: GetTokenFn
): Promise<ApiResponse<Event>> {
  return apiFetch<Event>("/events", {
    method: "POST",
    body: JSON.stringify(payload),
  }, getToken);
}

export async function updateEvent(
  id: number,
  payload: UpdateEventPayload,
  getToken?: GetTokenFn
): Promise<ApiResponse<Event>> {
  return apiFetch<Event>(`/events/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  }, getToken);
}

export async function updateEventPartial(
  id: number,
  payload: Partial<Event>,
  getToken?: GetTokenFn
): Promise<ApiResponse<Event>> {
  return apiFetch<Event>(`/events/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  }, getToken);
}

export async function updateEventStatus(
  id: number,
  status: EventStatus,
  getToken?: GetTokenFn
): Promise<ApiResponse<Event>> {
  return apiFetch<Event>(`/events/${id}/status`, {
    method: "PUT",
    body: JSON.stringify({ status }),
  }, getToken);
}

// Convenience wrappers for common status transitions
export async function publishEvent(
  id: number,
  getToken?: GetTokenFn
): Promise<ApiResponse<Event>> {
  return updateEventStatus(id, "open", getToken);
}

export async function unpublishEvent(
  id: number,
  getToken?: GetTokenFn
): Promise<ApiResponse<Event>> {
  return updateEventStatus(id, "draft", getToken);
}

export async function closeEventResponses(
  id: number,
  getToken?: GetTokenFn
): Promise<ApiResponse<Event>> {
  return updateEventStatus(id, "active", getToken);
}

export async function closeEvent(
  id: number,
  getToken?: GetTokenFn
): Promise<ApiResponse<Event>> {
  return updateEventStatus(id, "closed", getToken);
}

export async function sendEventCertificates(
  event_id: number,
  getToken?: GetTokenFn
): Promise<ApiResponse<void>> {
  return apiFetch<void>(`/certificates/${event_id}`, {
    method: "POST",
  }, getToken);
}

/**
 * Fetch attendance records for an event.
 * @param day - Day filter: "1", "2", ..., "all", or "exclusive_all"
 */
export async function getEventAttendance(
  id: number,
  day: string,
  getToken?: GetTokenFn
): Promise<ApiResponse<AttendanceResponse>> {
  return apiFetch<AttendanceResponse>(
    `/events/${id}/attendance?day=${encodeURIComponent(day)}`,
    { method: "GET" },
    getToken
  );
}

/**
 * Re-open a closed event by setting its status back to "active".
 */
export async function openEvent(
  id: number,
  getToken?: GetTokenFn
): Promise<ApiResponse<Event>> {
  return updateEventStatus(id, "active", getToken);
}

// =============================================================================
// Actions and Departments API
// =============================================================================

export async function getActions(): Promise<ApiResponse<ActionsResponse>> {
  return apiFetch<ActionsResponse>("/actions");
}

export async function getDepartments(): Promise<ApiResponse<Department[]>> {
  return apiFetch<Department[]>("/departments");
}

// =============================================================================
// Forms API
// =============================================================================

export async function createForm(
  payload: CreateFormPayload,
  getToken?: GetTokenFn
): Promise<ApiResponse<Form>> {
  return apiFetch<Form>("/forms/", {
    method: "POST",
    body: JSON.stringify(payload),
  }, getToken);
}

export async function getFormByEventId(
  eventId: number
): Promise<ApiResponse<Form>> {
  return apiFetch<Form>(`/events/${eventId}/form/`);
}

export async function updateForm(
  formId: number,
  payload: UpdateFormPayload,
  getToken?: GetTokenFn
): Promise<ApiResponse<Form>> {
  return apiFetch<Form>(`/forms/${formId}/`, {
    method: "PUT",
    body: JSON.stringify(payload),
  }, getToken);
}

export async function deleteForm(
  formId: number,
  getToken?: GetTokenFn
): Promise<ApiResponse<Form>> {
  return apiFetch<Form>(`/forms/${formId}/`, {
    method: "DELETE",
  }, getToken);
}

// =============================================================================
// Submissions API
// =============================================================================

export async function getSubmissions(
  eventId: number,
  getToken?: GetTokenFn
): Promise<ApiResponse<Submission[]>> {
  return apiFetch<Submission[]>(`/events/submissions/${eventId}`, {}, getToken);
}

export async function acceptSubmissions(
  payload: AcceptSubmissionPayload[],
  getToken?: GetTokenFn
): Promise<ApiResponse<void>> {
  return apiFetch<void>("/submissions/accept", {
    method: "PUT",
    body: JSON.stringify(payload),
  }, getToken);
}

// =============================================================================
// Upload API
// =============================================================================

export async function uploadFile(
  file: File,
  getToken?: GetTokenFn
): Promise<ApiResponse<UploadResponse>> {
  const uploadEndpoint = process.env.NEXT_PUBLIC_DEV_UPLOAD_SOURCE || process.env.NEXT_PUBLIC_UPLOAD_SOURCE 
    ? "" 
    : "/upload";
  return apiUpload<UploadResponse>(uploadEndpoint, file, getToken);
}

// =============================================================================
// Attendance API
// =============================================================================

export interface AttendanceTokenResponse {
  token: string;
  expiresAt: string;
  attendanceUrl: string;
}

export async function generateAttendanceToken(
  eventId: number,
  expirationMinutes: number,
  getToken?: GetTokenFn
): Promise<ApiResponse<AttendanceTokenResponse>> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (getToken) {
      const token = await getToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    const response = await fetch("/api/attendance/generate-token", {
      method: "POST",
      headers,
      body: JSON.stringify({ eventId, expirationMinutes }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: {
          message: errorData.error || "Failed to generate attendance token",
          status: response.status,
          isServerError: response.status >= 500,
        },
      };
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: {
        message: error instanceof Error ? error.message : "Network error occurred",
        status: 0,
        isServerError: true,
      },
    };
  }
}

export async function markAttendance(
  eventId: number,
  attendanceToken: string,
  getToken?: GetTokenFn
): Promise<ApiResponse<void>> {
  return apiFetch<void>(`/events/${eventId}/attend?token=${attendanceToken}`, {
    method: "POST",
  }, getToken);
}

// =============================================================================
// Helper to check if error requires user to contact support
// =============================================================================

export function shouldContactSupport(error: ApiError): boolean {
  return error.isValidationError === true || error.isServerError === true;
}

// =============================================================================
// Members API
// =============================================================================

export async function getMembers(
  getToken?: GetTokenFn
): Promise<ApiResponse<Member[]>> {
  return apiFetch<Member[]>("/members", {}, getToken);
}

export async function getMemberRoles(
  getToken?: GetTokenFn
): Promise<ApiResponse<MemberWithRole[]>> {
  return apiFetch<MemberWithRole[]>("/members/roles", {}, getToken);
}

export async function updateMemberRole(
  memberId: number,
  newRole: MemberRole,
  getToken?: GetTokenFn
): Promise<ApiResponse<void>> {
  return apiFetch<void>(`/members/roles?member_id=${memberId}&new_role=${newRole}`, {
    method: "POST",
  }, getToken);
}

// =============================================================================
// Custom Points API
// =============================================================================

/** Fetch all events and filter to custom events (location_type='none') */
export async function getCustomEvents(): Promise<ApiResponse<Event[]>> {
  const result = await getEvents();
  if (result.success) {
    return {
      success: true,
      data: result.data.filter((e) => e.location_type === "none" || e.location_type === "hidden"),
    };
  }
  return result;
}

/** Get custom event department details for editing */
export async function getCustomEventDepartment(
  eventId: number | string,
  getToken?: GetTokenFn
): Promise<ApiResponse<CustomEventDepartment>> {
  return apiFetch<CustomEventDepartment>(
    `/custom/departments/${eventId}`,
    {},
    getToken
  );
}

/** Create a new custom event with department point details */
export async function createCustomDepartmentPoints(
  payload: CreateCustomDepartmentPayload,
  getToken?: GetTokenFn
): Promise<ApiResponse<CustomEventDepartment>> {
  return apiFetch<CustomEventDepartment>(
    "/custom/departments",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    getToken
  );
}

/** Update a single point detail row by log_id */
export async function updateCustomPointDetail(
  logId: number,
  payload: UpdateCustomPointDetailPayload,
  getToken?: GetTokenFn
): Promise<ApiResponse<UpdateCustomPointDetailPayload>> {
  return apiFetch<UpdateCustomPointDetailPayload>(
    `/custom/departments/${logId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    getToken
  );
}

export async function getCustomEventMember(
  eventId: number | string,
  getToken?: GetTokenFn
): Promise<ApiResponse<CustomEventMember>> {
  return apiFetch<CustomEventMember>(
    `/custom/members/${eventId}`,
    {},
    getToken
  );
}

export async function createCustomMemberPoints(
  payload: CreateCustomMemberPayload,
  getToken?: GetTokenFn
): Promise<ApiResponse<CustomEventMember>> {
  return apiFetch<CustomEventMember>(
    "/custom/members",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    getToken
  );
}

export async function updateCustomMemberPointDetail(
  logId: number,
  payload: UpdateCustomMemberPointDetailPayload,
  getToken?: GetTokenFn
): Promise<ApiResponse<UpdateCustomMemberPointDetailPayload>> {
  return apiFetch<UpdateCustomMemberPointDetailPayload>(
    `/custom/members/${logId}`,
    {
      method: "PUT",
      body: JSON.stringify(payload),
    },
    getToken
  );
}


