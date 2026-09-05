import "server-only";

import { auth } from "@clerk/nextjs/server";

import { createRequester } from "@/lib/api/request";
import { createApi, type Api } from "@/lib/api/resources";

/**
 * The API for route handlers and server components.
 *
 * The second adapter at this seam: same resources, same errors, a different
 * token source. Built per call rather than held in module state, because
 * module state on the server is shared across concurrent requests and would
 * hand one admin's token to another's request.
 */
export async function serverApi(): Promise<Api> {
  const { getToken } = await auth();
  return createApi(createRequester(getToken));
}
