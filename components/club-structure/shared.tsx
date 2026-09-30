"use client";

import { Building2, Plus, RefreshCw } from "lucide-react";
import { DEPARTMENT_ICON_COMPONENTS } from "@/lib/department-icons";
import { useLocale, useTranslations } from "next-intl";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ClubDepartment, ClubRole, ClubRoleKey } from "@/lib/club-structure-types";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useClubError } from "@/components/club-structure/use-club-error";
import { useIsFetching, useIsMutating } from "@tanstack/react-query";
import { clubStructureKeys, useRefreshClubStructure } from "@/hooks/use-club-structure";

export const DEPARTMENT_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#eab308",
  "#8b5cf6",
  "#ec4899",
  "#f97316",
  "#ef4444",
  "#06b6d4",
  "#14b8a6",
];
export function DepartmentPlusIcon({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={cn("relative inline-flex size-4 shrink-0", className)}>
      <Building2 className="size-full" />
      <Plus className="absolute -bottom-1 -end-1 size-2.5 rounded-sm bg-inherit" strokeWidth={3} />
    </span>
  );
}

type NamedDepartment = Pick<ClubDepartment, "name" | "ar_name"> & {
  semester_name?: string | null;
  semester_ar_name?: string | null;
};

/** The department's name in the current language - the one it had that semester, when recorded. */
export function useDepartmentName() {
  const locale = useLocale();
  return (department: NamedDepartment) =>
    locale === "ar"
      ? (department.semester_ar_name ?? department.ar_name)
      : (department.semester_name ?? department.name);
}

/** A role's display name, from the `club_roles` rows the overview returns. */
export function useRoleName(roles: ClubRole[]) {
  const locale = useLocale();
  return (key: ClubRoleKey) => {
    const role = roles.find((item) => item.key === key);
    if (!role) return key;
    return locale === "ar" ? role.ar_name : role.name;
  };
}

export function DepartmentIcon({ icon, color }: Pick<ClubDepartment, "icon" | "color">) {
  const Icon = Object.hasOwn(DEPARTMENT_ICON_COMPONENTS, icon.toLowerCase())
    ? DEPARTMENT_ICON_COMPONENTS[icon.toLowerCase()]
    : DEPARTMENT_ICON_COMPONENTS.users;
  return (
    <span
      aria-hidden="true"
      className="flex size-10 shrink-0 items-center justify-center rounded-lg text-lg"
      style={{ backgroundColor: `${color}22`, color }}
    >
      <Icon className="size-5" />
    </span>
  );
}

export function MemberAvatar({ name, small = false }: { name: string; small?: boolean }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .map((part) => Array.from(part)[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border bg-muted font-semibold",
        small ? "size-5 text-[9px]" : "size-9 text-xs",
      )}
    >
      {initials}
    </span>
  );
}

export function DepartmentTypeBadge({ type }: Pick<ClubDepartment, "type">) {
  const t = useTranslations("clubStructure");
  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full border-transparent text-[11px]",
        // Type is information, not state: specialised gets the informational
        // blue, administrative stays neutral.
        type === "administrative" ? "bg-muted text-muted-foreground" : "bg-brand-blue-soft text-brand-blue-ink",
      )}
    >
      {t(`types.${type}`)}
    </Badge>
  );
}

export function RoleBadge({ role, label }: { role: ClubRoleKey; label: string }) {
  return (
    <Badge
      variant="secondary"
      className={cn(
        "text-[11px]",
        role === "leader" && "bg-brand-blue-soft text-brand-blue-ink",
        role === "vp" && "border-border text-foreground bg-transparent",
      )}
    >
      {label}
    </Badge>
  );
}

export function QueryError({ error, retry, stale = false }: { error: Error; retry: () => void; stale?: boolean }) {
  const t = useTranslations("common");
  const club = useTranslations("clubStructure");
  const describeError = useClubError();
  return (
    <Alert variant="destructive">
      <AlertTitle>{t("errors.loadFailed")}</AlertTitle>
      <AlertDescription>
        <p>{describeError(error)}</p>
        {stale && <p>{club("staleDataHint")}</p>}
        <Button variant="outline" size="sm" onClick={retry}>
          {t("actions.retry")}
        </Button>
      </AlertDescription>
    </Alert>
  );
}

export function ClubLoading({ overview = false }: { overview?: boolean }) {
  const t = useTranslations("clubStructure");
  return (
    <div role="status" aria-label={t("loading")} className="space-y-5">
      <span className="sr-only">{t("loading")}</span>
      <div aria-hidden="true" className={cn("grid gap-4", overview && "grid-cols-2 lg:grid-cols-4")}>
        {Array.from({ length: overview ? 4 : 3 }, (_, index) => (
          <Skeleton key={index} className={overview ? "h-20" : "h-14"} />
        ))}
      </div>
      {overview && (
        <div aria-hidden="true" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      )}
    </div>
  );
}

export function ClubRefresh({ size = "sm" }: { size?: "sm" | "default" }) {
  const t = useTranslations("clubStructure");
  const fetching = useIsFetching({ queryKey: clubStructureKeys.all }) > 0;
  const saving = useIsMutating({ mutationKey: clubStructureKeys.all }) > 0;
  const refresh = useRefreshClubStructure();
  return (
    <Button
      variant="outline"
      size={size}
      aria-label={t(fetching ? "refreshing" : "refresh")}
      disabled={fetching || saving}
      onClick={() => void refresh()}
    >
      <RefreshCw aria-hidden="true" className={cn("size-4", fetching && "animate-spin motion-reduce:animate-none")} />
      <span role="status">{t(fetching ? "refreshing" : "refresh")}</span>
    </Button>
  );
}
