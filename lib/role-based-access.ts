import type { MemberRole } from "./api-types";

export type Role = MemberRole;

export const ROLES = {
  super_admin: {
    label: "Super Admin",
    is_admin: true,
    is_super_admin: true,
    is_admin_points: true,
  },
  admin_points: {
    label: "Admin Points",
    is_admin: true,
    is_super_admin: false,
    is_admin_points: true,
  },
  admin: {
    label: "Admin",
    is_admin: true,
    is_super_admin: false,
    is_admin_points: false,
  },
  none: {
    label: "None",
    is_admin: false,
    is_super_admin: false,
    is_admin_points: false,
  },
} as const;

export const ROLE_HIERARCHY: Role[] = ["super_admin", "admin_points", "admin"];

export const ROUTE_PERMISSIONS: Record<string, Role[]> = {
  "/manage-admins": ["super_admin"],
  "/certificates": ["super_admin"],
  "/points": ["admin_points", "super_admin"],
};

export const FEATURE_PERMISSIONS: Record<string, Role[]> = {
  "attendance:copy-tab": ["super_admin"],
  "events:delete": ["super_admin"],
  "events:edit-all": ["super_admin"],
  "points:manage": ["admin_points", "super_admin"],
};

export function getRoleFromMetadata(metadata: {
  is_admin?: boolean;
  is_super_admin?: boolean;
  is_admin_points?: boolean;
}): Role {
  if (metadata.is_super_admin) return "super_admin";
  if (metadata.is_admin_points) return "admin_points";
  if (metadata.is_admin) return "admin";
  return "none";
}

export function getMetadataForRole(role: Role): {
  is_admin?: boolean;
  is_super_admin?: boolean;
  is_admin_points?: boolean;
} {
  const roleConfig = ROLES[role];
  const result: { is_admin?: boolean; is_super_admin?: boolean; is_admin_points?: boolean } = {};
  
  if (roleConfig.is_admin) result.is_admin = true;
  if (roleConfig.is_super_admin) result.is_super_admin = true;
  if (roleConfig.is_admin_points) result.is_admin_points = true;
  
  return result;
}

export function hasPermission(userRole: Role, allowedRoles: Role[]): boolean {
  return allowedRoles.includes(userRole);
}

export function hasRoutePermission(userRole: Role, pathname: string): boolean {
  for (const [route, roles] of Object.entries(ROUTE_PERMISSIONS)) {
    if (pathname.startsWith(route)) {
      return roles.includes(userRole);
    }
  }
  return userRole !== "none";
}
