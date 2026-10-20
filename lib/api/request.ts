import { config } from "@/lib/config";
import { ApiRequestError } from "@/lib/api/errors";

export type GetToken = () => Promise<string | null>;

export type QueryValue = string | number | boolean | null | undefined;

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Serialised as JSON. Pass the object, not a string. */
  body?: unknown;
  /** Nullish entries are dropped rather than sent as "undefined". A list repeats the key once per value. */
  query?: Record<string, QueryValue | readonly QueryValue[]>;
  /**
   * Opt this GET into Next's server Data Cache for this many seconds. Omit it
   * (the default) to leave the request exactly as Next treats it today - no
   * Data Cache entry, no cross-caller correctness risk. Only pass this for a
   * read whose response is the same for every admin who could call it; a
   * per-caller read must never set this.
   */
  revalidate?: number;
  /** Data Cache tags for on-demand invalidation. Only meaningful with `revalidate`. */
  tags?: string[];
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
  /** A file to a backend route, as the `file` field of a multipart form, with optional progress callback. */
  file<T>(path: string, file: File, onProgress?: (progress: number) => void): Promise<T>;
  /** This app's own Next route handlers, on the same origin. */
  route<T>(path: string, options?: RequestOptions): Promise<T>;
}

function buildQuery(query: Record<string, QueryValue | readonly QueryValue[]> | undefined): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, entry] of Object.entries(query)) {
    for (const value of Array.isArray(entry) ? entry : [entry]) {
      if (value === undefined || value === null || value === "") continue;
      params.append(key, String(value));
    }
  }
  const serialised = params.toString();
  return serialised ? `?${serialised}` : "";
}

/**
 * Pull a human-readable message out of whatever the failing service returned,
 * and the backend's machine-readable `code` when there is one.
 *
 * A superset of the three rules this replaces: FastAPI's `detail` (a string,
 * or the list of `{msg}` objects it sends for a 422), the upload service's
 * `message`, and the Next routes' `error`.
 */
async function failureDetails(response: Response): Promise<{ message: string; code?: string }> {
  const fallback = response.statusText || "An unexpected error occurred";
  try {
    const body = await response.json();
    const code = typeof body?.code === "string" && body.code ? body.code : undefined;
    const detail = body?.detail;
    if (Array.isArray(detail)) {
      const joined = detail.map((item: { msg?: string }) => item?.msg).filter(Boolean).join(", ");
      if (joined) return { message: joined, code };
    } else if (typeof detail === "string" && detail) {
      return { message: detail, code };
    }
    if (typeof body?.message === "string" && body.message) return { message: body.message, code };
    if (typeof body?.error === "string" && body.error) return { message: body.error, code };
    return { message: fallback, code };
  } catch {
    // Not JSON, or an empty body. Fall through to the status line.
  }
  return { message: fallback };
}

async function toResult<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const { message, code } = await failureDetails(response);
    throw new ApiRequestError({
      message,
      code,
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
        // Only set when a call site opts in (see RequestOptions.revalidate) -
        // otherwise leave `fetch` exactly as Next treats it by default today.
        next: options.revalidate === undefined ? undefined : { revalidate: options.revalidate, tags: options.tags },
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

    /** A file to a backend route, as the `file` field of a multipart form. */
    async file<T>(path: string, file: File, onProgress?: (progress: number) => void): Promise<T> {
      const url = `${config.backendApiUrl}${path}`;
      const token = await getToken();

      if (typeof XMLHttpRequest !== "undefined" && onProgress) {
        return new Promise<T>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          const formData = new FormData();
          formData.append("file", file);

          xhr.upload.addEventListener("progress", (event) => {
            if (event.lengthComputable && event.total > 0) {
              const percent = Math.round((event.loaded / event.total) * 100);
              onProgress(percent);
            }
          });

          xhr.addEventListener("load", () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              if (xhr.status === 204 || !xhr.responseText) {
                resolve(undefined as T);
              } else {
                try {
                  resolve(JSON.parse(xhr.responseText) as T);
                } catch {
                  resolve(undefined as T);
                }
              }
            } else {
              let message = "Upload failed";
              try {
                const body = JSON.parse(xhr.responseText);
                if (Array.isArray(body?.detail)) {
                  message = body.detail.map((i: { msg?: string }) => i?.msg).filter(Boolean).join(", ") || message;
                } else if (typeof body?.detail === "string") {
                  message = body.detail;
                } else if (typeof body?.message === "string") {
                  message = body.message;
                }
              } catch {
                // ignore
              }
              reject(
                new ApiRequestError({
                  message,
                  status: xhr.status,
                  isValidationError: xhr.status === 422,
                  isServerError: xhr.status >= 500,
                  isNotFound: xhr.status === 404,
                })
              );
            }
          });

          xhr.addEventListener("error", () => {
            reject(asNetworkError(new Error("Network error occurred during upload"), "Upload error occurred"));
          });

          xhr.addEventListener("abort", () => {
            reject(new ApiRequestError({ message: "Upload aborted", status: 0 }));
          });

          xhr.open("POST", url);
          if (token) {
            xhr.setRequestHeader("Authorization", `Bearer ${token}`);
          }
          xhr.send(formData);
        });
      }

      const formData = new FormData();
      formData.append("file", file);
      try {
        const response = await fetch(url, {
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
