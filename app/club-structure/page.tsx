"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Network, Plus, Search } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { AccessDenied } from "@/components/ui/access-denied";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateDepartmentDialog } from "@/components/club-structure/create-department-dialog";
import { DepartmentCard } from "@/components/club-structure/department-card";
import { DepartmentDrawer } from "@/components/club-structure/department-drawer";
import { SeatCard } from "@/components/club-structure/seat-card";
import { QueryError } from "@/components/club-structure/shared";
import { useClubOverview } from "@/hooks/use-club-structure";
import { useUserRole } from "@/hooks/use-rbac";

export default function ClubStructurePage() {
  const t = useTranslations("clubStructure");
  const { isLoaded } = useUser();
  const role = useUserRole();
  const canEdit = role === "super_admin";
  const [filter, setFilter] = useState<"active" | "archived">("active");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  // Active membership is the headline count. The inclusive overview supplies archive cards and counts.
  const overview = useClubOverview();
  const allDepartments = useClubOverview(true);

  if (!isLoaded) return <Skeleton className="h-72" />;
  if (role === "none") return <AccessDenied />;
  const departments = allDepartments.data?.departments ?? [];
  const activeCount = departments.filter((department) => department.active).length;
  const archivedCount = departments.length - activeCount;
  const visible = departments.filter(
    (department) =>
      department.active === (filter === "active") &&
      `${department.name} ${department.ar_name}`.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );
  const error = overview.error ?? allDepartments.error;
  const loading = overview.isPending || allDepartments.isPending;

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        {canEdit && (
          <Button className="rounded-xl" onClick={() => setCreating(true)}>
            <Plus className="size-4" />
            {t("newDepartment")}
          </Button>
        )}
      </div>
      {!canEdit && <p className="text-sm text-muted-foreground">{t("readOnlyHint")}</p>}
      {error && (
        <QueryError
          error={error}
          retry={() => {
            void overview.refetch();
            void allDepartments.refetch();
          }}
        />
      )}
      {loading && !error && (
        <div role="status" aria-label={t("loading")} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((id) => (
            <Skeleton key={id} className="h-48" />
          ))}
        </div>
      )}
      {!loading && !error && overview.data && allDepartments.data && (
        <>
          <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: t("totalDepartments"), value: departments.length },
              { label: t("active"), value: activeCount },
              { label: t("archived"), value: archivedCount },
              { label: t("totalMembers"), value: overview.data.total_members },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border bg-card px-4 py-3.5">
                <dt className="text-xs font-medium text-muted-foreground">{stat.label}</dt>
                <dd className="mt-1 text-2xl font-bold">{stat.value}</dd>
              </div>
            ))}
          </dl>
          <section className="space-y-3" aria-labelledby="club-presidents">
            <div>
              <h2 id="club-presidents" className="text-base font-semibold">
                {t("presidents")}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">{t("presidentsHint")}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {overview.data.presidents.map((seat) => (
                <SeatCard
                  key={seat.slot}
                  seat={{ slot: seat.slot }}
                  assignment={seat.assignment}
                  canEdit={canEdit}
                  excludedIds={overview.data.presidents.flatMap((item) =>
                    item.assignment ? [item.assignment.member_id] : [],
                  )}
                />
              ))}
            </div>
          </section>
          <section className="space-y-5" aria-label={t("departments")}>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex gap-1 rounded-xl border bg-card p-1" role="group" aria-label={t("departmentStatus")}>
                {(["active", "archived"] as const).map((value) => (
                  <Button
                    key={value}
                    size="sm"
                    variant={filter === value ? "default" : "ghost"}
                    className="rounded-lg"
                    aria-pressed={filter === value}
                    onClick={() => setFilter(value)}
                  >
                    {t(value)} ({value === "active" ? activeCount : archivedCount})
                  </Button>
                ))}
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="absolute start-3 top-2.5 size-4 text-muted-foreground" aria-hidden="true" />
                <Input
                  className="rounded-xl ps-9"
                  aria-label={t("searchDepartments")}
                  placeholder={t("searchDepartments")}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>
            {visible.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {visible.map((department) => (
                  <DepartmentCard
                    key={department.id}
                    department={department}
                    canEdit={canEdit}
                    onOpen={() => setSelectedId(department.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-16 text-center">
                <Network className="mb-4 size-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  {t(
                    search.trim()
                      ? "noDepartmentsFound"
                      : filter === "active"
                        ? "noActiveDepartments"
                        : "noArchivedDepartments",
                  )}
                </p>
                {canEdit && filter === "active" && !search.trim() && (
                  <Button className="mt-4" onClick={() => setCreating(true)}>
                    {t("createFirstDepartment")}
                  </Button>
                )}
              </div>
            )}
          </section>
        </>
      )}
      {selectedId !== null && (
        <DepartmentDrawer key={selectedId} id={selectedId} canEdit={canEdit} onClose={() => setSelectedId(null)} />
      )}
      {creating && canEdit && (
        <CreateDepartmentDialog
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            setFilter("active");
            setSearch("");
            setSelectedId(id);
          }}
        />
      )}
    </div>
  );
}
