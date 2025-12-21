import type {
  ApiError,
  ApiResponse,
  Event,
  CreateEventPayload,
  CreateLocationPayload,
  UploadResponse,
} from "./api-types";

// Base API URL - configure this based on your environment
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:7001";

// Generic fetch wrapper with error handling
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
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
  file: File
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch(url, {
      method: "POST",
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
  return apiFetch<Event[]>("/events");
}

export async function createEvent(
  payload: CreateEventPayload
): Promise<ApiResponse<Event>> {
  return apiFetch<Event>("/events", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// =============================================================================
// Locations API
// =============================================================================

export async function getLocations(): Promise<ApiResponse<string[]>> {
  return apiFetch<string[]>("/events/locations");
}

export async function createLocation(
  payload: CreateLocationPayload
): Promise<ApiResponse<string>> {
  return apiFetch<string>("/events/locations", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// =============================================================================
// Upload API
// =============================================================================

export async function uploadFile(
  file: File
): Promise<ApiResponse<UploadResponse>> {
  return apiUpload<UploadResponse>("/upload", file);
}

// =============================================================================
// Helper to check if error requires user to contact support
// =============================================================================

export function shouldContactSupport(error: ApiError): boolean {
  return error.isValidationError === true || error.isServerError === true;
}
