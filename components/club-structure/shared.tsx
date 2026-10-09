"use client";

import { Building2, Plus, RefreshCw } from "lucide-react";
import { DEPARTMENT_ICON_COMPONENTS } from "@/lib/department-icons";
import { useLocale, useTranslations } from "next-intl";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ClubDepartment, ClubRole, ClubRoleKey } from "@/lib/club-structure-types";
import { cn } from "@/lib/utils";
import { memberInitials } from "@/components/member-details";
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

/** Whether a department colour is light enough that its plate needs dark ink. */
function isLight(hex: string) {
  const match = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
  if (!match) return false;
  const [r, g, b] = match.slice(1).map((part) => parseInt(part, 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.55;
}

/**
 * The department's own door: its colour is its identity, so it paints the
 * plate (state colours stay on marks and pills around it).
 */
export function DepartmentIcon({
  icon,
  color,
  size = "md",
}: Pick<ClubDepartment, "icon" | "color"> & { size?: "sm" | "md" | "lg" }) {
  const Icon = Object.hasOwn(DEPARTMENT_ICON_COMPONENTS, icon.toLowerCase())
    ? DEPARTMENT_ICON_COMPONENTS[icon.toLowerCase()]
    : DEPARTMENT_ICON_COMPONENTS.users;
  return (
    <span
      aria-hidden="true"
      className={cn(
        "plate-depth grid shrink-0 place-items-center rounded-t-[4px] rounded-b-[2px]",
        size === "sm" && "h-9 w-8 [&_svg]:size-4",
        size === "md" && "h-11 w-10 [&_svg]:size-[18px]",
        size === "lg" && "h-[52px] w-12 [&_svg]:size-6",
      )}
      style={{ backgroundColor: color, color: isLight(color) ? "#2b1c0c" : "#ffffff" }}
    >
      <Icon strokeWidth={1.75} />
    </span>
  );
}

/** A member's initials on a small square of plaster. */
export function MemberAvatar({ name, small = false }: { name: string; small?: boolean }) {
  const initials = memberInitials(name);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "bg-sunk text-foreground flex shrink-0 items-center justify-center rounded-[3px] font-bold shadow-[inset_0_0_0_1px_var(--rule)]",
        small ? "size-6 text-[10px]" : "size-9 text-xs",
      )}
    >
      {initials}
    </span>
  );
}

export function DepartmentTypeBadge({ type }: Pick<ClubDepartment, "type">) {
  const t = useTranslations("clubStructure");
  // Type is information, not state: specialised is informational indigo,
  // administrative stays on the wall.
  return <Badge variant={type === "administrative" ? "secondary" : "indigo"}>{t(`types.${type}`)}</Badge>;
}

/** Officer seats are ranks, not states: ink for the leader, an outline for a VP. */
export function RoleBadge({ role, label }: { role: ClubRoleKey; label: string }) {
  return <Badge variant={role === "leader" ? "default" : role === "vp" ? "outline" : "secondary"}>{label}</Badge>;
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
      {overview && <Skeleton aria-hidden="true" className="h-[74px] rounded-xl" />}
      <div aria-hidden="true" className="flex flex-col gap-2">
        {Array.from({ length: overview ? 4 : 3 }, (_, index) => (
          <div key={index} className="border-rule flex items-center gap-3 border-b py-3">
            <Skeleton className="h-11 w-10 rounded-[4px]" />
            <div className="flex flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
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
