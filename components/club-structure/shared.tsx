"use client";

import { RefreshCw, Users } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ClubDepartment, ClubRole } from "@/lib/club-structure-types";
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
export const DEPARTMENT_ICONS = ["users", "◈", "⬡", "◇", "◎", "△", "□", "○", "◉", "⬢"];

export function useDepartmentName() {
  const locale = useLocale();
  return (department: Pick<ClubDepartment, "name" | "ar_name">) =>
    locale === "ar" ? department.ar_name : department.name;
}

export function DepartmentIcon({ icon, color }: Pick<ClubDepartment, "icon" | "color">) {
  return (
    <span
      aria-hidden="true"
      className="flex size-10 shrink-0 items-center justify-center rounded-lg text-lg"
      style={{ backgroundColor: `${color}22`, color }}
    >
      {icon === "users" ? <Users className="size-5" /> : <span className="max-w-full truncate">{icon}</span>}
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
        "rounded-full text-[10px]",
        type === "administrative"
          ? "border-blue-500/20 bg-blue-500/10 text-blue-700 dark:text-blue-300"
          : "border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300",
      )}
    >
      {t(`types.${type}`)}
    </Badge>
  );
}

export function RoleBadge({ role }: { role: ClubRole }) {
  const t = useTranslations("clubStructure");
  return (
    <Badge
      variant="secondary"
      className={cn(
        "text-[10px]",
        role === "leader" && "bg-primary/10 text-primary",
        role === "deputy" && "bg-yellow-500/10 text-yellow-800 dark:text-yellow-300",
      )}
    >
      {t(`roles.${role}`)}
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
        <div aria-hidden="true" className="grid gap-4 sm:grid-cols-2">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
      )}
    </div>
  );
}

export function ClubRefresh() {
  const t = useTranslations("clubStructure");
  const fetching = useIsFetching({ queryKey: clubStructureKeys.all }) > 0;
  const saving = useIsMutating({ mutationKey: clubStructureKeys.all }) > 0;
  const refresh = useRefreshClubStructure();
  return (
    <Button
      variant="outline"
      size="sm"
      aria-label={t(fetching ? "refreshing" : "refresh")}
      disabled={fetching || saving}
      onClick={() => void refresh()}
    >
      <RefreshCw aria-hidden="true" className={cn("size-4", fetching && "animate-spin motion-reduce:animate-none")} />
      <span role="status">{t(fetching ? "refreshing" : "refresh")}</span>
    </Button>
  );
}
