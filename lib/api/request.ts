import { config } from "@/lib/config";
import { ApiRequestError } from "@/lib/api/errors";

export type GetToken = () => Promise<string | null>;

export type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Serialised as JSON. Pass the object, not a string. */
  body?: unknown;
  /** Nullish entries are dropped rather than sent as "undefined". */
  query?: Record<string, QueryValue>;
}

/**
 * The three transports this app actually uses.
 *
 * They were three separate copies of the same fetch-and-normalise code in
 * `lib/api.ts`, each with its own idea of where an error message lives - which
 * is why an upload failure and a request failure did not read the same way.
 */
export interface Requester {
  /** The backend API. */
  json<T>(path: string, options?: RequestOptions): Promise<T>;
  /** The upload service, which takes multipart rather than JSON. */
  upload<T>(path: string, file: File): Promise<T>;
  /** This app's own Next route handlers, on the same origin. */
  route<T>(path: string, options?: RequestOptions): Promise<T>;
}

function buildQuery(query: Record<string, QueryValue> | undefined): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    params.append(key, String(value));
  }
  const serialised = params.toString();
  return serialised ? `?${serialised}` : "";
}

/**
 * Pull a human-readable message out of whatever the failing service returned.
 *
 * A superset of the three rules this replaces: FastAPI's `detail` (a string,
 * or the list of `{msg}` objects it sends for a 422), the upload service's
 * `message`, and the Next routes' `error`.
 */
async function failureMessage(response: Response): Promise<string> {
  try {
    const body = await response.json();
    const detail = body?.detail;
    if (Array.isArray(detail)) {
      const joined = detail.map((item: { msg?: string }) => item?.msg).filter(Boolean).join(", ");
      if (joined) return joined;
    } else if (typeof detail === "string" && detail) {
      return detail;
    }
    if (typeof body?.message === "string" && body.message) return body.message;
    if (typeof body?.error === "string" && body.error) return body.error;
  } catch {
    // Not JSON, or an empty body. Fall through to the status line.
  }
  return response.statusText || "An unexpected error occurred";
}

async function toResult<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new ApiRequestError({
      message: await failureMessage(response),
      status: response.status,
      isValidationError: response.status === 422,
      isServerError: response.status >= 500,
      isNotFound: response.status === 404,
    });
  }

  // A 204, or any empty body, has nothing to parse. `lib/api.ts` called
  // `response.json()` unconditionally, so a no-content success threw.
  if (response.status === 204 || response.headers.get("content-length") === "0") {
    return undefined as T;
  }
  return (await response.json()) as T;
}

/** Wrap a transport failure - DNS, offline, CORS - the same way as an HTTP one. */
function asNetworkError(error: unknown, fallback: string): ApiRequestError {
  if (error instanceof ApiRequestError) return error;
  return new ApiRequestError({
    message: error instanceof Error ? error.message : fallback,
    status: 0,
    isServerError: true,
  });
}

/**
 * Bind a token source to the three transports.
 *
 * The token is attached whenever one is available, including on the endpoints
 * that do not require it. Those routes ignore the header, and making it
 * unconditional removes the failure the old optional `getToken?` parameter
 * invited: forgetting to pass it type-checked cleanly and 403'd at runtime.
 */
export function createRequester(getToken: GetToken): Requester {
  async function authHeaders(): Promise<Record<string, string>> {
    const token = await getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function send<T>(url: string, options: RequestOptions, fallback: string): Promise<T> {
    try {
      const response = await fetch(url, {
        method: options.method ?? "GET",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      });
      return await toResult<T>(response);
    } catch (error) {
      throw asNetworkError(error, fallback);
    }
  }

  return {
    json<T>(path: string, options: RequestOptions = {}) {
      return send<T>(`${config.backendApiUrl}${path}${buildQuery(options.query)}`, options, "Network error occurred");
    },

    async upload<T>(path: string, file: File) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        const response = await fetch(`${config.uploadSource.replace(/\/$/, "")}${path}`, {
          method: "POST",
          headers: await authHeaders(),
          body: formData,
        });
        return await toResult<T>(response);
      } catch (error) {
        throw asNetworkError(error, "Upload error occurred");
      }
    },

    route<T>(path: string, options: RequestOptions = {}) {
      return send<T>(`${path}${buildQuery(options.query)}`, options, "Network error occurred");
    },
  };
}
