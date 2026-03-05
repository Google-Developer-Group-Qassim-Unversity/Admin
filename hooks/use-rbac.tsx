"use client";

import { useUser } from "@clerk/nextjs";
import * as React from "react";

import {
  type Role,
  ROLES,
  FEATURE_PERMISSIONS,
  getRoleFromMetadata,
  hasPermission,
} from "@/lib/role-based-access";

export function useUserRole(): Role {
  const { user, isLoaded } = useUser();

  return React.useMemo(() => {
    if (!isLoaded || !user) return "none";

    const metadata = user.publicMetadata as {
      is_admin?: boolean;
      is_super_admin?: boolean;
      is_admin_points?: boolean;
    };

    return getRoleFromMetadata(metadata);
  }, [user, isLoaded]);
}

export function useHasFeaturePermission(feature: keyof typeof FEATURE_PERMISSIONS): boolean {
  const role = useUserRole();

  return React.useMemo(() => {
    const allowedRoles = FEATURE_PERMISSIONS[feature];
    if (!allowedRoles) return false;
    return hasPermission(role, allowedRoles as Role[]);
  }, [role, feature]);
}

export function useHasPermission(allowedRoles: Role[]): boolean {
  const role = useUserRole();
  return hasPermission(role, allowedRoles);
}

interface RequireRoleProps {
  role: Role | Role[];
  children: React.ReactNode;
}

export function RequireRole({ role, children }: RequireRoleProps): React.ReactNode {
  const userRole = useUserRole();
  const allowedRoles = Array.isArray(role) ? role : [role];

  if (hasPermission(userRole, allowedRoles)) {
    return children;
  }

  return null;
}

export function getRoleLabel(role: Role): string {
  return ROLES[role]?.label ?? role;
}

export function getRoleBadgeVariant(role: Role): "default" | "secondary" | "outline" | "destructive" {
  switch (role) {
    case "super_admin":
      return "default";
    case "admin_points":
      return "secondary";
    case "admin":
      return "outline";
    default:
      return "outline";
  }
}
