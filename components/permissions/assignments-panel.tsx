"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAssignments, usePermissionCatalogue, useSetDepartment, useSetShared } from "@/hooks/use-permissions";
import type { Perm } from "@/lib/access";
import type { CataloguePermission } from "@/lib/permissions-types";

/** Super admins: what every leader and VP gets (shared), and what each department's leaders and VPs get. */
export function AssignmentsPanel({ kind }: { kind: "shared" | "departments" }) {
  const t = useTranslations("permissions.assignments");
  const locale = useLocale();
  const assignments = useAssignments(true);
  const catalogue = usePermissionCatalogue();
  const [departmentId, setDepartmentId] = React.useState<number | null>(null);

  if (!assignments.data || !catalogue.data) return <Skeleton className="h-60 w-full" />;

  const departments = assignments.data.departments;
  const selected = departmentId ?? departments[0]?.department_id ?? null;
  const current =
    kind === "shared"
      ? assignments.data.shared
      : (departments.find((d) => d.department_id === selected)?.permissions ?? []);

  return (
    <section className="bg-card border-border flex flex-col gap-4 rounded-xl border p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-lg font-semibold tracking-tight">{t(`${kind}.title`)}</h2>
          <p className="text-muted-foreground text-[13px]">{t(`${kind}.hint`)}</p>
        </div>
        {kind === "departments" ? (
          <Select value={selected ? String(selected) : ""} onValueChange={(v) => setDepartmentId(Number(v))}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {departments.map((d) => (
                <SelectItem key={d.department_id} value={String(d.department_id)}>
                  {locale === "ar" ? d.ar_name : d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>
      <PermissionChecklist
        key={`${kind}-${selected}-${current.join(",")}`}
        catalogue={catalogue.data}
        initial={current}
        kind={kind}
        departmentId={selected}
      />
    </section>
  );
}

function PermissionChecklist({
  catalogue,
  initial,
  kind,
  departmentId,
}: {
  catalogue: CataloguePermission[];
  initial: Perm[];
  kind: "shared" | "departments";
  departmentId: number | null;
}) {
  const t = useTranslations("permissions.assignments");
  const locale = useLocale();
  const setShared = useSetShared();
  const setDepartment = useSetDepartment();
  const [chosen, setChosen] = React.useState<Set<Perm>>(new Set(initial));
  const dirty = chosen.size !== initial.length || initial.some((p) => !chosen.has(p));
  const pending = setShared.isPending || setDepartment.isPending;

  const onSave = async () => {
    const perms = [...chosen];
    try {
      if (kind === "shared") await setShared.mutateAsync(perms);
      else if (departmentId !== null) await setDepartment.mutateAsync({ departmentId, perms });
      toast.success(t("saved"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("failed"));
    }
  };

  const toggle = (key: Perm, on: boolean) =>
    setChosen((current) => {
      const next = new Set(current);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {catalogue.map((p) => (
          <label key={p.key} className="border-border flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm">
            <Checkbox className="mt-0.5" checked={chosen.has(p.key)} onCheckedChange={(v) => toggle(p.key, v === true)} />
            <span className="flex min-w-0 flex-col">
              <span className="font-medium">{locale === "ar" ? p.ar_label : p.label}</span>
              <span className="text-muted-foreground text-xs" dir="ltr">
                {p.key} · {t(p.scope === "dept" ? "scopeDepartment" : "scopeClub")}
              </span>
            </span>
          </label>
        ))}
      </div>
      <div>
        <Button onClick={onSave} disabled={!dirty || pending}>
          {t("save")}
        </Button>
      </div>
    </div>
  );
}
