"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale } from "next-intl";

import { accessKeys } from "@/hooks/use-access";
import type { Perm } from "@/lib/access";
import { useApi } from "@/lib/api/client";

export const permissionKeys = {
  all: ["permissions"] as const,
  catalogue: ["permissions", "catalogue"] as const,
  assignments: ["permissions", "assignments"] as const,
  superAdmins: ["permissions", "super-admins"] as const,
  grants: (departmentId: number, history: boolean) => ["permissions", "grants", departmentId, history] as const,
};

export function usePermissionCatalogue() {
  const api = useApi();
  return useQuery({ queryKey: permissionKeys.catalogue, queryFn: () => api.permissions.catalogue(), staleTime: Infinity });
}

/** The permission's label in the current language. */
export function usePermissionLabel() {
  const locale = useLocale();
  const { data } = usePermissionCatalogue();
  return (key: Perm) => {
    const row = data?.find((p) => p.key === key);
    if (!row) return key;
    return locale === "ar" ? row.ar_label : row.label;
  };
}

export function useAssignments(enabled: boolean) {
  const api = useApi();
  return useQuery({ queryKey: permissionKeys.assignments, queryFn: () => api.permissions.assignments(), enabled });
}

export function useSuperAdmins(enabled: boolean) {
  const api = useApi();
  return useQuery({ queryKey: permissionKeys.superAdmins, queryFn: () => api.permissions.superAdmins(), enabled });
}

export function useDepartmentGrants(departmentId: number | null, history: boolean) {
  const api = useApi();
  return useQuery({
    queryKey: permissionKeys.grants(departmentId ?? 0, history),
    queryFn: () => api.permissions.grants(departmentId as number, history),
    enabled: departmentId !== null,
  });
}

/** A change to who holds what: refresh the screens and the caller's own access. */
function usePermissionMutation<T, R>(mutation: (api: ReturnType<typeof useApi>, value: T) => Promise<R>) {
  const api = useApi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (value: T) => mutation(api, value),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: permissionKeys.all });
      void queryClient.invalidateQueries({ queryKey: accessKeys.me });
    },
  });
}

export const useSetShared = () => usePermissionMutation((api, perms: Perm[]) => api.permissions.setShared(perms));
export const useSetDepartment = () =>
  usePermissionMutation((api, v: { departmentId: number; perms: Perm[] }) =>
    api.permissions.setDepartment(v.departmentId, v.perms),
  );
export const useAddSuperAdmin = () => usePermissionMutation((api, id: number) => api.permissions.addSuperAdmin(id));
export const useRemoveSuperAdmin = () =>
  usePermissionMutation((api, id: number) => api.permissions.removeSuperAdmin(id));
export const useGrant = () =>
  usePermissionMutation((api, v: { departmentId: number; memberId: number; perm: Perm }) =>
    api.permissions.grant(v.departmentId, v.memberId, v.perm),
  );
export const useRevoke = () =>
  usePermissionMutation((api, v: { departmentId: number; grantId: number }) =>
    api.permissions.revoke(v.departmentId, v.grantId),
  );
