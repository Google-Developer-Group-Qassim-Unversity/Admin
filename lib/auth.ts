import "server-only";

import { can, type AccessMe, type Perm } from "@/lib/access";
import { serverApi } from "@/lib/api/server";

/**
 * Permission checks for route handlers, from the backend's `GET /access/me`,
 * never from Clerk metadata. Each returns null when the caller is not allowed
 * (or not signed in), so a handler can answer 403.
 */

export async function serverAccess(): Promise<AccessMe | null> {
  try {
    return await (await serverApi()).access.me();
  } catch {
    return null;
  }
}

export async function requirePermission(perm: Perm): Promise<AccessMe | null> {
  const access = await serverAccess();
  return can(access, perm) ? access : null;
}

/** `perm` for one event, checked against the event's department by the backend. */
export async function requireEventPermission(perm: Perm, eventId: number): Promise<boolean> {
  try {
    const { permissions } = await (await serverApi()).access.forEvent(eventId);
    return permissions.includes(perm);
  } catch {
    return false;
  }
}
