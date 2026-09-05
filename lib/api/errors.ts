import type { ApiError } from "@/lib/api-types";

/**
 * A failed request, as an exception.
 *
 * The old `lib/api.ts` returned `ApiResponse<T>` and left every caller to
 * unwrap it. Nearly all of them did that with `throw new Error(result.error.message)`,
 * which dropped `status`, `isNotFound` and friends on the floor - so
 * `QueryProvider`'s retry rule (`error instanceof ApiRequestError && error.isNotFound`)
 * almost never matched, and react-query retried permanent 404s three times.
 * Throwing this from the request itself is what makes that rule work.
 */
export class ApiRequestError extends Error {
  readonly status: number;
  readonly isValidationError: boolean;
  readonly isServerError: boolean;
  readonly isNotFound: boolean;

  constructor(error: ApiError) {
    super(error.message);
    this.name = "ApiRequestError";
    this.status = error.status;
    this.isValidationError = error.isValidationError ?? false;
    this.isServerError = error.isServerError ?? false;
    this.isNotFound = error.isNotFound ?? false;
  }

  /** Whether the user should be told to contact support rather than retry. */
  get shouldContactSupport(): boolean {
    return this.isValidationError || this.isServerError;
  }
}

/**
 * True for a failure the user cannot fix by retrying.
 *
 * Takes a thrown `ApiRequestError` or a bare `ApiError` object, because the
 * resources still on `lib/api.ts` hand back the latter. One function either
 * way, so a caller does not have to know which side of the migration it is on.
 */
export function shouldContactSupport(error: unknown): boolean {
  if (error instanceof ApiRequestError) {
    return error.shouldContactSupport;
  }
  if (typeof error === "object" && error !== null) {
    const { isValidationError, isServerError } = error as Partial<ApiError>;
    return isValidationError === true || isServerError === true;
  }
  return false;
}

/** The message to show for any thrown value, API error or not. */
export function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return fallback;
}
