"use client";

import * as React from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { BadgeCheck, Building2, ChevronDown, Crown, KeyRound } from "lucide-react";

import { Plate } from "@/components/najdi";
import { SuperAdminSeal } from "@/components/pipeline/roles";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useAccess } from "@/hooks/use-access";
import { useMyAccess, usePermissionLabel } from "@/hooks/use-permissions";
import { PERM_GROUPS, type AccessDepartment, type Perm, type PermGroup } from "@/lib/access";
import { DEPARTMENT_ICON_COMPONENTS } from "@/lib/department-icons";
import { useListFormat } from "@/lib/format";
import type { MemberAccess } from "@/lib/permissions-types";
import { cn } from "@/lib/utils";

/** Leader before VP before member: the role a person is best known by. */
const ROLE_RANK: Record<string, number> = { leader: 0, vp: 1, member: 2 };

function topRole(roles: string[]) {
  return [...roles].sort((a, b) => (ROLE_RANK[a] ?? 9) - (ROLE_RANK[b] ?? 9))[0];
}

/** The department a person is best known by: where they lead, then where they are VP, then any. */
function primaryDepartment(departments: AccessDepartment[]) {
  return [...departments].sort((a, b) => (ROLE_RANK[topRole(a.roles)] ?? 9) - (ROLE_RANK[topRole(b.roles)] ?? 9))[0];
}

/**
 * Who you are in the console, on the top bar: your department and role, and
 * for a super admin the madder seal in front of it. Pressed, it opens what you
 * can do and where each permission comes from (your roster, your department,
 * your team, a grant), the same answer the backend checks against.
 */
export function IdentityBadge() {
  const t = useTranslations("roles");
  const tr = useTranslations("permissions.member.roles");
  const locale = useLocale();
  const { access } = useAccess();
  const [open, setOpen] = React.useState(false);
  if (!access?.is_staff) return null;

  const primary = primaryDepartment(access.departments);
  const departmentName = primary ? (locale === "ar" ? primary.ar_name : primary.name) : null;
  const more = access.departments.length - 1;
  const superAdmin = access.is_super_admin;
  const label = [
    superAdmin ? t("superAdmin") : null,
    departmentName ? `${departmentName} · ${tr(topRole(primary!.roles))}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("badge.open", { who: label })}
          className={cn(
            "group focus-visible:outline-ring flex h-10 min-w-0 shrink items-center gap-2 rounded-lg ps-1.5 pe-2 outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 pointer-coarse:h-11",
            "hover:bg-sunk aria-expanded:bg-sunk",
          )}
        >
          {superAdmin ? (
            <>
              <SuperAdminSeal compact className="sm:hidden" />
              <SuperAdminSeal className="max-sm:hidden" />
            </>
          ) : (
            <Plate tone="neutral" icon={Building2} size="sm" className="h-7 w-7" />
          )}
          {departmentName ? (
            <span className="flex min-w-0 flex-col text-start leading-tight max-sm:hidden">
              <bdi className="max-w-44 truncate text-[13px] font-bold">{departmentName}</bdi>
              <span className="text-ink-2 truncate text-[11.5px] font-medium">
                {tr(topRole(primary!.roles))}
                {more > 0 ? ` · ${t("badge.more", { count: more })}` : ""}
              </span>
            </span>
          ) : null}
          <ChevronDown className="text-ink-3 group-hover:text-foreground size-4 shrink-0 max-sm:hidden" aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        collisionPadding={8}
        className="w-[calc(100vw-1rem)] gap-0 overflow-hidden rounded-xl p-0 sm:w-[420px]"
      >
        <AccessCard superAdmin={superAdmin} departments={access.departments} semester={access.semester?.name ?? null} onNavigate={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  );
}

function AccessCard({
  superAdmin,
  departments,
  semester,
  onNavigate,
}: {
  superAdmin: boolean;
  departments: AccessDepartment[];
  semester: string | null;
  onNavigate: () => void;
}) {
  const t = useTranslations("roles");
  const tr = useTranslations("permissions.member.roles");
  const tg = useTranslations("permissions.member.groups");
  const locale = useLocale();
  const { canOpen, access } = useAccess();
  const mine = useMyAccess(true);
  const label = usePermissionLabel();
  const name = (d: { name: string; ar_name: string }) => (locale === "ar" ? d.ar_name : d.name);

  return (
    <div className="flex max-h-[min(36rem,80dvh)] flex-col">
      <header className="border-foreground flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex min-w-0 flex-col">
          <h2 className="font-display text-[17px] font-semibold">{t("access.title")}</h2>
          {semester ? <span className="text-ink-2 truncate text-[12.5px]">{t("access.semester", { semester })}</span> : null}
        </div>
        {superAdmin ? <SuperAdminSeal /> : null}
      </header>

      <div className="flex flex-col gap-4 overflow-y-auto overscroll-contain px-4 py-4">
        {superAdmin ? (
          <section className="bg-door-madder-soft text-door-madder-ink flex flex-col gap-1.5 rounded-lg px-3.5 py-3">
            <p className="flex items-center gap-2 text-[14px] font-bold">
              <Crown className="size-4 shrink-0" aria-hidden="true" />
              {t("access.superAdminTitle")}
            </p>
            <p className="text-[13px] leading-relaxed font-medium text-pretty">{t("access.superAdminBody")}</p>
          </section>
        ) : null}

        <section aria-labelledby="access-departments" className="flex flex-col gap-2">
          <h3 id="access-departments" className="text-ink-2 text-[12.5px] font-bold">
            {t("access.departments")}
          </h3>
          {departments.length ? (
            <ul className="flex flex-col">
              {departments.map((d) => {
                const detail = mine.data?.departments.find((x) => x.department_id === d.id);
                const Icon = (detail && DEPARTMENT_ICON_COMPONENTS[detail.icon]) || Building2;
                return (
                  <li key={d.id} className="border-rule flex min-h-12 items-center gap-3 border-b py-2 last:border-b-0">
                    <Plate tone="neutral" icon={Icon} size="sm" />
                    <bdi className="min-w-0 flex-1 truncate text-[14.5px] font-bold">{name(d)}</bdi>
                    <span className="flex shrink-0 gap-1">
                      {[...d.roles].sort((a, b) => (ROLE_RANK[a] ?? 9) - (ROLE_RANK[b] ?? 9)).map((role) => (
                        <span key={role} className="bg-sunk rounded-sm px-2 py-1 text-[12px] leading-none font-bold">
                          {tr(role)}
                        </span>
                      ))}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-ink-2 text-[13px]">{t("access.noDepartments")}</p>
          )}
        </section>

        <section aria-labelledby="access-permissions" className="flex flex-col gap-2">
          <h3 id="access-permissions" className="text-ink-2 text-[12.5px] font-bold">
            {superAdmin ? t("access.ownPermissions") : t("access.permissions")}
          </h3>
          {superAdmin ? <p className="text-ink-2 -mt-1 text-[12.5px] text-pretty">{t("access.ownPermissionsHint")}</p> : null}
          {mine.isPending ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-5 w-3/5" />
            </div>
          ) : mine.error || !mine.data ? (
            <p className="text-door-madder-ink text-[13px] font-medium">{t("access.failed")}</p>
          ) : (
            <PermissionGroups data={mine.data} label={label} groupName={(g) => tg(g)} departmentName={name} />
          )}
        </section>
      </div>

      {superAdmin && canOpen("/permissions") ? (
        <footer className="border-rule border-t px-4 py-2.5">
          <Link
            href={access?.member_id ? `/permissions?tab=member&member=${access.member_id}` : "/permissions"}
            onClick={onNavigate}
            className="text-door-indigo-ink inline-flex min-h-9 items-center gap-1.5 text-[13.5px] font-bold underline-offset-3 hover:underline"
          >
            <KeyRound className="size-4" aria-hidden="true" />
            {t("access.manage")}
          </Link>
        </footer>
      ) : null}
    </div>
  );
}

/**
 * The permissions the person holds through their roster, by group. A
 * department-scoped one names the departments it applies to; the staff basics
 * say they come with being on staff.
 */
function PermissionGroups({
  data,
  label,
  groupName,
  departmentName,
}: {
  data: MemberAccess;
  label: (perm: Perm) => string;
  groupName: (group: PermGroup) => string;
  departmentName: (d: { name: string; ar_name: string }) => string;
}) {
  const t = useTranslations("roles.access");
  const list = useListFormat();
  const where = new Map<Perm, string[]>();
  for (const perm of data.basics) where.set(perm, []);
  for (const d of data.departments) {
    for (const held of d.permissions) where.set(held.permission, [...(where.get(held.permission) ?? []), departmentName(d)]);
  }
  const several = data.departments.length > 1;
  const groups = (Object.keys(PERM_GROUPS) as PermGroup[])
    .map((group) => ({ group, perms: (PERM_GROUPS[group] as readonly Perm[]).filter((p) => where.has(p)) }))
    .filter((g) => g.perms.length);

  if (!groups.length) return <p className="text-ink-2 text-[13px]">{t("none")}</p>;

  return (
    <div className="flex flex-col gap-3">
      {groups.map(({ group, perms }) => (
        <div key={group} className="flex flex-col">
          <span className="border-rule border-b pb-1 text-[13px] font-bold">{groupName(group)}</span>
          <ul className="flex flex-col">
            {perms.map((perm) => {
              const departments = where.get(perm) ?? [];
              return (
                <li key={perm} className="flex min-h-9 items-center gap-2 py-1 text-[13.5px]">
                  <BadgeCheck className="text-door-green-ink size-4 shrink-0" aria-hidden="true" />
                  <span className="min-w-0 flex-1">{label(perm)}</span>
                  {departments.length ? (
                    several ? (
                      <bdi className="text-ink-2 shrink-0 truncate text-[12px] font-medium">{list(departments)}</bdi>
                    ) : null
                  ) : (
                    <span className="text-ink-3 shrink-0 text-[12px] font-medium">{t("basics")}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
