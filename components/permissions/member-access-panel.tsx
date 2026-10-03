"use client";

import * as React from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { Ban, Crown, Search, ShieldCheck, UserRound } from "lucide-react";

import { ClubMemberPicker } from "@/components/club-structure/member-picker";
import { MemberDetailsTrigger, memberInitials } from "@/components/member-details";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useMemberAccess, usePermissionCatalogue, usePermissionLabel } from "@/hooks/use-permissions";
import { PERM_GROUPS, type Perm, type PermGroup } from "@/lib/access";
import type { HeldPermission, MemberAccess, MemberDepartmentAccess } from "@/lib/permissions-types";
import { cn } from "@/lib/utils";

/** One reason a permission is held: where, and why. */
type Reason = { department: MemberDepartmentAccess | null; held: HeldPermission | null };

/**
 * Super admins: pick a member and see everything they can do in the admin app,
 * and why - which department, which role, granted by whom.
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
      <section className="bg-card border-border rounded-xl border">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <UserRound />
            </EmptyMedia>
            <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
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
        <Skeleton className="h-40 w-full" />
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
  const locale = useLocale();
  const total = usePermissionCatalogue().data?.length ?? data.permissions.length;
  const status = data.is_super_admin ? "superAdmin" : data.is_staff ? "staff" : "regular";
  const StatusIcon = { superAdmin: Crown, staff: ShieldCheck, regular: Ban }[status];

  return (
    <section className="bg-card border-border flex flex-col gap-4 rounded-xl border p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="bg-muted flex size-12 shrink-0 items-center justify-center rounded-full border text-sm font-semibold"
        >
          {memberInitials(data.member.name)}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <MemberDetailsTrigger
            member={{ id: data.member.member_id, name: data.member.name }}
            className="font-display text-lg font-semibold tracking-tight wrap-anywhere"
          />
          <p className="text-muted-foreground text-[13px]">
            {data.is_super_admin
              ? t("countAll")
              : t("count", { held: data.permissions.length, total })}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={onChange} className="shrink-0">
          <Search />
          <span className="max-sm:sr-only">{t("change")}</span>
        </Button>
      </div>

      <div
        className={cn(
          "flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-sm",
          status === "regular" ? "bg-destructive/10 text-destructive" : "bg-muted/60",
        )}
      >
        <StatusIcon className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          {status === "staff" && data.semester
            ? t("status.staff", { semester: data.semester.name })
            : t(`status.${status}`)}
        </span>
      </div>

      {data.departments.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">{t("rolesTitle")}</h3>
          <div className="flex flex-wrap gap-2">
            {data.departments.map((d) => (
              <span key={d.department_id} className="border-border flex h-8 items-center gap-1.5 rounded-full border px-3 text-sm">
                <span className="font-medium">{locale === "ar" ? d.ar_name : d.name}</span>
                <span className="text-muted-foreground">·</span>
                <span className="text-muted-foreground">{roleNames(d.roles, t)}</span>
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

/** "Leader, VP" - the officer roles when there are any, else "Member". */
function roleNames(roles: string[], t: ReturnType<typeof useTranslations<"permissions.member">>) {
  const officer = roles.filter((r) => r === "leader" || r === "vp");
  const shown = officer.length > 0 ? officer : roles;
  return shown.map((r) => (r === "leader" || r === "vp" || r === "member" ? t(`roles.${r}`) : r)).join(", ");
}

function PermissionList({ data }: { data: MemberAccess }) {
  const t = useTranslations("permissions.member");
  const label = usePermissionLabel();
  const catalogue = usePermissionCatalogue();
  const [showMissing, setShowMissing] = React.useState(false);

  // Every permission -> the reasons it is held. Empty means not held.
  const reasons = React.useMemo(() => {
    const out = new Map<Perm, Reason[]>();
    const add = (perm: Perm, reason: Reason) => out.set(perm, [...(out.get(perm) ?? []), reason]);
    if (data.is_super_admin) {
      for (const perm of Object.values(PERM_GROUPS).flat()) add(perm, { department: null, held: null });
      return out;
    }
    for (const perm of data.basics) add(perm, { department: null, held: null });
    for (const department of data.departments) {
      for (const held of department.permissions) add(held.permission, { department, held });
    }
    return out;
  }, [data]);

  const grouped = new Set<Perm>(Object.values(PERM_GROUPS).flat());
  const ungrouped = (catalogue.data ?? []).map((p) => p.key).filter((k) => !grouped.has(k));
  const groups = (Object.entries(PERM_GROUPS) as [PermGroup, Perm[]][])
    .map(([group, keys]) => {
      const all = group === "system" ? [...keys, ...ungrouped] : keys;
      return { group, rows: showMissing ? all : all.filter((k) => reasons.has(k)) };
    })
    .filter((g) => g.rows.length > 0);

  return (
    <section className="bg-card border-border flex flex-col gap-5 rounded-xl border p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-lg font-semibold tracking-tight">{t("listTitle")}</h2>
          <p className="text-muted-foreground text-[13px]">{t("listHint")}</p>
        </div>
        {!data.is_super_admin ? (
          <label className="text-muted-foreground flex shrink-0 items-center gap-2 text-sm">
            <Switch checked={showMissing} onCheckedChange={setShowMissing} />
            {t("showMissing")}
          </label>
        ) : null}
      </div>

      {groups.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("nothing")}</p>
      ) : (
        groups.map(({ group, rows }) => (
          <div key={group} className="flex flex-col gap-2">
            <h3 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
              {t(`groups.${group}`)}
            </h3>
            <ul className="divide-border border-border divide-y rounded-lg border">
              {rows.map((perm) => (
                <PermissionRow
                  key={perm}
                  label={label(perm)}
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

function PermissionRow({
  label,
  reasons,
  superAdmin,
}: {
  label: string;
  reasons: Reason[];
  superAdmin: boolean;
}) {
  const t = useTranslations("permissions.member");
  const held = reasons.length > 0;

  return (
    <li className="flex flex-col gap-1.5 px-3 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <span className={cn("text-sm font-medium", !held && "text-muted-foreground line-through decoration-1")}>
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5 sm:max-w-[60%] sm:justify-end">
        {!held ? (
          <span className="text-muted-foreground text-xs">{t("notHeld")}</span>
        ) : superAdmin ? (
          <ReasonChip>{t("why.superAdmin")}</ReasonChip>
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
  const { department, held } = reason;
  if (!department || !held) return <ReasonChip>{t("why.staff")}</ReasonChip>;

  const name = locale === "ar" ? department.ar_name : department.name;
  return (
    <>
      {held.sources.map((source) => {
        const granter = source === "grant" ? held.granted_by : null;
        const date = held.granted_at ? format.dateTime(new Date(held.granted_at), { dateStyle: "medium" }) : "";
        // The granter's name and the date are wrapped in <bdi> so a Latin name stays readable in Arabic.
        const why = granter
          ? t.rich("why.grantBy", { name: granter.name, date, bdi: (chunks) => <bdi>{chunks}</bdi> })
          : t(`why.${source}`);
        return (
          <ReasonChip key={source} title={granter ? `${granter.name} · ${date}` : undefined}>
            <span className="font-medium">{name}</span> <span className="text-muted-foreground">· {why}</span>
          </ReasonChip>
        );
      })}
    </>
  );
}

function ReasonChip({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className="bg-muted/60 border-border max-w-full truncate rounded-full border px-2.5 py-0.5 text-xs"
    >
      {children}
    </span>
  );
}
