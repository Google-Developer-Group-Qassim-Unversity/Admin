/**
 * The API, as one module.
 *
 * `useApi()` in a client component, `serverApi()` in a route handler or server
 * component - two adapters over the same resources, differing only in where the
 * token comes from. Neither asks the caller for one.
 *
 * Resources migrate a group at a time. Anything still exported from
 * `lib/api.ts` has not moved, and its callers still pass `getToken` by hand;
 * that file's header has the invariant and the steps for moving the next one.
 */
export { ApiRequestError, errorMessage, shouldContactSupport } from "@/lib/api/errors";
export { createRequester, type GetToken, type Requester } from "@/lib/api/request";
export { createApi, type Api, type EventsFilters } from "@/lib/api/resources";
export { useApi } from "@/lib/api/client";
