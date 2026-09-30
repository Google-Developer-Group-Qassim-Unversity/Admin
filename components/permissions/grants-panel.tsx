"use client";

import * as React from "react";
import { useFormatter, useLocale, useTranslations } from "next-intl";
import { History, UserMinus, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useAccess } from "@/hooks/use-access";
import { useAssignments, useDepartmentGrants, useGrant, usePermissionLabel, useRevoke } from "@/hooks/use-permissions";
import type { Perm } from "@/lib/access";
import type { GrantEntry } from "@/lib/permissions-types";

type DepartmentOption = { id: number; name: string; ar_name: string };

/** Leaders and VPs (and super admins) give their department's members extra permissions for this semester. */
export function GrantsPanel() {
  const t = useTranslations("permissions.grants");
  const locale = useLocale();
  const { access, isSuperAdmin } = useAccess();
  const assignments = useAssignments(isSuperAdmin);

  const departments: DepartmentOption[] = React.useMemo(() => {
    if (isSuperAdmin) {
      return (assignments.data?.departments ?? []).map((d) => ({ id: d.department_id, name: d.name, ar_name: d.ar_name }));
    }
    return (access?.departments ?? []).filter((d) => d.permissions.includes("permissions.grant"));
  }, [isSuperAdmin, assignments.data, access]);

  const [departmentId, setDepartmentId] = React.useState<number | null>(null);
  const selected = departmentId ?? departments[0]?.id ?? null;
  const [history, setHistory] = React.useState(false);

  if (departments.length === 0) {
    return <p className="text-muted-foreground text-sm">{t("noDepartments")}</p>;
  }

  return (
    <section className="bg-card border-border flex flex-col gap-4 rounded-xl border p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-lg font-semibold tracking-tight">{t("title")}</h2>
          <p className="text-muted-foreground text-[13px]">{t("hint")}</p>
        </div>
        {departments.length > 1 ? (
          <Select value={selected ? String(selected) : ""} onValueChange={(v) => setDepartmentId(Number(v))}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue placeholder={t("pickDepartment")} />
            </SelectTrigger>
            <SelectContent>
              {departments.map((d) => (
                <SelectItem key={d.id} value={String(d.id)}>
                  {locale === "ar" ? d.ar_name : d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>
      {selected !== null ? <DepartmentGrantsView departmentId={selected} history={history} /> : null}
      <label className="text-muted-foreground flex items-center gap-2 text-sm">
        <Switch checked={history} onCheckedChange={setHistory} />
        <History className="h-4 w-4" />
        {t("showHistory")}
      </label>
    </section>
  );
}

function DepartmentGrantsView({ departmentId, history }: { departmentId: number; history: boolean }) {
  const t = useTranslations("permissions.grants");
  const label = usePermissionLabel();
  const { data, isPending } = useDepartmentGrants(departmentId, history);
  const grant = useGrant();
  const revoke = useRevoke();
  const [memberId, setMemberId] = React.useState("");
  const [perm, setPerm] = React.useState("");

  if (isPending || !data) return <Skeleton className="h-40 w-full" />;

  const onGrant = async () => {
    try {
      await grant.mutateAsync({ departmentId, memberId: Number(memberId), perm: perm as Perm });
      toast.success(t("granted"));
      setPerm("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("failed"));
    }
  };

  const onRevoke = async (row: GrantEntry) => {
    try {
      await revoke.mutateAsync({ departmentId, grantId: row.id });
      toast.success(t("revoked"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("failed"));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {data.members.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("noMembers")}</p>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={memberId} onValueChange={setMemberId}>
            <SelectTrigger className="w-full sm:flex-1">
              <SelectValue placeholder={t("pickMember")} />
            </SelectTrigger>
            <SelectContent>
              {data.members.map((m) => (
                <SelectItem key={m.member_id} value={String(m.member_id)}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={perm} onValueChange={setPerm}>
            <SelectTrigger className="w-full sm:flex-1">
              <SelectValue placeholder={t("pickPermission")} />
            </SelectTrigger>
            <SelectContent>
              {data.grantable.map((p) => (
                <SelectItem key={p} value={p}>
                  {label(p)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={onGrant} disabled={!memberId || !perm || grant.isPending}>
            <UserPlus className="h-4 w-4" />
            {t("grant")}
          </Button>
        </div>
      )}

      {data.grants.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("noGrants")}</p>
      ) : (
        <ul className="divide-border border-border divide-y rounded-lg border">
          {data.grants.map((row) => (
            <GrantRow key={row.id} row={row} onRevoke={() => onRevoke(row)} pending={revoke.isPending} />
          ))}
        </ul>
      )}
    </div>
  );
}

function GrantRow({ row, onRevoke, pending }: { row: GrantEntry; onRevoke: () => void; pending: boolean }) {
  const t = useTranslations("permissions.grants");
  const label = usePermissionLabel();
  const format = useFormatter();
  const when = (iso: string) => format.dateTime(new Date(iso), { dateStyle: "medium" });
  const revoked = row.revoked_at !== null;

  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2.5">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className={`truncate text-sm font-medium ${revoked ? "text-muted-foreground line-through" : ""}`}>
          {row.member.name} · {label(row.permission)}
        </span>
        <span className="text-muted-foreground text-xs">
          {t("grantedBy", { name: row.granted_by.name, date: when(row.granted_at) })}
          {revoked && row.revoked_by
            ? ` · ${t("revokedBy", { name: row.revoked_by.name, date: when(row.revoked_at as string) })}`
            : null}
        </span>
      </div>
      {!revoked ? (
        <Button size="sm" variant="ghost" onClick={onRevoke} disabled={pending}>
          <UserMinus className="h-4 w-4" />
          {t("revoke")}
        </Button>
      ) : null}
    </li>
  );
}
