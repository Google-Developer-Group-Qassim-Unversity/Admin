"use client";

import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";

import { can, canOpen, type AccessMe, type Perm } from "@/lib/access";
import { useApi } from "@/lib/api/client";

/** Same lifetime as the middleware's access cookie. */
const ACCESS_STALE_MS = 5 * 60 * 1000;

export const accessKeys = { me: ["access", "me"] as const };

/**
 * What the signed-in person can do, from the backend. While it loads, `can`
 * answers false, so nothing flashes into view that the person cannot use.
 */
export function useAccess() {
  const { isSignedIn } = useAuth();
  const api = useApi();
  const query = useQuery({
    queryKey: accessKeys.me,
    queryFn: () => api.access.me(),
    enabled: isSignedIn === true,
    staleTime: ACCESS_STALE_MS,
  });
  const access: AccessMe | undefined = query.data;
  return {
    access,
    isLoading: query.isPending,
    isSuperAdmin: access?.is_super_admin === true,
    can: (perm: Perm, departmentId?: number | null) => can(access, perm, departmentId),
    canOpen: (pathname: string) => canOpen(access, pathname),
  };
}
