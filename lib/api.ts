import type {
  ApiError,
  ApiResponse,
  Event,
  CreateEventPayload,
  UploadResponse,
  Form,
  CreateFormPayload,
  UpdateFormPayload,
  Submission,
  AcceptSubmissionPayload,
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

export async function getEvents(params?: { limit?: number; offset?: number }): Promise<ApiResponse<Event[]>> {
  const queryParams = new URLSearchParams();
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());
  
  const endpoint = queryParams.toString() ? `/events?${queryParams.toString()}` : '/events';
  return apiFetch<Event[]>(endpoint);
}

export async function getEvent(id: number | string): Promise<ApiResponse<Event>> {
  return apiFetch<Event>(`/events/${id}`);
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
  payload: Partial<Event>,
  getToken?: GetTokenFn
): Promise<ApiResponse<Event>> {
  return apiFetch<Event>(`/events/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  }, getToken);
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
// Helper to check if error requires user to contact support
// =============================================================================

export function shouldContactSupport(error: ApiError): boolean {
  return error.isValidationError === true || error.isServerError === true;
}
