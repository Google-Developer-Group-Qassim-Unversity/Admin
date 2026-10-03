"use client";

import * as React from "react";
import Link from "next/link";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import {
  Ban,
  BadgeCheck,
  Building2,
  Crown,
  HandHeart,
  Search,
  ShieldCheck,
  UserRound,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";

import { BrandRail } from "@/components/brand-mark";
import { ClubMemberPicker } from "@/components/club-structure/member-picker";
import { MemberDetailsTrigger, memberInitials } from "@/components/member-details";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useMemberAccess, usePermissionCatalogue, usePermissionLabel } from "@/hooks/use-permissions";
import { PERM_GROUPS, type Perm, type PermGroup } from "@/lib/access";
import { DEPARTMENT_ICON_COMPONENTS } from "@/lib/department-icons";
import type { HeldPermission, MemberAccess, MemberDepartmentAccess, PermissionSource } from "@/lib/permissions-types";
import { cn } from "@/lib/utils";

/** Each "why" has one icon, used in the key and in every cell. */
const SOURCE_ICONS: Record<PermissionSource | "staff", LucideIcon> = {
  staff: BadgeCheck,
  shared: Users,
  department: Building2,
  team: Workflow,
  grant: HandHeart,
};
const SOURCE_ORDER = ["staff", "shared", "department", "team", "grant"] as const;

/** Full class strings for the member's standing - Tailwind cannot see built-up names. */
const STATUS = {
  superAdmin: { icon: Crown, pill: "bg-brand-blue-soft text-brand-blue-ink" },
  staff: { icon: ShieldCheck, pill: "bg-brand-green-soft text-brand-green-ink" },
  regular: { icon: Ban, pill: "bg-brand-red-soft text-brand-red-ink" },
} as const;

/**
 * Super admins: pick a member and see everything they can do in the admin app,
 * and why. The permissions are a table with one column per place access comes
 * from (the staff basics, then each of their departments, tinted in the
 * department's club structure colour); a mark says that column gives them the
 * permission, and its icon says why.
 */
export function MemberAccessPanel({
  memberId,
  onMemberChange,
}: {
  memberId: number | null;
  onMemberChange: (memberId: number | null) => void;
}) {
  const t = useTranslations("permissions.member");
  const [picking, setPicking] = React.useState(false);
  const access = useMemberAccess(memberId);

  const picker = picking ? (
    <ClubMemberPicker
      title={t("pickTitle")}
      excludedIds={[]}
      onSelect={(member) => {
        setPicking(false);
        onMemberChange(member.id);
      }}
      onClose={() => setPicking(false)}
    />
  ) : null;

  if (memberId === null) {
    return (
      <section className="bg-card border-border overflow-hidden rounded-xl border">
        <BrandRail />
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon" className="bg-brand-blue-soft text-brand-blue-ink">
              <UserRound />
            </EmptyMedia>
            <EmptyTitle className="font-display text-lg font-semibold tracking-tight">{t("emptyTitle")}</EmptyTitle>
            <EmptyDescription>{t("emptyHint")}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => setPicking(true)}>
              <Search />
              {t("pick")}
            </Button>
          </EmptyContent>
        </Empty>
        {picker}
      </section>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {access.isPending ? (
        <>
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-96 w-full rounded-xl" />
        </>
      ) : access.error || !access.data ? (
        <Alert variant="destructive">
          <AlertDescription className="flex items-center justify-between gap-3">
            {t("loadFailed")}
            <Button size="sm" variant="outline" onClick={() => void access.refetch()}>
              {t("retry")}
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <Summary data={access.data} onChange={() => setPicking(true)} />
          {access.data.is_super_admin ? null : access.data.is_staff ? (
            <AccessTable data={access.data} />
          ) : (
            <NoAccess />
          )}
        </>
      )}
      {picker}
    </div>
  );
}

/** "Leader", "VP", or "Member" - the officer roles when there are any. */
function useRoleLabel() {
  const t = useTranslations("permissions.member");
  return (department: MemberDepartmentAccess) => {
    const officer = department.roles.filter((r) => r === "leader" || r === "vp");
    return (officer.length > 0 ? officer : department.roles)
      .map((r) => (r === "leader" || r === "vp" || r === "member" ? t(`roles.${r}`) : r))
      .join(", ");
  };
}

function Summary({ data, onChange }: { data: MemberAccess; onChange: () => void }) {
  const t = useTranslations("permissions.member");
  const locale = useLocale();
  const format = useFormatter();
  const roleLabel = useRoleLabel();
  const total = usePermissionCatalogue().data?.length ?? data.permissions.length;
  const status = data.is_super_admin ? "superAdmin" : data.is_staff ? "staff" : "regular";
  const { icon: StatusIcon, pill } = STATUS[status];

  const through = format.list(
    data.departments.map((d) =>
      t("roleIn", { role: roleLabel(d), department: locale === "ar" ? d.ar_name : d.name }),
    ),
    { type: "conjunction" },
  );
  const sentence = data.is_super_admin
    ? t("sentence.superAdmin")
    : !data.is_staff
      ? t("sentence.regular")
      : data.departments.length > 0
        ? t("sentence.staff", { held: data.permissions.length, total, through })
        : t("sentence.staffOnly", { held: data.permissions.length, total });

  return (
    <section className="bg-card border-border overflow-hidden rounded-xl border">
      <BrandRail />
      <div className="flex items-start gap-4 p-4 sm:p-5">
        <span
          aria-hidden="true"
          className="bg-brand-blue-soft text-brand-blue-ink flex size-14 shrink-0 items-center justify-center rounded-full text-base font-semibold max-sm:size-11 max-sm:text-sm"
        >
          {memberInitials(data.member.name)}
        </span>
        <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
          <div className="flex w-full items-start justify-between gap-3">
            <MemberDetailsTrigger
              member={{ id: data.member.member_id, name: data.member.name }}
              className="font-display text-2xl leading-tight font-semibold tracking-tight wrap-anywhere max-sm:text-xl"
            />
            <Button variant="outline" size="sm" onClick={onChange} className="shrink-0">
              <Search />
              <span className="max-sm:sr-only">{t("change")}</span>
            </Button>
          </div>
          <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", pill)}>
            <StatusIcon className="h-3.5 w-3.5" />
            {status === "staff" && data.semester
              ? t("status.staff", { semester: data.semester.name })
              : t(`status.${status}`)}
          </span>
          <p className="text-muted-foreground max-w-[70ch] text-sm leading-relaxed">{sentence}</p>
        </div>
      </div>
    </section>
  );
}

function NoAccess() {
  const t = useTranslations("permissions.member");
  return (
    <section className="bg-card border-border flex flex-col items-start gap-3 rounded-xl border p-4 sm:p-5">
      <h2 className="font-display text-lg font-semibold tracking-tight">{t("noAccessTitle")}</h2>
      <p className="text-muted-foreground max-w-[70ch] text-sm leading-relaxed">{t("noAccessHint")}</p>
      <Button variant="outline" size="sm" asChild>
        <Link href="/club-structure">
          <Building2 />
          {t("openClubStructure")}
        </Link>
      </Button>
    </section>
  );
}

/** A column of the table: the staff basics, or one department. */
type Column = { key: string; department: MemberDepartmentAccess | null };

function AccessTable({ data }: { data: MemberAccess }) {
  const t = useTranslations("permissions.member");
  const locale = useLocale();
  const label = usePermissionLabel();
  const catalogue = usePermissionCatalogue();
  const roleLabel = useRoleLabel();
  const [showMissing, setShowMissing] = React.useState(false);

  const columns: Column[] = [
    ...(data.basics.length > 0 ? [{ key: "staff", department: null }] : []),
    ...data.departments.map((d) => ({ key: String(d.department_id), department: d })),
  ];
  const basics = new Set(data.basics);
  // {department id: {permission: why}}
  const held = new Map(
    data.departments.map((d) => [d.department_id, new Map(d.permissions.map((p) => [p.permission, p]))]),
  );
  const isHeld = (perm: Perm) => data.permissions.includes(perm);

  const grouped = new Set<Perm>(Object.values(PERM_GROUPS).flat());
  const ungrouped = (catalogue.data ?? []).map((p) => p.key).filter((k) => !grouped.has(k));
  const groups = (Object.entries(PERM_GROUPS) as [PermGroup, Perm[]][])
    .map(([group, keys]) => {
      const all = group === "system" ? [...keys, ...ungrouped] : keys;
      return { group, total: all.length, held: all.filter(isHeld).length, rows: showMissing ? all : all.filter(isHeld) };
    })
    .filter((g) => g.rows.length > 0);
  const used = new Set<string>([
    ...(data.basics.length > 0 ? ["staff"] : []),
    ...data.departments.flatMap((d) => d.permissions.flatMap((p) => p.sources)),
  ]);
  const name = (d: MemberDepartmentAccess) => (locale === "ar" ? d.ar_name : d.name);
  const span = columns.length + 1;

  return (
    <section className="bg-card border-border flex flex-col gap-4 rounded-xl border p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <h2 className="font-display text-lg font-semibold tracking-tight">{t("listTitle")}</h2>
          <ul className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1 text-xs" aria-label={t("legend")}>
            {SOURCE_ORDER.filter((s) => used.has(s)).map((s) => {
              const Icon = SOURCE_ICONS[s];
              return (
                <li key={s} className="flex items-center gap-1.5">
                  <Icon className="text-foreground/70 h-3.5 w-3.5" />
                  {t(`legendItems.${s}`)}
                </li>
              );
            })}
          </ul>
        </div>
        <label className="text-muted-foreground flex shrink-0 cursor-pointer items-center gap-2 text-sm">
          <Switch checked={showMissing} onCheckedChange={setShowMissing} />
          {t("showMissing")}
        </label>
      </div>

      {/* On phones the label side bleeds to the card edge, so the department columns get the room. */}
      <div className="-ms-4 overflow-x-auto sm:ms-0">
        <table className="w-full min-w-[20rem] border-separate border-spacing-0 text-sm">
          <caption className="sr-only">{t("tableCaption")}</caption>
          <thead>
            <tr>
              <th scope="col" className="sr-only">
                {t("permissionColumn")}
              </th>
              {columns.map(({ key, department }) => (
                <th
                  key={key}
                  scope="col"
                  className="w-14 rounded-t-lg px-0.5 pt-3 pb-2.5 align-bottom font-normal sm:w-28 sm:px-1"
                  style={{ backgroundColor: department ? `${department.color}14` : undefined }}
                >
                  <ColumnHead department={department} roleLabel={department ? roleLabel(department) : ""} />
                </th>
              ))}
            </tr>
          </thead>
          {groups.map(({ group, rows, held: count, total }) => (
            <tbody key={group}>
              <tr>
                <th
                  scope="colgroup"
                  colSpan={span}
                  className="border-border border-b pt-5 pb-2 text-start ps-4 sm:ps-1"
                >
                  <span className="flex items-baseline justify-between gap-3 pe-4 sm:pe-1">
                    <span className="font-semibold">{t(`groups.${group}`)}</span>
                    <span className="text-muted-foreground tabular text-xs font-normal">
                      {t("groupCount", { held: count, total })}
                    </span>
                  </span>
                </th>
              </tr>
              {rows.map((perm) => {
                const grants = data.departments.flatMap((d) => {
                  const row = held.get(d.department_id)?.get(perm);
                  return row?.sources.includes("grant") && row.granted_by ? [{ department: d, row }] : [];
                });
                return (
                  <tr key={perm} className="group/row [--row-hover:color-mix(in_oklab,var(--muted)_45%,transparent)]">
                    <th
                      scope="row"
                      className="border-border/60 group-hover/row:bg-muted/40 border-b py-2.5 text-start font-normal ps-4 pe-2 sm:ps-1"
                    >
                      <span className={cn("block font-medium", !isHeld(perm) && "text-muted-foreground font-normal")}>
                        {label(perm)}
                      </span>
                      {grants.map(({ department, row }) => (
                        <GrantNote key={department.department_id} department={name(department)} row={row} />
                      ))}
                    </th>
                    {columns.map(({ key, department }) => (
                      <td
                        key={key}
                        className="border-border/60 border-b px-1 py-2 text-center group-hover/row:[box-shadow:inset_0_0_0_999px_var(--row-hover)]"
                        style={{ backgroundColor: department ? `${department.color}14` : undefined }}
                      >
                        {department ? (
                          <Mark department={department} row={held.get(department.department_id)?.get(perm)} />
                        ) : basics.has(perm) ? (
                          <StaffMark />
                        ) : null}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          ))}
        </table>
      </div>
    </section>
  );
}

function ColumnHead({ department, roleLabel }: { department: MemberDepartmentAccess | null; roleLabel: string }) {
  const t = useTranslations("permissions.member");
  const locale = useLocale();
  if (!department) {
    return (
      <span className="flex flex-col items-center gap-1.5">
        <span aria-hidden="true" className="bg-muted text-muted-foreground flex size-8 items-center justify-center rounded-lg">
          <BadgeCheck className="h-4 w-4" />
        </span>
        <span className="text-xs leading-tight font-medium">{t("staffColumn")}</span>
      </span>
    );
  }
  const Icon = DEPARTMENT_ICON_COMPONENTS[department.icon.toLowerCase()] ?? DEPARTMENT_ICON_COMPONENTS.users;
  return (
    <span className="flex flex-col items-center gap-1.5">
      <span
        aria-hidden="true"
        className="flex size-8 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${department.color}2e`, color: department.color }}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex max-w-full flex-col leading-tight">
        <span className="truncate text-xs font-semibold">{locale === "ar" ? department.ar_name : department.name}</span>
        <span className="text-muted-foreground truncate text-[11px]">{roleLabel}</span>
      </span>
    </span>
  );
}

/** The cell where a department gives the permission: one icon per reason, in the department's colour. */
function Mark({ department, row }: { department: MemberDepartmentAccess; row: HeldPermission | undefined }) {
  const t = useTranslations("permissions.member");
  const locale = useLocale();
  if (!row) return null;
  const why = row.sources.map((s) => t(`why.${s}`)).join(", ");
  const name = locale === "ar" ? department.ar_name : department.name;
  return (
    <span
      role="img"
      aria-label={t("markLabel", { department: name, why })}
      title={t("markLabel", { department: name, why })}
      className="inline-flex items-center justify-center gap-0.5 rounded-full px-1.5 py-1"
      style={{ backgroundColor: `${department.color}33`, color: department.color }}
    >
      {row.sources.map((source) => {
        const Icon = SOURCE_ICONS[source];
        return <Icon key={source} className="h-3.5 w-3.5" strokeWidth={2.25} />;
      })}
    </span>
  );
}

function StaffMark() {
  const t = useTranslations("permissions.member");
  return (
    <span
      role="img"
      aria-label={t("legendItems.staff")}
      title={t("legendItems.staff")}
      className="bg-muted text-muted-foreground inline-flex rounded-full p-1"
    >
      <BadgeCheck className="h-3.5 w-3.5" strokeWidth={2.25} />
    </span>
  );
}

function GrantNote({ department, row }: { department: string; row: HeldPermission }) {
  const t = useTranslations("permissions.member");
  const format = useFormatter();
  if (!row.granted_by) return null;
  return (
    <span className="text-muted-foreground mt-0.5 flex items-center gap-1 text-xs">
      <HandHeart className="h-3 w-3 shrink-0" />
      <span>
        {t.rich("grantNote", {
          name: row.granted_by.name,
          department,
          date: row.granted_at ? format.dateTime(new Date(row.granted_at), { dateStyle: "medium" }) : "",
          bdi: (chunks) => <bdi>{chunks}</bdi>,
        })}
      </span>
    </span>
  );
}
