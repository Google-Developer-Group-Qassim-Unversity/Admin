"use client";

import * as React from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import {
  Ban,
  BadgeCheck,
  Building2,
  Crown,
  HandHeart,
  Minus,
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

/** One reason a permission is held: a department and why, or `null` for the staff basics. */
type Reason = { department: MemberDepartmentAccess; held: HeldPermission } | null;

/** Each "why" has one icon, used in the legend and on every chip. */
const SOURCE_ICONS: Record<PermissionSource | "staff", LucideIcon> = {
  staff: BadgeCheck,
  shared: Users,
  department: Building2,
  team: Workflow,
  grant: HandHeart,
};

/** Full class strings for the member's standing - Tailwind cannot see built-up names. */
const STATUS = {
  superAdmin: { icon: Crown, pill: "bg-brand-blue-soft text-brand-blue-ink" },
  staff: { icon: ShieldCheck, pill: "bg-brand-green-soft text-brand-green-ink" },
  regular: { icon: Ban, pill: "bg-brand-red-soft text-brand-red-ink" },
} as const;

/**
 * Super admins: pick a member and see everything they can do in the admin app,
 * and why. Colour follows the department a permission comes from (its club
 * structure colour); the icon says why they hold it.
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
          <Skeleton className="h-36 w-full rounded-xl" />
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
          <PermissionList data={access.data} />
        </>
      )}
      {picker}
    </div>
  );
}

function Summary({ data, onChange }: { data: MemberAccess; onChange: () => void }) {
  const t = useTranslations("permissions.member");
  const total = usePermissionCatalogue().data?.length ?? data.permissions.length;
  const status = data.is_super_admin ? "superAdmin" : data.is_staff ? "staff" : "regular";
  const { icon: StatusIcon, pill } = STATUS[status];
  const held = data.is_super_admin ? total : data.permissions.length;

  return (
    <section className="bg-card border-border overflow-hidden rounded-xl border">
      <BrandRail />
      <div className="flex flex-col gap-5 p-4 sm:p-5">
        <div className="flex items-start gap-3.5">
          <span
            aria-hidden="true"
            className="bg-brand-blue-soft text-brand-blue-ink flex size-14 shrink-0 items-center justify-center rounded-full text-base font-semibold max-sm:size-12 max-sm:text-sm"
          >
            {memberInitials(data.member.name)}
          </span>
          <div className="flex min-w-0 flex-1 flex-col items-start gap-1.5">
            <MemberDetailsTrigger
              member={{ id: data.member.member_id, name: data.member.name }}
              className="font-display text-xl leading-tight font-semibold tracking-tight wrap-anywhere max-sm:text-lg"
            />
            <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium", pill)}>
              <StatusIcon className="h-3.5 w-3.5" />
              {status === "staff" && data.semester
                ? t("status.staff", { semester: data.semester.name })
                : t(`status.${status}`)}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={onChange} className="shrink-0">
            <Search />
            <span className="max-sm:sr-only">{t("change")}</span>
          </Button>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="text-muted-foreground">{t("heldLabel")}</span>
            <span className="tabular font-medium">{t("heldValue", { held, total })}</span>
          </div>
          <div
            className="bg-muted h-1.5 overflow-hidden rounded-full"
            role="meter"
            aria-label={t("heldLabel")}
            aria-valuemin={0}
            aria-valuemax={total}
            aria-valuenow={held}
          >
            <div
              className={cn("h-full rounded-full", status === "regular" ? "bg-brand-red" : "bg-brand-blue")}
              style={{ width: `${total ? Math.max((held / total) * 100, held ? 2 : 0) : 0}%` }}
            />
          </div>
        </div>

        {data.departments.length > 0 ? (
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium">{t("rolesTitle")}</h3>
            <ul className="flex flex-wrap gap-2">
              {data.departments.map((d) => (
                <DepartmentRole key={d.department_id} department={d} />
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function DepartmentRole({ department }: { department: MemberDepartmentAccess }) {
  const t = useTranslations("permissions.member");
  const locale = useLocale();
  const Icon = DEPARTMENT_ICON_COMPONENTS[department.icon.toLowerCase()] ?? DEPARTMENT_ICON_COMPONENTS.users;
  const officer = department.roles.filter((r) => r === "leader" || r === "vp");
  const roles = (officer.length > 0 ? officer : department.roles).map((r) =>
    r === "leader" || r === "vp" || r === "member" ? t(`roles.${r}`) : r,
  );

  return (
    <li
      className="flex items-center gap-2.5 rounded-lg border py-1.5 ps-1.5 pe-3"
      style={{ borderColor: `${department.color}55`, backgroundColor: `${department.color}12` }}
    >
      <span
        aria-hidden="true"
        className="flex size-7 items-center justify-center rounded-md"
        style={{ backgroundColor: `${department.color}26`, color: department.color }}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-medium">{locale === "ar" ? department.ar_name : department.name}</span>
        <span className="text-muted-foreground text-xs">{roles.join(", ")}</span>
      </span>
    </li>
  );
}

function PermissionList({ data }: { data: MemberAccess }) {
  const t = useTranslations("permissions.member");
  const label = usePermissionLabel();
  const catalogue = usePermissionCatalogue();
  const [showMissing, setShowMissing] = React.useState(false);

  // Every permission -> the reasons it is held. Missing means not held.
  const reasons = React.useMemo(() => {
    const out = new Map<Perm, Reason[]>();
    const add = (perm: Perm, reason: Reason) => out.set(perm, [...(out.get(perm) ?? []), reason]);
    for (const perm of data.basics) add(perm, null);
    for (const department of data.departments) {
      for (const held of department.permissions) add(held.permission, { department, held });
    }
    return out;
  }, [data]);

  const grouped = new Set<Perm>(Object.values(PERM_GROUPS).flat());
  const ungrouped = (catalogue.data ?? []).map((p) => p.key).filter((k) => !grouped.has(k));
  const isHeld = (perm: Perm) => data.is_super_admin || reasons.has(perm);
  const groups = (Object.entries(PERM_GROUPS) as [PermGroup, Perm[]][])
    .map(([group, keys]) => {
      const all = group === "system" ? [...keys, ...ungrouped] : keys;
      const held = all.filter(isHeld);
      return { group, total: all.length, held: held.length, rows: showMissing ? all : held };
    })
    .filter((g) => g.rows.length > 0);
  const sources = new Set(data.departments.flatMap((d) => d.permissions.flatMap((p) => p.sources)));

  return (
    <section className="bg-card border-border flex flex-col gap-6 rounded-xl border p-4 sm:p-5">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="font-display text-lg font-semibold tracking-tight">{t("listTitle")}</h2>
            <p className="text-muted-foreground max-w-prose text-[13px]">{t("listHint")}</p>
          </div>
          {!data.is_super_admin ? (
            <label className="text-muted-foreground flex shrink-0 cursor-pointer items-center gap-2 text-sm">
              <Switch checked={showMissing} onCheckedChange={setShowMissing} />
              {t("showMissing")}
            </label>
          ) : null}
        </div>
        {!data.is_super_admin && reasons.size > 0 ? (
          <ul className="text-muted-foreground flex flex-wrap gap-x-4 gap-y-1.5 text-xs" aria-label={t("legend")}>
            {(["staff", "shared", "department", "team", "grant"] as const)
              .filter((s) => s === "staff" ? data.basics.length > 0 : sources.has(s))
              .map((s) => {
                const Icon = SOURCE_ICONS[s];
                return (
                  <li key={s} className="flex items-center gap-1.5">
                    <Icon className="text-foreground/70 h-3.5 w-3.5" />
                    {t(`legendItems.${s}`)}
                  </li>
                );
              })}
          </ul>
        ) : null}
      </div>

      {groups.length === 0 ? (
        <div className="text-muted-foreground flex flex-col items-center gap-2 py-6 text-center text-sm">
          <Ban className="h-5 w-5" />
          {t("nothing")}
        </div>
      ) : (
        groups.map(({ group, rows, held, total }) => (
          <div key={group} className="flex flex-col gap-2.5">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-sm font-semibold">{t(`groups.${group}`)}</h3>
              <span className="text-muted-foreground tabular text-xs">{t("groupCount", { held, total })}</span>
            </div>
            <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((perm) => (
                <PermissionTile
                  key={perm}
                  label={label(perm)}
                  held={isHeld(perm)}
                  reasons={reasons.get(perm) ?? []}
                  superAdmin={data.is_super_admin}
                />
              ))}
            </ul>
          </div>
        ))
      )}
    </section>
  );
}

function PermissionTile({
  label,
  held,
  reasons,
  superAdmin,
}: {
  label: string;
  held: boolean;
  reasons: Reason[];
  superAdmin: boolean;
}) {
  const t = useTranslations("permissions.member");

  return (
    <li
      className={cn(
        "flex flex-col gap-2 rounded-lg border px-3 py-2.5",
        held ? "border-border bg-background/40" : "border-border/70 border-dashed",
      )}
    >
      <span className={cn("text-sm font-medium", !held && "text-muted-foreground")}>{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {!held ? (
          <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
            <Minus className="h-3.5 w-3.5" />
            {t("notHeld")}
          </span>
        ) : superAdmin ? (
          <span className="bg-brand-blue-soft text-brand-blue-ink inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium">
            <Crown className="h-3.5 w-3.5" />
            {t("why.superAdmin")}
          </span>
        ) : (
          reasons.map((reason, i) => <ReasonChips key={i} reason={reason} />)
        )}
      </div>
    </li>
  );
}

function ReasonChips({ reason }: { reason: Reason }) {
  const t = useTranslations("permissions.member");
  const locale = useLocale();
  const format = useFormatter();

  if (!reason) {
    return (
      <span className="bg-muted text-muted-foreground inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs">
        <BadgeCheck className="h-3.5 w-3.5" />
        {t("why.staff")}
      </span>
    );
  }

  const { department, held } = reason;
  const name = locale === "ar" ? department.ar_name : department.name;
  return (
    <>
      {held.sources.map((source) => {
        const Icon = SOURCE_ICONS[source];
        const granter = source === "grant" ? held.granted_by : null;
        const date = held.granted_at ? format.dateTime(new Date(held.granted_at), { dateStyle: "medium" }) : "";
        // The granter's name and the date are wrapped in <bdi> so a Latin name stays readable in Arabic.
        const why = granter
          ? t.rich("why.grantBy", { name: granter.name, date, bdi: (chunks) => <bdi>{chunks}</bdi> })
          : t(`why.${source}`);
        return (
          <span
            key={source}
            title={granter ? `${granter.name} · ${date}` : undefined}
            className="inline-flex max-w-full items-center gap-1 rounded-md border px-2 py-0.5 text-xs"
            style={{ borderColor: `${department.color}50`, backgroundColor: `${department.color}14` }}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: department.color }} />
            <span className="truncate">
              <span className="font-medium">{name}</span> <span className="text-muted-foreground">· {why}</span>
            </span>
          </span>
        );
      })}
    </>
  );
}
