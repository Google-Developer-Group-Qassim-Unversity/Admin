/**
 * What the signed-in person can do, as the backend's `GET /access/me` says.
 *
 * The backend decides everything (Backend/app/services/permissions). This file
 * only mirrors its permission keys and which of them are department-scoped, so
 * the app can hide what the person cannot use. A route the backend refuses is
 * refused whatever this file says.
 */

export const PERMS = [
  "admin.access",
  "events.view",
  "members.view",
  "club_structure.view",
  "events.create",
  "events.edit",
  "events.delete",
  "attendance.take",
  "attendance.backfill",
  "attendance.copy",
  "forms.manage",
  "submissions.review",
  "emails.event",
  "emails.direct",
  "emails.blast",
  "emails.logs",
  "certificates.manual",
  "points.catalogue",
  "points.custom",
  "members.create",
  "club_structure.manage_roster",
  "club_structure.manage",
  "semesters.manage",
  "permissions.grant",
  "permissions.manage",
  "pipeline.request",
  "pipeline.bans",
  "pipeline.design",
  "pipeline.logistics",
  "pipeline.media",
  "uploads",
  "cache.reset",
  "forms.admin",
  "settings.template_form",
] as const;

export type Perm = (typeof PERMS)[number];

/** Permissions that apply only to things of the department they are held for, such as its events. */
export const DEPARTMENT_SCOPED: ReadonlySet<Perm> = new Set<Perm>([
  "events.create",
  "events.edit",
  "events.delete",
  "attendance.take",
  "attendance.backfill",
  "forms.manage",
  "submissions.review",
  "emails.event",
  "club_structure.manage_roster",
  "permissions.grant",
  "pipeline.request",
]);

/** Everyone on the current roster has these, with no assignment or grant (the backend's `STAFF_BASICS`). */
export const STAFF_BASICS: ReadonlySet<Perm> = new Set<Perm>([
  "admin.access",
  "events.view",
  "club_structure.view",
  "uploads",
]);

/** How the permissions screens group the keys. A key missing here lands in "system". */
export const PERM_GROUPS = {
  basics: ["admin.access", "events.view", "members.view", "club_structure.view", "uploads"],
  events: [
    "events.create",
    "events.edit",
    "events.delete",
    "attendance.take",
    "attendance.backfill",
    "attendance.copy",
    "forms.manage",
    "submissions.review",
  ],
  emails: ["emails.event", "emails.direct", "emails.blast", "emails.logs", "certificates.manual"],
  points: ["points.catalogue", "points.custom"],
  people: [
    "members.create",
    "club_structure.manage_roster",
    "club_structure.manage",
    "semesters.manage",
    "permissions.grant",
    "permissions.manage",
  ],
  pipeline: [
    "pipeline.request",
    "pipeline.bans",
    "pipeline.design",
    "pipeline.logistics",
    "pipeline.media",
  ],
  system: ["cache.reset", "forms.admin", "settings.template_form"],
} satisfies Record<string, Perm[]>;

export type PermGroup = keyof typeof PERM_GROUPS;

export interface AccessDepartment {
  id: number;
  name: string;
  ar_name: string;
  roles: string[];
  /** The department-scoped permissions the person has for this department. */
  permissions: Perm[];
}

export interface AccessMe {
  member_id: number | null;
  is_staff: boolean;
  is_super_admin: boolean;
  semester: { id: string; name: string; hijri_code: number } | null;
  departments: AccessDepartment[];
  /** Every permission the person has somewhere. A super admin has them all. */
  permissions: Perm[];
}

/**
 * Whether `access` has `perm`. For a department-scoped permission, pass the
 * department the thing belongs to; without one it asks "in any department".
 */
export function can(access: AccessMe | null | undefined, perm: Perm, departmentId?: number | null): boolean {
  if (!access) return false;
  if (access.is_super_admin) return true;
  if (!access.is_staff) return false;
  if (departmentId != null && DEPARTMENT_SCOPED.has(perm)) {
    return access.departments.some((d) => d.id === departmentId && d.permissions.includes(perm));
  }
  return access.permissions.includes(perm);
}

/**
 * What each page needs, by path prefix; the longest match wins. A list means
 * any one of them (a page with tabs for different permissions). Anything not
 * listed needs only `admin.access`, which every staff member has.
 */
const ROUTE_PERMS: [prefix: string, needs: Perm[] | "super_admin"][] = [
  ["/manage-members", ["members.view"]],
  ["/permissions", ["permissions.grant", "permissions.manage"]],
  ["/manage-admins", "super_admin"],
  ["/manage-emails", ["emails.event", "emails.direct", "emails.blast", "emails.logs"]],
  ["/certificates", ["certificates.manual"]],
  ["/points/manage", ["points.catalogue"]],
  ["/points", ["points.custom", "points.catalogue"]],
  ["/club-structure/create", ["club_structure.manage"]],
  ["/club-structure", ["club_structure.view"]],
  ["/settings/semesters", ["semesters.manage"]],
  ["/events/create", ["events.create"]],
  ["/events", ["events.view"]],
  ["/pipeline", ["pipeline.request", "pipeline.bans", "pipeline.design", "pipeline.logistics", "pipeline.media"]],
];

export function routeNeeds(pathname: string): Perm[] | "super_admin" {
  let best: (typeof ROUTE_PERMS)[number] | null = null;
  for (const entry of ROUTE_PERMS) {
    const [prefix] = entry;
    if ((pathname === prefix || pathname.startsWith(`${prefix}/`)) && (!best || prefix.length > best[0].length)) {
      best = entry;
    }
  }
  return best ? best[1] : ["admin.access"];
}

export function canOpen(access: AccessMe | null | undefined, pathname: string): boolean {
  const needs = routeNeeds(pathname);
  if (needs === "super_admin") return access?.is_super_admin === true;
  return needs.some((perm) => can(access, perm));
}
