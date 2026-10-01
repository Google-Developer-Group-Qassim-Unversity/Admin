"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { Lock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { useAssignments, usePermissionCatalogue, useSetDepartment, useSetShared } from "@/hooks/use-permissions";
import { DEPARTMENT_SCOPED, PERM_GROUPS, STAFF_BASICS, type Perm, type PermGroup } from "@/lib/access";
import type { CataloguePermission } from "@/lib/permissions-types";
import { cn } from "@/lib/utils";

/** "all" edits the shared permissions; a number edits that department's extras. */
type Target = "all" | number;

/**
 * Super admins: what leaders and VPs can do. One list, viewed either for every
 * department (the shared permissions) or for one department, where the shared
 * ones show as already on and only the department's extras can be ticked.
 */
export function LeadersPanel() {
  const t = useTranslations("permissions.leaders");
  const locale = useLocale();
  const assignments = useAssignments(true);
  const catalogue = usePermissionCatalogue();
  const [target, setTarget] = React.useState<Target>("all");

  if (!assignments.data || !catalogue.data) return <Skeleton className="h-60 w-full" />;

  const shared = new Set(assignments.data.shared.filter((p) => !STAFF_BASICS.has(p)));
  const departments = assignments.data.departments;
  const extras = (permissions: Perm[]) => permissions.filter((p) => !shared.has(p) && !STAFF_BASICS.has(p));
  const department = target === "all" ? null : departments.find((d) => d.department_id === target);
  const name = (d: { name: string; ar_name: string }) => (locale === "ar" ? d.ar_name : d.name);

  return (
    <section className="bg-card border-border flex flex-col gap-5 rounded-xl border p-4 sm:p-5">
      <div className="flex flex-col gap-1">
        <h2 className="font-display text-lg font-semibold tracking-tight">{t("title")}</h2>
        <p className="text-muted-foreground text-[13px]">{t("hint")}</p>
      </div>

      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("pickTarget")}>
        <TargetChip active={target === "all"} onClick={() => setTarget("all")} count={shared.size}>
          {t("everyDepartment")}
        </TargetChip>
        {departments.map((d) => (
          <TargetChip
            key={d.department_id}
            active={target === d.department_id}
            onClick={() => setTarget(d.department_id)}
            count={extras(d.permissions).length}
            plus
          >
            {name(d)}
          </TargetChip>
        ))}
      </div>

      <p className="bg-muted/60 rounded-lg px-3 py-2.5 text-sm">
        {department
          ? t("departmentSummary", {
              department: name(department),
              shared: shared.size,
              extra: extras(department.permissions).length,
            })
          : t("sharedSummary", { count: shared.size })}
      </p>

      <PermissionChecklist
        key={`${target}-${department ? extras(department.permissions).join(",") : [...shared].join(",")}`}
        catalogue={catalogue.data}
        initial={department ? extras(department.permissions) : [...shared]}
        inherited={department ? shared : new Set()}
        departmentId={department?.department_id ?? null}
        departmentName={department ? name(department) : null}
      />
    </section>
  );
}

function TargetChip({
  active,
  onClick,
  count,
  plus = false,
  children,
}: {
  active: boolean;
  onClick: () => void;
  count: number;
  plus?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "border-border hover:bg-muted text-foreground",
      )}
    >
      {children}
      <span
        className={cn(
          "rounded-full px-1.5 text-xs tabular-nums",
          active ? "bg-primary-foreground/20" : "bg-muted text-muted-foreground",
        )}
      >
        {plus ? `+${count}` : count}
      </span>
    </button>
  );
}

function PermissionChecklist({
  catalogue,
  initial,
  inherited,
  departmentId,
  departmentName,
}: {
  catalogue: CataloguePermission[];
  /** What this view holds itself: the shared set, or the department's extras. */
  initial: Perm[];
  /** On already, from the shared set; shown ticked and locked in a department's view. */
  inherited: ReadonlySet<Perm>;
  departmentId: number | null;
  departmentName: string | null;
}) {
  const t = useTranslations("permissions.leaders");
  const locale = useLocale();
  const setShared = useSetShared();
  const setDepartment = useSetDepartment();
  const [chosen, setChosen] = React.useState<Set<Perm>>(new Set(initial));
  const dirty = chosen.size !== initial.length || initial.some((p) => !chosen.has(p));
  const pending = setShared.isPending || setDepartment.isPending;

  const byKey = new Map(catalogue.map((p) => [p.key, p]));
  const grouped = new Set<Perm>(Object.values(PERM_GROUPS).flat());
  const groups = (Object.entries(PERM_GROUPS) as [PermGroup, Perm[]][]).map(([group, keys]) => {
    const extra = group === "system" ? catalogue.filter((p) => !grouped.has(p.key)).map((p) => p.key) : [];
    return { group, rows: [...keys, ...extra].flatMap((k) => byKey.get(k) ?? []) };
  });

  const onSave = async () => {
    const perms = [...chosen];
    try {
      if (departmentId === null) await setShared.mutateAsync(perms);
      else await setDepartment.mutateAsync({ departmentId, perms });
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
    <div className="flex flex-col gap-5">
      {groups.map(({ group, rows }) =>
        rows.length === 0 ? null : (
          <fieldset key={group} className="flex flex-col gap-2">
            <legend className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
              {t(`groups.${group}`)}
            </legend>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {rows.map((p) => {
                const locked = STAFF_BASICS.has(p.key) ? "staff" : inherited.has(p.key) ? "shared" : null;
                return (
                  <label
                    key={p.key}
                    className={cn(
                      "border-border flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm",
                      locked ? "bg-muted/40" : "hover:bg-muted/30 cursor-pointer",
                    )}
                  >
                    <Checkbox
                      className="mt-0.5"
                      checked={locked !== null || chosen.has(p.key)}
                      disabled={locked !== null}
                      onCheckedChange={(v) => toggle(p.key, v === true)}
                    />
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className={cn("font-medium", locked && "text-muted-foreground")}>
                        {locale === "ar" ? p.ar_label : p.label}
                      </span>
                      {locked ? (
                        <span className="text-muted-foreground flex items-center gap-1 text-xs">
                          <Lock className="h-3 w-3" />
                          {t(locked === "staff" ? "lockedStaff" : "lockedShared")}
                        </span>
                      ) : DEPARTMENT_SCOPED.has(p.key) ? (
                        <span className="text-muted-foreground text-xs">
                          {departmentName ? t("ownDepartmentNamed", { department: departmentName }) : t("ownDepartment")}
                        </span>
                      ) : null}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ),
      )}
      <div className="bg-card border-border sticky bottom-0 -mx-4 flex items-center gap-3 border-t px-4 py-3 sm:-mx-5 sm:px-5">
        <Button onClick={onSave} disabled={!dirty || pending}>
          {departmentName ? t("saveDepartment", { department: departmentName }) : t("saveShared")}
        </Button>
        {dirty ? (
          <Button variant="ghost" onClick={() => setChosen(new Set(initial))} disabled={pending}>
            {t("discard")}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
